/**
 * @fileoverview Tools section — responsive 2-column card grid, optionally
 * prefix-grouped when ≥2 tools share a common `snake_case` prefix. Each card
 * carries annotation pills (read-only / destructive / open-world / task /
 * app), auth scope chips, a JSON-RPC invocation snippet, and a collapsible
 * input-schema preview.
 *
 * @module src/mcp-server/transports/http/landing-page/sections/tools
 */

import type { ManifestTool } from '@/core/serverManifest.js';
import { html, type SafeHtml } from '@/utils/formatting/html.js';

import { renderPill, renderSectionHeading, renderSnippet } from '../primitives.js';

export function renderToolsSection(tools: ManifestTool[]): SafeHtml {
  if (tools.length === 0) return html``;
  const groups = groupToolsByPrefix(tools);
  // A single group — whether labeled or not — would render as redundant with
  // the section header. Skip the sub-heading; render a flat grid.
  const showHeadings = groups.length > 1;
  const body = groups.map((group) => {
    const heading =
      showHeadings && group.label ? html`<h4 class="group-heading">${group.label}</h4>` : html``;
    return html`${heading}<div class="card-grid">${group.tools.map(renderToolCard)}</div>`;
  });

  return html`
    <section aria-labelledby="section-tools">
      ${renderSectionHeading('section-tools', 'Tools', tools.length)}
      ${body}
    </section>
  `;
}

function renderToolCard(tool: ManifestTool): SafeHtml {
  const anchor = `tool-${tool.name}`;
  const annotations = tool.annotations as
    | { readOnlyHint?: boolean; destructiveHint?: boolean; openWorldHint?: boolean }
    | undefined;
  const pills: SafeHtml[] = [];
  if (annotations?.readOnlyHint) pills.push(renderPill('read-only', 'readonly'));
  if (annotations?.destructiveHint === true) pills.push(renderPill('destructive', 'destructive'));
  if (annotations?.openWorldHint) pills.push(renderPill('open-world', 'openworld'));
  if (tool.isTask) pills.push(renderPill('task', 'task'));
  if (tool.isApp) pills.push(renderPill('app', 'app'));

  const source = tool.sourceUrl
    ? html`<a class="source-link" href="${tool.sourceUrl}" rel="noopener">view source ↗</a>`
    : html``;

  const schemaPreview = tool.inputSchema
    ? html`
        <details>
          <summary>Input schema</summary>
          <pre><code>${JSON.stringify(tool.inputSchema, null, 2)}</code></pre>
        </details>
      `
    : html``;

  const invocation = html`
    <details>
      <summary>Invocation</summary>
      ${renderSnippet(`tool-${tool.name}`, buildInvocationSnippet(tool))}
    </details>
  `;

  const authBadges =
    tool.auth && tool.auth.length > 0
      ? html`<div class="card-meta"><span class="card-meta-label">scopes</span>${tool.auth.map((scope) => html` <span class="pill pill-auth">${scope}</span>`)}</div>`
      : html``;

  return html`
    <article class="card" id="${anchor}">
      <div class="card-head">
        <h3 class="card-title"><a href="#${anchor}">${tool.name}</a></h3>
        <div class="pill-row" role="list">${pills}</div>
        ${source}
      </div>
      <p class="card-desc">${tool.description}</p>
      ${authBadges}
      ${invocation}
      ${schemaPreview}
    </article>
  `;
}

function groupToolsByPrefix(
  tools: ManifestTool[],
): Array<{ label: string | null; tools: ManifestTool[] }> {
  if (tools.length < 3) return [{ label: null, tools }];

  const prefixCounts = new Map<string, number>();
  for (const tool of tools) {
    const prefix = tool.name.split('_', 1)[0];
    if (!prefix) continue;
    prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
  }

  const groupablePrefixes = new Set(
    [...prefixCounts.entries()].filter(([, count]) => count >= 2).map(([p]) => p),
  );

  if (groupablePrefixes.size === 0) return [{ label: null, tools }];

  const groups = new Map<string, ManifestTool[]>();
  const other: ManifestTool[] = [];
  for (const tool of tools) {
    const prefix = tool.name.split('_', 1)[0];
    if (prefix && groupablePrefixes.has(prefix)) {
      const list = groups.get(prefix) ?? [];
      list.push(tool);
      groups.set(prefix, list);
    } else {
      other.push(tool);
    }
  }

  const out: Array<{ label: string | null; tools: ManifestTool[] }> = [];
  for (const [prefix, list] of groups) {
    out.push({ label: titleCase(prefix), tools: list });
  }
  if (other.length > 0) out.push({ label: 'Other', tools: other });
  return out;
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
