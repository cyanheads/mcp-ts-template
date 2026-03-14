---
name: add-service
description: >
  Scaffold a new service integration. Use when the user asks to add a service, integrate an external API, or create a reusable domain module with its own initialization and state.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
  type: reference
---

## Context

Services use the init/accessor pattern: initialized once in `createApp`'s `setup()` callback, then accessed at request time via a lazy getter. Each service lives in `src/services/[domain]/` with an init function and accessor.

Service methods receive `Context` for correlated logging (`ctx.log`) and tenant-scoped storage (`ctx.state`). Convention: `ctx.elicit` and `ctx.sample` should only be called from tool handlers, not from services.

For the full service pattern, `CoreServices`, and `Context` interface, read:

    node_modules/@cyanheads/mcp-ts-core/CLAUDE.md

## Steps

1. **Ask the user** for the service domain name and what it integrates with
2. **Create the directory** at `src/services/{{domain}}/`
3. **Create the service file** at `src/services/{{domain}}/{{domain}}-service.ts`
4. **Create types** at `src/services/{{domain}}/types.ts` if needed
5. **Register in `setup()`** in the server's entry point (`src/index.ts`)
6. **Run `bun run devcheck`** to verify

## Template

### Service file

```typescript
/**
 * @fileoverview {{SERVICE_DESCRIPTION}}
 * @module services/{{domain}}/{{domain}}-service
 */

import type { AppConfig } from '@cyanheads/mcp-ts-core/config';
import type { StorageService } from '@cyanheads/mcp-ts-core/storage';
import type { Context } from '@cyanheads/mcp-ts-core';

export class {{ServiceName}} {
  constructor(
    private readonly config: AppConfig,
    private readonly storage: StorageService,
  ) {}

  async doWork(input: string, ctx: Context): Promise<string> {
    ctx.log.debug('Processing', { input });
    // Domain logic here
    return `result: ${input}`;
  }
}

// --- Init/accessor pattern ---

let _service: {{ServiceName}} | undefined;

export function init{{ServiceName}}(config: AppConfig, storage: StorageService): void {
  _service = new {{ServiceName}}(config, storage);
}

export function get{{ServiceName}}(): {{ServiceName}} {
  if (!_service) {
    throw new Error('{{ServiceName}} not initialized — call init{{ServiceName}}() in setup()');
  }
  return _service;
}
```

### Entry point registration

```typescript
// src/index.ts
import { createApp } from '@cyanheads/mcp-ts-core';
import { init{{ServiceName}} } from './services/{{domain}}/{{domain}}-service.js';

await createApp({
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
  setup(core) {
    init{{ServiceName}}(core.config, core.storage);
  },
});
```

### Usage in tool handlers

```typescript
import { get{{ServiceName}} } from '@/services/{{domain}}/{{domain}}-service.js';

handler: async (input, ctx) => {
  return get{{ServiceName}}().doWork(input.query, ctx);
},
```

## Checklist

- [ ] Directory created at `src/services/{{domain}}/`
- [ ] Service file created with init/accessor pattern
- [ ] JSDoc `@fileoverview` and `@module` header present
- [ ] Service methods accept `Context` for logging and storage
- [ ] `init` function registered in `setup()` callback in `src/index.ts`
- [ ] Accessor throws `Error` if not initialized
- [ ] `bun run devcheck` passes
