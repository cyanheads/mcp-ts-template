/**
 * @fileoverview Format-parity lint rule. Verifies that every field in a tool's
 * `output` schema is actually rendered by its `format()` function.
 *
 * Different MCP clients forward different surfaces to the model: some (e.g.,
 * Claude Code) read `structuredContent` from `output`, others (e.g., Claude
 * Desktop) read `content[]` from `format()`. For every client to see the same
 * picture, both surfaces must be content-complete — `format()` is the
 * markdown-rendered twin of `structuredContent`, not a separate payload.
 * A field that exists in `output` but is never rendered by `format()` is
 * invisible to `content[]`-only clients, silently diverging the two surfaces.
 *
 * Approach: sentinel injection.
 *   1. Walk the output schema, build a synthetic value where every leaf is a
 *      uniquely identifiable sentinel (distinctive string, large number, or
 *      boolean/enum/literal with key-name fallback).
 *   2. Invoke `def.format(synthetic)` once and concatenate `content[].text`.
 *   3. For each leaf path, verify either the sentinel value or the field's key
 *      name appears in the rendered text.
 *   4. Emit one error per missing path.
 *
 * Deterministic, dependency-free. Runs inside `validateDefinitions()` alongside
 * every other lint rule — picked up automatically by `bun run lint:mcp`,
 * `bun run devcheck`, and `createApp()` startup validation.
 *
 * @module src/linter/rules/format-parity-rules
 */

import type { LintDiagnostic } from '../types.js';

/** A single terminal leaf in the output schema and how to verify it's rendered. */
interface SentinelLeaf {
  /** Trailing key segment (no array notation) for fallback key-name matching. */
  keyName: string;
  /**
   * 'strict'     — sentinel is distinctive (string/number); pass iff it appears.
   * 'permissive' — sentinel may collide (boolean/enum/literal); also accept
   *                the key name as whole word (case insensitive) or a camelCase
   *                segment of length >= 3.
   */
  matchStrategy: 'strict' | 'permissive';
  /** Human-readable path like `articles[].journalInfo.issn` for error messages. */
  path: string;
  /** Injected sentinel value. */
  sentinel: unknown;
}

interface WalkState {
  depth: number;
  leaves: SentinelLeaf[];
  numberIndex: number;
}

/** Zod 4 stores the type discriminator at `_zod.def.type`. Falls back to `_def.type`. */
function zodTypeOf(schema: unknown): string {
  if (!schema || typeof schema !== 'object') return '';
  const s = schema as { _zod?: { def?: { type?: string } }; _def?: { type?: string } };
  return s._zod?.def?.type ?? s._def?.type ?? '';
}

/**
 * Strips Optional/Nullable/Default wrappers so we can always populate the field.
 * Parity cares about "does format render this when present", so wrappers are transparent.
 */
function unwrapSchema(schema: unknown): unknown {
  let current = schema;
  for (let i = 0; i < 10; i++) {
    const type = zodTypeOf(current);
    if (type !== 'optional' && type !== 'nullable' && type !== 'default') return current;
    const c = current as {
      _zod?: { def?: { innerType?: unknown } };
      _def?: { innerType?: unknown };
    };
    const inner = c._zod?.def?.innerType ?? c._def?.innerType;
    if (!inner) return current;
    current = inner;
  }
  return current;
}

function stringSentinel(path: string): string {
  return `__MCP_PARITY_${path.replace(/[.[\]]/g, '_')}__`;
}

/** Builds a synthetic value and collects every leaf path simultaneously. */
function walk(schema: unknown, path: string, keyName: string, state: WalkState): unknown {
  if (state.depth > 8) return null;
  state.depth++;
  try {
    const node = unwrapSchema(schema);
    const type = zodTypeOf(node);
    const n = node as Record<string, unknown>;

    switch (type) {
      case 'string': {
        const sentinel = stringSentinel(path || keyName || 'root');
        state.leaves.push({ path, keyName, sentinel, matchStrategy: 'strict' });
        return sentinel;
      }
      case 'number':
      case 'int':
      case 'bigint': {
        const sentinel = 900_000_001 + state.numberIndex++;
        state.leaves.push({ path, keyName, sentinel, matchStrategy: 'strict' });
        return sentinel;
      }
      case 'boolean': {
        state.leaves.push({ path, keyName, sentinel: true, matchStrategy: 'permissive' });
        return true;
      }
      case 'enum': {
        // Zod 4 exposes options as array on the schema itself.
        const options = (n.options as unknown[] | undefined) ?? getDefOptions(n);
        const value = Array.isArray(options) && options.length > 0 ? options[0] : '';
        state.leaves.push({ path, keyName, sentinel: value, matchStrategy: 'permissive' });
        return value;
      }
      case 'literal': {
        const value = (n.value as unknown) ?? getDefValue(n);
        state.leaves.push({ path, keyName, sentinel: value, matchStrategy: 'permissive' });
        return value;
      }
      case 'array': {
        const element = (n.element as unknown) ?? getDefElement(n);
        return [walk(element, `${path}[]`, keyName, state)];
      }
      case 'object': {
        const shape = (n.shape as Record<string, unknown> | undefined) ?? {};
        const out: Record<string, unknown> = {};
        for (const [key, childSchema] of Object.entries(shape)) {
          const childPath = path ? `${path}.${key}` : key;
          out[key] = walk(childSchema, childPath, key, state);
        }
        return out;
      }
      case 'union':
      case 'discriminated_union': {
        const options = getDefOptions(n);
        if (Array.isArray(options) && options.length > 0) {
          return walk(options[0], path, keyName, state);
        }
        return null;
      }
      case 'record': {
        const valueSchema = getDefValueType(n);
        if (valueSchema) {
          return { parity_key: walk(valueSchema, `${path}.<key>`, keyName, state) };
        }
        return {};
      }
      case 'tuple': {
        const items = getDefItems(n);
        if (Array.isArray(items)) {
          return items.map((item, i) => walk(item, `${path}[${i}]`, keyName, state));
        }
        return [];
      }
      default: {
        // Unknown/unsupported type — emit leaf with permissive fallback so the
        // rule still asks "did format render this field's key somehow?"
        state.leaves.push({ path, keyName, sentinel: null, matchStrategy: 'permissive' });
        return null;
      }
    }
  } finally {
    state.depth--;
  }
}

function getDefOptions(node: Record<string, unknown>): unknown[] | undefined {
  const zod = node._zod as
    | { def?: { options?: unknown[]; entries?: Record<string, unknown> } }
    | undefined;
  const legacy = node._def as
    | { options?: unknown[]; values?: unknown[]; entries?: Record<string, unknown> }
    | undefined;
  if (Array.isArray(zod?.def?.options)) return zod.def.options;
  if (Array.isArray(legacy?.options)) return legacy.options;
  if (Array.isArray(legacy?.values)) return legacy.values;
  // Zod 4 enum stores values in `entries` as { label: value }
  const entries = zod?.def?.entries ?? legacy?.entries;
  if (entries && typeof entries === 'object') return Object.values(entries);
  return;
}

function getDefValue(node: Record<string, unknown>): unknown {
  const zod = node._zod as { def?: { value?: unknown; values?: unknown[] } } | undefined;
  const legacy = node._def as { value?: unknown; values?: unknown[] } | undefined;
  if (zod?.def?.value !== undefined) return zod.def.value;
  if (legacy?.value !== undefined) return legacy.value;
  if (Array.isArray(zod?.def?.values) && zod.def.values.length > 0) return zod.def.values[0];
  if (Array.isArray(legacy?.values) && legacy.values.length > 0) return legacy.values[0];
  return '';
}

function getDefElement(node: Record<string, unknown>): unknown {
  const zod = node._zod as { def?: { element?: unknown } } | undefined;
  const legacy = node._def as { element?: unknown; type?: unknown } | undefined;
  return zod?.def?.element ?? legacy?.element ?? legacy?.type;
}

function getDefValueType(node: Record<string, unknown>): unknown {
  const zod = node._zod as { def?: { valueType?: unknown } } | undefined;
  const legacy = node._def as { valueType?: unknown } | undefined;
  return (node.valueType as unknown) ?? zod?.def?.valueType ?? legacy?.valueType;
}

function getDefItems(node: Record<string, unknown>): unknown[] | undefined {
  const zod = node._zod as { def?: { items?: unknown[] } } | undefined;
  const legacy = node._def as { items?: unknown[] } | undefined;
  return zod?.def?.items ?? legacy?.items;
}

// ---------------------------------------------------------------------------
// Rendering + matching
// ---------------------------------------------------------------------------

/**
 * Collects every string/number/boolean value reachable inside `content[]` so
 * the sentinel check works for any ContentBlock variant — text, image, audio,
 * resource — not just text. Image/audio blocks render sentinels inside
 * `data`/`mimeType`; resource blocks inside `uri`/`text`/`blob`.
 */
function extractText(content: unknown): string {
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const block of content) collectPrimitives(block, parts);
  return parts.join('\n');
}

function collectPrimitives(value: unknown, out: string[]): void {
  if (value === null || value === undefined) return;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') {
    out.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectPrimitives(v, out);
    return;
  }
  if (t === 'object') {
    for (const v of Object.values(value as object)) collectPrimitives(v, out);
  }
}

/**
 * Common digit-group separators across locales, plus underscore (template-literal
 * style). Used both inside the `THOUSANDS_GROUP_PATTERN` character class and as
 * the post-match strip pattern that collapses separators within an identified
 * thousands-group run:
 *   - `,`          — en-US, hi-IN, others
 *   - `.`          — de-DE, tr-TR, pt-BR, nl-NL, id-ID, es-ES
 *   - `'` `’`      — de-CH (apostrophe or right single quote)
 *   - ` ` variants — fr-FR, sv-SE (space, no-break, narrow no-break, thin)
 *   - `٬`          — Arabic thousands separator (U+066C)
 *   - `_`          — not a locale separator, but some template literals use it
 */
const DIGIT_SEPARATOR_PATTERN = /[,._'    ’٬]/g;

/**
 * Matches a thousands-group run: 1-3 leading digits followed by one or more
 * groups of `(separator + exactly 3 digits)`. Context-aware — only collapses
 * separators flanked by the canonical digit-grouping shape, leaving decimal marks
 * and other non-grouping uses of `,` / `.` intact.
 *
 * Why context-aware: a global strip of `,` and `.` collapses both thousands
 * separators (`900,000,001`) and decimal marks (`90,000,000.1` from a lossy
 * `value / 10` transform) into the same digit run, falsely matching the sentinel.
 * Restricting collapse to the `\d{1,3}(SEP\d{3})+` shape preserves locale support
 * while rejecting digit-shift transforms — `90,000,000.1` collapses only the
 * leading group to `90000000.1`, which does not contain `900000001`.
 *
 * Compact (`1.5K`), scientific (`9e8`), and other lossy transforms still fail —
 * their digit sequences don't contain the sentinel's digits in order.
 *
 * Known weakness: non-standard thousands groupings — Indian lakh/crore
 * (`90,00,00,001` — groups of 2 after the initial 3) — don't fit the `\d{3}`
 * shape and won't be normalized. `hi-IN` `toLocaleString` output therefore fails
 * parity. Acceptable tradeoff: mainstream locales are preserved and lossy
 * transforms are correctly rejected.
 */
const THOUSANDS_GROUP_PATTERN = /\b\d{1,3}(?:[,._'    ’٬]\d{3})+\b/g;

function normalizeDigitGroups(text: string): string {
  return text.replace(THOUSANDS_GROUP_PATTERN, (match) =>
    match.replace(DIGIT_SEPARATOR_PATTERN, ''),
  );
}

function sentinelAppears(sentinel: unknown, text: string): boolean {
  if (sentinel === null || sentinel === undefined) return false;
  const asString = typeof sentinel === 'string' ? sentinel : String(sentinel);
  if (asString.length === 0) return false;
  if (text.includes(asString)) return true;
  // Numeric sentinels may be rendered with locale-aware digit-group separators —
  // collapse separators only inside well-formed thousands-group runs and retry.
  // Context-aware matching avoids false positives from decimal marks (e.g. a
  // `total / 10` lossy transform rendered as `90,000,000.1` would otherwise
  // collapse to `900000001` and falsely satisfy the sentinel match).
  if (typeof sentinel === 'number' || typeof sentinel === 'bigint') {
    return normalizeDigitGroups(text).includes(asString);
  }
  return false;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Case-insensitive whole-word match. Returns false for keys shorter than 3. */
function wholeWordMatch(word: string, text: string): boolean {
  if (word.length < 3) return false;
  return new RegExp(`\\b${escapeRegex(word)}\\b`, 'i').test(text);
}

/** Splits camelCase/snake_case into lowercase segments. */
function splitKey(key: string): string[] {
  return key
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .split(/[_-]/)
    .map((s) => s.toLowerCase())
    .filter(Boolean);
}

function keyNameAppears(keyName: string, text: string): boolean {
  if (!keyName) return false;
  if (wholeWordMatch(keyName, text)) return true;
  for (const segment of splitKey(keyName)) {
    if (wholeWordMatch(segment, text)) return true;
  }
  return false;
}

function leafIsRendered(leaf: SentinelLeaf, text: string): boolean {
  if (sentinelAppears(leaf.sentinel, text)) return true;
  if (leaf.matchStrategy === 'permissive') {
    return keyNameAppears(leaf.keyName, text);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Public rule
// ---------------------------------------------------------------------------

/**
 * Verifies that `def.format()` renders every field present in `def.output`.
 *
 * Preconditions (caller must check): `def.output` is a valid ZodObject and
 * `def.format` is a function. Skipped entirely otherwise — the default
 * JSON-stringify fallback renders everything by construction.
 */
export function lintFormatParity(def: unknown, displayName: string): LintDiagnostic[] {
  const d = def as Record<string, unknown>;
  const output = d.output;
  const format = d.format;

  if (zodTypeOf(output) !== 'object') return [];
  if (typeof format !== 'function') return [];

  // Build synthetic sample.
  const state: WalkState = { leaves: [], numberIndex: 0, depth: 0 };
  let synthetic: unknown;
  try {
    synthetic = walk(output, '', '', state);
  } catch (err) {
    return [
      {
        rule: 'format-parity-walk-failed',
        severity: 'warning',
        message:
          `Tool '${displayName}' output schema could not be walked to build a synthetic ` +
          `sample (${err instanceof Error ? err.message : String(err)}). ` +
          'Format parity could not be verified.',
        definitionType: 'tool',
        definitionName: displayName,
      },
    ];
  }

  if (state.leaves.length === 0) return [];

  // Run format().
  let rendered: string;
  try {
    const result = (format as (r: unknown) => unknown)(synthetic);
    rendered = extractText(result);
  } catch (err) {
    return [
      {
        rule: 'format-parity-threw',
        severity: 'warning',
        message:
          `Tool '${displayName}' format() threw on a synthetic sample ` +
          `(${err instanceof Error ? err.message : String(err)}). ` +
          'format() should be total — render any valid value of the output schema.',
        definitionType: 'tool',
        definitionName: displayName,
      },
    ];
  }

  // Verify each leaf.
  const diagnostics: LintDiagnostic[] = [];
  for (const leaf of state.leaves) {
    if (!leafIsRendered(leaf, rendered)) {
      const displayPath = leaf.path || leaf.keyName || '<root>';
      diagnostics.push({
        rule: 'format-parity',
        severity: 'error',
        message:
          `Tool '${displayName}' format() does not render output field '${displayPath}'.\n` +
          'Different MCP clients forward different surfaces to the model — both must be content-complete:\n' +
          '  • structuredContent (from `output`)   — forwarded by clients like Claude Code\n' +
          '  • content[] (from `format()`)         — forwarded by clients like Claude Desktop\n' +
          'format() is the markdown-rendered twin of structuredContent, not a separate payload. Parity failure means one set of clients sees less than another.\n' +
          'Primary fix: render the field in format(). For list/detail variants, use z.discriminatedUnion (the linter walks each branch separately).\n' +
          'Escape hatch: if the output schema was over-typed for a genuinely dynamic upstream API, relax it (z.object({}).passthrough()) rather than maintaining aspirational typing — passthrough still flows data to structuredContent without declaring each field.',
        definitionType: 'tool',
        definitionName: displayName,
      });
    }
  }
  return diagnostics;
}
