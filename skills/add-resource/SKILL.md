---
name: add-resource
description: >
  Scaffold a new MCP resource definition. Use when the user asks to add a resource, expose data via URI, or create a readable endpoint.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
---

## Context

Resources use the `resource()` builder from `@cyanheads/mcp-ts-core`. Each resource lives in `src/mcp-server/resources/definitions/` with a `.resource.ts` suffix and is registered in the barrel `index.ts`.

For the full `resource()` API, pagination utilities, and `Context` interface, read:

    node_modules/@cyanheads/mcp-ts-core/CLAUDE.md

## Steps

1. **Ask the user** for the resource's URI template, purpose, and data shape
2. **Design the URI** — use `{paramName}` for path parameters (e.g., `myscheme://{itemId}/data`)
3. **Create the file** at `src/mcp-server/resources/definitions/{{resource-name}}.resource.ts`
4. **Register** the resource in `src/mcp-server/resources/definitions/index.ts`
5. **Run `bun run devcheck`** to verify
6. **Smoke-test** with `bun run dev:stdio` or `dev:http`

## Template

```typescript
/**
 * @fileoverview {{RESOURCE_DESCRIPTION}}
 * @module mcp-server/resources/definitions/{{RESOURCE_NAME}}
 */

import { z } from 'zod';
import { resource } from '@cyanheads/mcp-ts-core';
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';

export const {{RESOURCE_EXPORT}} = resource('{{scheme}}://{{{paramName}}}/data', {
  description: '{{RESOURCE_DESCRIPTION}}',
  mimeType: 'application/json',
  params: z.object({
    {{paramName}}: z.string().describe('{{PARAM_DESCRIPTION}}'),
  }),
  // auth: ['resource:{{resource_name}}:read'],

  async handler(params, ctx) {
    ctx.log.debug('Fetching resource', { {{paramName}}: params.{{paramName}} });
    // Pure logic — throw McpError on failure, no try/catch
    return { /* resource data */ };
  },

  list: async () => ({
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

For resources returning large lists, use opaque cursor pagination:

```typescript
import { extractCursor, paginateArray } from '@cyanheads/mcp-ts-core/utils/pagination';

async handler(params, ctx) {
  const allItems = await fetchAllItems(params);
  const cursor = extractCursor(params);
  const page = paginateArray(allItems, cursor, 20, 100, ctx);
  return {
    items: page.items,
    nextCursor: page.nextCursor,
  };
},
```

### Barrel registration

```typescript
// src/mcp-server/resources/definitions/index.ts
import { {{RESOURCE_EXPORT}} } from './{{resource-name}}.resource.js';
export const allResourceDefinitions = [
  // ... existing resources
  {{RESOURCE_EXPORT}},
];
```

## Checklist

- [ ] File created at `src/mcp-server/resources/definitions/{{resource-name}}.resource.ts`
- [ ] URI template uses `{paramName}` syntax for path parameters
- [ ] All Zod `params` fields have `.describe()` annotations
- [ ] JSDoc `@fileoverview` and `@module` header present
- [ ] `handler(params, ctx)` is pure — throws `McpError`, no try/catch
- [ ] `list()` function provided if the resource is discoverable
- [ ] Pagination used for large result sets (`extractCursor`/`paginateArray`)
- [ ] Registered in `definitions/index.ts` barrel and `allResourceDefinitions`
- [ ] `bun run devcheck` passes
- [ ] Smoke-tested with `bun run dev:stdio` or `dev:http`
