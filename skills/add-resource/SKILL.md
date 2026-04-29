---
name: add-resource
description: >
  Scaffold a new MCP resource definition. Use when the user asks to add a resource, expose data via URI, or create a readable endpoint.
metadata:
  author: cyanheads
  version: "1.3"
  audience: external
  type: reference
---

## Context

Resources use the `resource()` builder from `@cyanheads/mcp-ts-core`. Each resource lives in `src/mcp-server/resources/definitions/` with a `.resource.ts` suffix and is registered into `createApp()` in `src/index.ts`. Some repos later add `definitions/index.ts` barrels; follow the pattern already used by the project.

**Tool coverage.** Not all MCP clients expose resources — many are tool-only (Claude Code, Cursor, most chat UIs). Before adding a resource, verify the same data is reachable via the tool surface — either through a dedicated tool, included in another tool's output, or bundled into a broader tool. A resource whose data has no tool path is invisible to a large share of agents.

For the full `resource()` API, pagination utilities, and `Context` interface, read `node_modules/@cyanheads/mcp-ts-core/CLAUDE.md`.

## Steps

1. **Ask the user** for the resource's URI template, purpose, and data shape
2. **Design the URI** — use `{paramName}` for path parameters (e.g., `myscheme://{itemId}/data`)
3. **Create the file** at `src/mcp-server/resources/definitions/{{resource-name}}.resource.ts`
4. **Register** the resource in the project's existing `createApp()` resource list (directly in `src/index.ts` for fresh scaffolds, or via a barrel if the repo already has one)
5. **Run `bun run devcheck`** to verify
6. **Smoke-test** with `bun run rebuild && bun run start:stdio` (or `start:http`)

## Template

```typescript
/**
 * @fileoverview {{RESOURCE_DESCRIPTION}}
 * @module mcp-server/resources/definitions/{{RESOURCE_NAME}}
 */

import { resource, z } from '@cyanheads/mcp-ts-core';

export const {{RESOURCE_EXPORT}} = resource('{{scheme}}://{{{paramName}}}/data', {
  description: '{{RESOURCE_DESCRIPTION}}',
  mimeType: 'application/json',
  // size: 1024,  // optional: content size in bytes, if known
  params: z.object({
    {{paramName}}: z.string().describe('{{PARAM_DESCRIPTION}}'),
  }),
  // auth: ['resource:{{resource_name}}:read'],

  async handler(params, ctx) {
    ctx.log.debug('Fetching resource', { {{paramName}}: params.{{paramName}} });
    // Pure logic — throw on failure, no try/catch
    return { /* resource data */ };
  },

  list: async (extra) => ({
    resources: [
      {
        uri: '{{scheme}}://all',
        name: '{{RESOURCE_LIST_NAME}}',
        mimeType: 'application/json',
      },
    ],
  }),
});
```

### With pagination

For resources that return large result sets, include `cursor` in the URI template params and use opaque cursor pagination in the `handler`. The cursor arrives as a validated URI param. `paginateArray` requires a `RequestContext` for logging — create one from `requestContextService`:

```typescript
import { extractCursor, paginateArray, requestContextService } from '@cyanheads/mcp-ts-core/utils';

// URI template: '{{scheme}}://{{{paramName}}}/items'
params: z.object({
  {{paramName}}: z.string().describe('{{PARAM_DESCRIPTION}}'),
  cursor: z.string().optional().describe('Opaque pagination cursor'),
}),

async handler(params, ctx) {
  const allItems = await fetchAllItems(params.{{paramName}});
  const cursor = extractCursor({ cursor: params.cursor });
  const reqCtx = requestContextService.createRequestContext({
    operation: 'list-{{paramName}}',
    parentContext: { requestId: ctx.requestId, traceId: ctx.traceId },
  });
  const page = paginateArray(allItems, cursor, 20, 100, reqCtx);
  return {
    items: page.items,
    nextCursor: page.nextCursor,
  };
},
```

### Registration

```typescript
// src/index.ts (fresh scaffold default)
import { createApp } from '@cyanheads/mcp-ts-core';
import { {{RESOURCE_EXPORT}} } from './mcp-server/resources/definitions/{{resource-name}}.resource.js';

await createApp({
  tools: [/* existing tools */],
  resources: [{{RESOURCE_EXPORT}}],
  prompts: [/* existing prompts */],
});
```

If the repo already uses `src/mcp-server/resources/definitions/index.ts`, update that barrel instead of changing the registration style.

### Optional: declarative `errors[]` contract

Resources can opt into the same typed error contract as tools — bound to a typed `ctx.fail(reason, …)` keyed by the declared reason union:

```typescript
import { JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';

export const articleResource = resource('article://{pmid}', {
  description: 'Read an article by PMID.',
  errors: [
    { reason: 'no_pmid_match', code: JsonRpcErrorCode.NotFound,
      when: 'PMID not found in the index.' },
    { reason: 'withdrawn', code: JsonRpcErrorCode.NotFound,
      when: 'Article was withdrawn upstream.' },
    { reason: 'upstream_throttled', code: JsonRpcErrorCode.RateLimited,
      when: 'Upstream PubMed quota hit.', retryable: true },
  ],
  params: z.object({ pmid: z.string().describe('PubMed ID') }),
  async handler(params, ctx) {
    const article = await fetchOne(params.pmid);
    if (!article) throw ctx.fail('no_pmid_match', `PMID ${params.pmid} not indexed`);
    if (article.withdrawn) throw ctx.fail('withdrawn');
    return article;
  },
});
```

Without `errors[]`, the handler receives plain `Context` (no `fail` method) and throws via error factories (`notFound`, `serviceUnavailable`, …) directly. The contract is opt-in. See `skills/api-errors/SKILL.md` for the full pattern, baseline codes, and conformance rules.

### Other `resource()` options

Beyond `description`, `params`, `handler`, and `list`, the builder also supports:

| Field | Purpose |
|:------|:--------|
| `output` | Optional Zod schema for runtime validation of the handler return value (parity with `tool()`'s `output`). |
| `format` | Optional formatter mapping the handler's return to the `ReadResourceResult.contents[]` shape. Default: string passthrough; objects serialized to JSON. Override when you need to attach permissions, custom encodings, or split into multiple content items. |
| `annotations` | Resource annotations (e.g., `audience`, `priority`) — see `ResourceAnnotations`. |
| `title` | Human-readable display title (defaults to `name`). |

## Checklist

- [ ] File created at `src/mcp-server/resources/definitions/{{resource-name}}.resource.ts`
- [ ] URI template uses `{paramName}` syntax for path parameters
- [ ] All Zod `params` fields have `.describe()` annotations
- [ ] JSDoc `@fileoverview` and `@module` header present
- [ ] `handler(params, ctx)` is pure — throws on failure, no try/catch
- [ ] Data is reachable via the tool surface (dedicated tool, another tool's output, or not needed for tool-only agents)
- [ ] `list()` function provided if the resource is discoverable
- [ ] Pagination used for large result sets (`extractCursor`/`paginateArray`)
- [ ] Registered in the project's existing `createApp()` resource list (directly or via barrel)
- [ ] `bun run devcheck` passes
- [ ] Smoke-tested with `bun run rebuild && bun run start:stdio` (or `start:http`)
