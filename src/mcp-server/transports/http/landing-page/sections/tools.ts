/**
 * @fileoverview Tools section — responsive card grid grouped by safety
 * mutability (read / write / destructive). Each card carries annotation
 * pills, a scope chip, a JSON-RPC invocation snippet, and a collapsible
 * input-schema preview. A filter bar above the grid wires chip + search
 * filtering through `data-mutability` / `data-name` attributes consumed
 * by the inline filter script.
 *
 * @module src/mcp-server/transports/http/landing-page/sections/tools
 */

import type { ManifestTool } from '@/core/serverManifest.js';
import { html, type SafeHtml } from '@/utils/formatting/html.js';

import { renderPill, renderSectionHeading, renderSnippet } from '../primitives.js';

type Mutability = 'read' | 'write' | 'destructive';

/**
 * Mutability bucket order — safe defaults first, deliberate engagement last.
 * Filter chips render in this order too.
 */
const MUTABILITY_ORDER: readonly Mutability[] = ['read', 'write', 'destructive'];

export function renderToolsSection(tools: ManifestTool[]): SafeHtml {
  if (tools.length === 0) return html``;

  const buckets = bucketByMutability(tools);
  const populatedBuckets = MUTABILITY_ORDER.filter((m) => buckets[m].length > 0);
  // A single bucket is redundant with the section header — skip per-group
  // labels in that case but keep `data-mutability` on cards so the filter
  // chips still work.
  const showHeadings = populatedBuckets.length > 1;

  const groups = populatedBuckets.map((mutability) => {
    const bucketTools = buckets[mutability];
    const heading = showHeadings
      ? html`<h4 class="group-heading" data-group="${mutability}">${mutability} <span class="group-count">${String(bucketTools.length)}</span></h4>`
      : html``;
    return html`${heading}<div class="card-grid" data-grid="${mutability}">${bucketTools.map((t) => renderToolCard(t, mutability))}</div>`;
  });

  return html`
    <section aria-labelledby="section-tools" data-tools-section>
      ${renderSectionHeading('section-tools', 'Tools', tools.length)}
      ${renderToolFilterBar(populatedBuckets)}
      <div class="tools-body">${groups}</div>
      <p class="tools-empty" hidden>No tools match the current filter.</p>
    </section>
  `;
}

function renderToolFilterBar(populatedBuckets: readonly Mutability[]): SafeHtml {
  const chips: SafeHtml[] = [
    html`<button type="button" class="tool-chip" data-filter-mutability="all" aria-pressed="true">all</button>`,
  ];
  for (const m of populatedBuckets) {
    chips.push(
      html`<button type="button" class="tool-chip tool-chip--${m}" data-filter-mutability="${m}" aria-pressed="false">${m}</button>`,
    );
  }

  return html`
    <div class="tool-filter-bar" role="search" aria-label="Filter tools">
      <div class="tool-chips" role="group" aria-label="Filter by mutability">${chips}</div>
      <label class="tool-search">
        <span class="visually-hidden">Search tools</span>
        <input
          type="search"
          data-tool-search
          placeholder="Search tools…"
          autocomplete="off"
          spellcheck="false"
        />
      </label>
    </div>
  `;
}

function renderToolCard(tool: ManifestTool, mutability: Mutability): SafeHtml {
  const anchor = `tool-${tool.name}`;
  const annotations = tool.annotations as { openWorldHint?: boolean } | undefined;

  // Mutability badge first — the safety signal readers track at a glance.
  const pills: SafeHtml[] = [renderPill(mutability, mutability)];
  if (annotations?.openWorldHint) pills.push(renderPill('open-world', 'openworld'));
  if (tool.isTask) pills.push(renderPill('task', 'task'));
  if (tool.isApp) pills.push(renderPill('app', 'app'));

  const source = tool.sourceUrl
    ? html`<a class="source-link" href="${tool.sourceUrl}" rel="noopener" aria-label="View source for ${tool.name}">view source ↗</a>`
    : html``;

  const scopeChips =
    tool.auth && tool.auth.length > 0
      ? html`<span class="card-scope" title="${tool.auth.join(', ')}"><span class="card-meta-label">scope</span>${tool.auth.map(
          (scope) => html` <code class="scope-chip">${scopeAccessLevel(scope)}</code>`,
        )}</span>`
      : html``;

  const schemaPreview = tool.inputSchema
    ? html`
        <details class="card-detail">
          <summary>schema</summary>
          <pre><code>${JSON.stringify(tool.inputSchema, null, 2)}</code></pre>
        </details>
      `
    : html``;

  const invocation = html`
    <details class="card-detail">
      <summary>invocation</summary>
      ${renderSnippet(`tool-${tool.name}`, buildInvocationSnippet(tool))}
    </details>
  `;

  // Search target: name + description as a single lowercase string. Hidden
  // attribute (not visible) so the filter script can match without parsing
  // DOM text repeatedly. Description gets normalized whitespace so multi-line
  // entries don't waste haystack length.
  const searchTarget = `${tool.name} ${tool.description}`.replace(/\s+/g, ' ').toLowerCase();

  return html`
    <article
      class="card tool-card"
      id="${anchor}"
      data-tool-card
      data-mutability="${mutability}"
      data-name="${tool.name}"
      data-search="${searchTarget}"
    >
      <header class="card-head">
        <h3 class="card-title"><a href="#${anchor}">${tool.name}</a></h3>
        <div class="pill-row" role="list">${pills}</div>
        ${source}
      </header>
      <p class="card-desc">${tool.description}</p>
      <footer class="card-foot">
        ${scopeChips}
        <div class="card-actions">
          ${invocation}
          ${schemaPreview}
        </div>
      </footer>
    </article>
  `;
}

/**
 * Map a tool to a mutability bucket using its annotations. The MCP spec
 * defaults `destructiveHint` to `true`, but treating annotation-less tools
 * as "destructive" surprises readers — bucket as `write` unless the
 * destructive hint is explicitly set. Mirrors how the annotation pills
 * render today (`pill-destructive` requires `=== true`).
 */
function classifyMutability(tool: ManifestTool): Mutability {
  const a = tool.annotations as { readOnlyHint?: boolean; destructiveHint?: boolean } | undefined;
  if (a?.readOnlyHint === true) return 'read';
  if (a?.destructiveHint === true) return 'destructive';
  return 'write';
}

function bucketByMutability(tools: ManifestTool[]): Record<Mutability, ManifestTool[]> {
  const buckets: Record<Mutability, ManifestTool[]> = { read: [], write: [], destructive: [] };
  for (const tool of tools) buckets[classifyMutability(tool)].push(tool);
  return buckets;
}

/**
 * Reduce a colon-delimited scope (`tool:foo:read`) to its trailing access
 * level (`read`). Scopes that don't match the convention render verbatim —
 * the linter doesn't enforce shape, so falling back is friendlier than
 * eating the value.
 */
function scopeAccessLevel(scope: string): string {
  const idx = scope.lastIndexOf(':');
  if (idx < 0 || idx === scope.length - 1) return scope;
  return scope.slice(idx + 1);
}

function buildInvocationSnippet(tool: ManifestTool): string {
  const args: Record<string, unknown> = {};
  for (const field of tool.requiredFields) {
    args[field] = `<${field}>`;
  }
  return JSON.stringify(
    {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: tool.name,
        arguments: args,
      },
    },
    null,
    2,
  );
}
