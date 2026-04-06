---
name: add-app-tool
description: >
  Scaffold an MCP App tool + UI resource pair. Use when the user asks to add a tool with interactive UI, create an MCP App, or build a visual/interactive tool.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
  type: reference
---

## Context

MCP Apps extend the standard tool pattern with an interactive HTML UI rendered in a sandboxed iframe by the host. Each MCP App consists of two definitions:

1. **App tool** (`.app-tool.ts`) — uses `appTool()` builder, declares `resourceUri` pointing to the UI resource
2. **App resource** (`.app-resource.ts`) — uses `appResource()` builder, serves the bundled HTML

Both builders are exported from `@cyanheads/mcp-ts-core`. They handle `_meta.ui.resourceUri`, the compat key (`ui/resourceUri`), and the correct MIME type (`text/html;profile=mcp-app`) automatically.

For the full API, Context interface, and error codes, read:

    node_modules/@cyanheads/mcp-ts-core/CLAUDE.md

## Steps

1. **Ask the user** for the tool's name, purpose, input/output shape, and what the UI should display
2. **Choose a URI** — convention: `ui://{{tool-name}}/app.html`
3. **Create the app tool** at `src/mcp-server/tools/definitions/{{tool-name}}.app-tool.ts`
4. **Create the app resource** at `src/mcp-server/resources/definitions/{{tool-name}}-ui.app-resource.ts`
5. **Register both** in their respective `definitions/index.ts` barrels
6. **Run `bun run devcheck`** — the linter validates `_meta.ui` and cross-checks tool/resource pairing
7. **Smoke-test** with `bun run dev:stdio` or `dev:http`

## App Tool Template

```typescript
/**
 * @fileoverview {{TOOL_DESCRIPTION}}
 * @module mcp-server/tools/definitions/{{TOOL_NAME}}.app-tool
 */

import { appTool, z } from '@cyanheads/mcp-ts-core';

const UI_RESOURCE_URI = 'ui://{{tool-name}}/app.html';

export const {{TOOL_EXPORT}} = appTool('{{tool_name}}', {
  resourceUri: UI_RESOURCE_URI,
  title: '{{TOOL_TITLE}}',
  description: '{{TOOL_DESCRIPTION}}',
  annotations: { readOnlyHint: true },
  input: z.object({
    // All fields need .describe(). Only JSON-Schema-serializable Zod types allowed.
  }),
  output: z.object({
    // All fields need .describe(). Only JSON-Schema-serializable Zod types allowed.
  }),
  // auth: ['tool:{{tool_name}}:read'],

  async handler(input, ctx) {
    ctx.log.info('Processing', { /* relevant input fields */ });
    return { /* output */ };
  },

  // format() serves dual purpose for app tools:
  // 1. First text block: JSON for the UI (app.ontoolresult parses it)
  // 2. Subsequent blocks: human-readable fallback for non-app hosts and LLM context
  format(result) {
    return [
      { type: 'text', text: JSON.stringify(result) },
      { type: 'text', text: '/* human-readable summary */' },
    ];
  },
});
```

## App Resource Template

```typescript
/**
 * @fileoverview UI resource for {{TOOL_NAME}}.
 * @module mcp-server/resources/definitions/{{TOOL_NAME}}-ui.app-resource
 */

import { appResource, z } from '@cyanheads/mcp-ts-core';

const ParamsSchema = z.object({}).describe('No parameters. Returns the static HTML app.');

const APP_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{TOOL_TITLE}}</title>
  <style>/* your styles */</style>
</head>
<body>
  <!-- your UI markup -->

  <script type="module">
    import { App } from "https://unpkg.com/@modelcontextprotocol/ext-apps@1/app-with-deps";

    const app = new App({ name: "{{TOOL_TITLE}}", version: "1.0.0" });

    // Receive initial tool result from the host
    app.ontoolresult = (result) => {
      const text = result.content?.find(c => c.type === "text")?.text;
      if (!text) return;
      const data = JSON.parse(text);
      // render data into the DOM
    };

    // Proactively call tools from the UI
    document.getElementById("action-btn").addEventListener("click", async () => {
      const result = await app.callServerTool({
        name: "{{tool_name}}",
        arguments: { /* input */ },
      });
      // handle result
    });

    await app.connect();
  </script>
</body>
</html>`;

export const {{RESOURCE_EXPORT}} = appResource('ui://{{tool-name}}/app.html', {
  name: '{{tool-name}}-ui',
  title: '{{TOOL_TITLE}} UI',
  description: 'Interactive HTML app for {{tool_name}}.',
  params: ParamsSchema,
  // auth: ['resource:{{tool-name}}-ui:read'],

  handler(_params, ctx) {
    ctx.log.debug('Serving app UI.', { resourceUri: ctx.uri?.href });
    return APP_HTML;
  },

  list: () => ({
    resources: [
      {
        uri: 'ui://{{tool-name}}/app.html',
        name: '{{TOOL_TITLE}}',
        description: 'Interactive UI for {{tool_name}}.',
      },
    ],
  }),
});
```

## UI Design Notes

- **Bundling:** The simplest approach is inlining HTML/CSS/JS as a template literal (shown above). For complex UIs, use Vite + `vite-plugin-singlefile` to bundle into a single HTML file and read it from disk in the handler.
- **Client-side SDK:** Import `App` from `@modelcontextprotocol/ext-apps` via CDN or bundle it. The `App` class provides `connect()`, `ontoolresult`, `callServerTool()`, `sendMessage()`, and `sendOpenLink()`.
- **CSP:** Inline scripts and styles work by default. External resources need CSP configuration via `_meta.ui.csp` on the resource content items (in `format()`) or on the resource definition's `_meta`.
- **format() for app tools:** The first `text` content block is typically JSON that the UI parses via `ontoolresult`. Additional blocks provide a human-readable fallback that non-app hosts and LLMs consume.

## Barrel Registration

```typescript
// src/mcp-server/tools/definitions/index.ts
import { {{TOOL_EXPORT}} } from './{{tool-name}}.app-tool.js';

export const allToolDefinitions = [
  // ... existing tools,
  {{TOOL_EXPORT}},
];

// src/mcp-server/resources/definitions/index.ts
import { {{RESOURCE_EXPORT}} } from './{{tool-name}}-ui.app-resource.js';

export const allResourceDefinitions = [
  // ... existing resources,
  {{RESOURCE_EXPORT}},
];
```

## Checklist

- [ ] App tool created at `src/mcp-server/tools/definitions/{{tool-name}}.app-tool.ts` using `appTool()`
- [ ] App resource created at `src/mcp-server/resources/definitions/{{tool-name}}-ui.app-resource.ts` using `appResource()`
- [ ] `resourceUri` matches between tool and resource (`ui://{{tool-name}}/app.html`)
- [ ] Zod schemas: all fields have `.describe()`, only JSON-Schema-serializable types
- [ ] `format()` renders JSON first block (for UI) + human-readable blocks (for non-app hosts)
- [ ] UI calls `app.connect()` and handles `app.ontoolresult`
- [ ] Both registered in their respective `definitions/index.ts` barrels
- [ ] `bun run devcheck` passes (linter validates `_meta.ui` and tool/resource pairing)
- [ ] Smoke-tested with `bun run dev:stdio` or `dev:http`
