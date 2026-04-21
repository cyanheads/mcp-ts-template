/**
 * @fileoverview `html` tagged-template utility with unconditional HTML-escaping
 * of interpolated values. Designed as the safe default for any server-rendered
 * markup in the framework — the landing page, MCP App UI surfaces, ad-hoc
 * diagnostic pages. Same ergonomics as Hono's `html` / lit-html's `html`, but
 * deliberately small and dependency-free.
 *
 * ## Safety model
 *
 * Every interpolation is escaped against the five HTML entity characters
 * (`&`, `<`, `>`, `"`, `'`) by default. Escape hatches exist for
 * caller-vetted strings via {@link unsafeRaw} and for pre-built fragments via
 * {@link SafeHtml} (returned from nested `html` calls).
 *
 * ```ts
 * import { html } from '@cyanheads/mcp-ts-core/utils';
 *
 * const userInput = '<script>alert(1)</script>';
 * const page = html`<p>Hi ${userInput}</p>`;
 * page.toString();
 * // <p>Hi &lt;script&gt;alert(1)&lt;/script&gt;</p>
 * ```
 *
 * @module utils/formatting/html
 */

/**
 * Opaque wrapper indicating a value has already been escaped (or is a
 * caller-vetted literal). The `html` template tag unwraps this type without
 * re-escaping, so fragments compose cleanly.
 */
export class SafeHtml {
  constructor(public readonly value: string) {}
  toString(): string {
    return this.value;
  }
}

/** Interpolable types accepted by the `html` tag. */
export type HtmlInterpolation =
  | SafeHtml
  | string
  | number
  | boolean
  | null
  | undefined
  | HtmlInterpolation[];

const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escape the five HTML entity characters. Exported for callers that need to
 * produce escaped output outside of the `html` tagged template (e.g. when
 * building attribute strings that require further manipulation).
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ENTITY_MAP[ch] ?? ch);
}

/**
 * Wrap a caller-vetted string as `SafeHtml`, skipping auto-escape.
 *
 * Only use on values you control end-to-end — not on anything sourced from
 * config, user input, or upstream APIs. The auto-escape is the default
 * for a reason.
 *
 * @example
 * ```ts
 * const icon = unsafeRaw('<svg>…</svg>');
 * html`<span class="icon">${icon}</span>`;
 * ```
 */
export function unsafeRaw(value: string): SafeHtml {
  return new SafeHtml(value);
}

function stringify(value: HtmlInterpolation): string {
  if (value === null || value === undefined || value === false) return '';
  if (value === true) return '';
  if (value instanceof SafeHtml) return value.value;
  if (Array.isArray(value)) return value.map(stringify).join('');
  if (typeof value === 'number') return String(value);
  return escapeHtml(String(value));
}

/**
 * Tagged template that concatenates static literal parts with auto-escaped
 * interpolations, producing a `SafeHtml` fragment. Nest freely — a
 * `SafeHtml` interpolation is passed through without re-escaping.
 *
 * @example
 * ```ts
 * const card = html`
 *   <article>
 *     <h3>${tool.name}</h3>
 *     <p>${tool.description}</p>
 *   </article>
 * `;
 *
 * const page = html`<main>${[card, card]}</main>`;
 * ```
 */
export function html(strings: TemplateStringsArray, ...values: HtmlInterpolation[]): SafeHtml {
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i] ?? '';
    if (i < values.length) {
      out += stringify(values[i] as HtmlInterpolation);
    }
  }
  return new SafeHtml(out);
}
