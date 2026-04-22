/**
 * @fileoverview Terminal-chrome connect card with STDIO / HTTP / Claude / curl
 * tabs. Generates copy-paste-ready client configs and commands from the
 * server manifest. Radio-input + `:has()` CSS hack drives tab switching with
 * no JS.
 *
 * Accessibility: the ARIA tab pattern (`role="tablist"`/`"tab"`/`"tabpanel"`
 * + `aria-selected`/`aria-controls`) is a poor fit for a radio-input-driven
 * widget — the radios already communicate a mutually-exclusive selection to
 * assistive tech. We don't add ARIA tab roles because they'd be incomplete
 * (no `aria-selected` state, no `aria-controls` wiring) and a partial ARIA
 * pattern is worse than none.
 *
 * @module src/mcp-server/transports/http/landing-page/sections/connect
 */

import type { ServerManifest } from '@/core/serverManifest.js';
import { html, type SafeHtml } from '@/utils/formatting/html.js';

export function renderConnectSnippets(manifest: ServerManifest, baseUrl: string): SafeHtml {
  const endpoint = `${baseUrl.replace(/\/$/, '')}${manifest.transport.endpointPath}`;
  const npmPackage = manifest.landing.npmPackage?.name;
  // `@cyanheads/mcp-ts-core` → `mcp-ts-core`. Short aliases match the convention
  // used in real Claude Desktop / Cursor configs and make the `claude mcp add`
  // command more ergonomic.
  const shortName = deriveShortName(manifest.server.name);
  const envExample = manifest.landing.envExample;
  const stdioEnv = envExample.length > 0 ? envFromEntries(envExample) : undefined;

  // STDIO: prefer native `bunx <pkg>@latest` when the server is published;
  // fall back to `mcp-remote` as a stdio → HTTP bridge so the tab is always
  // useful even for unpublished servers. Env vars belong here — this is the
  // only transport where the client spawns the server process and can pass
  // them through.
  const stdioConfig = JSON.stringify(
    {
      mcpServers: {
        [shortName]: {
          command: 'bunx',
          args: npmPackage ? [`${npmPackage}@latest`] : ['mcp-remote', endpoint],
          ...(stdioEnv && { env: stdioEnv }),
        },
      },
    },
    null,
    2,
  );

  // HTTP: no `env` block. MCP clients only forward env vars to spawned stdio
  // child processes; for `type: 'http'` there's no process, so including env
  // is a silent no-op that misleads visitors of a hosted instance into
  // thinking they need to supply credentials the server already owns.
  const httpConfig = JSON.stringify(
    {
      mcpServers: {
        [shortName]: {
          type: 'http',
          url: endpoint,
        },
      },
    },
    null,
    2,
  );

  // `claude mcp add` — always target the HTTP endpoint. The landing page is
  // served over HTTP, so a visitor is already interacting with this
  // instance; a stdio/bunx command here would install a different (local)
  // copy and carry env placeholders that HTTP wouldn't forward anyway. The
  // STDIO tab still carries the JSON for anyone who wants to run locally.
  const claudeCmd = buildClaudeHttpCmd(shortName, endpoint);

  const curl = [
    `curl -X POST ${endpoint} \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -H "MCP-Protocol-Version: ${manifest.protocol.latestVersion}" \\`,
    `  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"${manifest.protocol.latestVersion}","capabilities":{},"clientInfo":{"name":"curl","version":"1.0.0"}}}'`,
  ].join('\n');

  // Chrome label — npm package when published, else the HTTP endpoint (trimmed).
  const chromeLabel = npmPackage ?? endpoint.replace(/^https?:\/\//, '');

  const panels: Array<{ id: string; label: string; content: string; copyAriaLabel: string }> = [
    { id: 'stdio', label: 'STDIO', content: stdioConfig, copyAriaLabel: 'Copy stdio config' },
    {
      id: 'http',
      label: 'Streamable HTTP',
      content: httpConfig,
      copyAriaLabel: 'Copy HTTP config',
    },
    {
      id: 'claude',
      label: 'Claude',
      content: claudeCmd,
      copyAriaLabel: 'Copy claude mcp add command',
    },
    { id: 'curl', label: 'curl', content: curl, copyAriaLabel: 'Copy curl command' },
  ];

  return html`
    <div class="connect" aria-label="Connection snippets">
      <div class="connect-chrome">
        <span class="connect-chrome-dots" aria-hidden="true">
          <span class="connect-chrome-dot"></span>
          <span class="connect-chrome-dot"></span>
          <span class="connect-chrome-dot"></span>
        </span>
        <span class="connect-chrome-endpoint" title="${endpoint}">${chromeLabel}</span>
      </div>
      ${panels.map((p, i) =>
        i === 0
          ? html`<input type="radio" class="connect-tab-input" name="connect" id="connect-tab-${p.id}" checked />`
          : html`<input type="radio" class="connect-tab-input" name="connect" id="connect-tab-${p.id}" />`,
      )}
      <div class="connect-tabs">
        ${panels.map(
          (p) =>
            html`<label for="connect-tab-${p.id}" class="connect-tab-label">${p.label}</label>`,
        )}
      </div>
      <div class="connect-panels">
        ${panels.map((p) => renderConnectPanel(p.id, p.content, p.copyAriaLabel))}
      </div>
    </div>
  `;
}

/** Single panel inside the connect card — pre/code + copy button. */
function renderConnectPanel(id: string, content: string, copyAriaLabel: string): SafeHtml {
  const snippetId = `connect-snippet-${id}`;
  return html`
    <div class="connect-panel panel-${id}">
      <pre id="${snippetId}"><code>${content}</code></pre>
      <button type="button" class="connect-copy" data-copy data-copy-target="#${snippetId}" aria-label="${copyAriaLabel}">Copy</button>
    </div>
  `;
}

/**
 * `@scope/pkg-name` → `pkg-name`. Fall through for bare names.
 * Used as the `mcpServers` key and the Claude CLI server alias.
 */
function deriveShortName(serverName: string): string {
  const slash = serverName.lastIndexOf('/');
  return slash >= 0 ? serverName.slice(slash + 1) : serverName;
}

/** Convert ordered env entries to the `{ KEY: value }` shape MCP clients expect. */
function envFromEntries(
  entries: ReadonlyArray<{ key: string; value: string }>,
): Record<string, string> {
  return Object.fromEntries(entries.map(({ key, value }) => [key, value]));
}

/** `claude mcp add --transport http <name> <url>` */
function buildClaudeHttpCmd(shortName: string, endpoint: string): string {
  return `claude mcp add --transport http ${shortName} ${endpoint}`;
}
