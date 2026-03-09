# 03 — Config & Container

> Config extension pattern, container split, DI registration changes.

---

## Config Extension

Core owns the config schema for transport, auth, storage, telemetry, LLM, speech. Servers do **not** merge into core's schema. They define their own config for domain-specific env vars.

### Why not merge

- Core config is validated by core — no surprises, no version coupling on schema shape
- Server config is validated by the server — full control over parsing, defaults, validation
- No complex `z.merge()` or `defineConfig()` helper needed
- Clean separation: core config for infrastructure, server config for domain

### Server config pattern

```ts
// src/config/server-config.ts (in the server repo)
import { z } from 'zod';

const ServerConfigSchema = z.object({
  pubmedApiKey: z.string().describe('NCBI E-utilities API key'),
  maxResultsPerQuery: z.coerce.number().default(100),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

/**
 * Lazy config accessor — must NOT parse at module top-level.
 *
 * Core's own config is lazy because Worker bindings are injected into
 * process.env AFTER static imports execute. Parsing process.env at
 * module load would see empty/stale values in Cloudflare Workers.
 * Server config must follow the same pattern.
 */
let _serverConfig: ServerConfig | undefined;
export function getServerConfig(): ServerConfig {
  _serverConfig ??= ServerConfigSchema.parse({
    pubmedApiKey: process.env.PUBMED_API_KEY,
    maxResultsPerQuery: process.env.PUBMED_MAX_RESULTS,
  });
  return _serverConfig;
}
```

**Warning:** Do not eagerly parse `process.env` at module top-level (e.g. `export const serverConfig = Schema.parse({...})`). In Cloudflare Workers, env bindings are injected into `process.env` by `injectEnvVars()` during the request handler — after all static imports have executed. Eager parsing sees empty values. Core's own `parseConfig()` is lazy for exactly this reason; server config must follow the same pattern.

Tool logic imports from the server's config, not from core:

```ts
import { getServerConfig } from '../../config/server-config.js';

// Called inside logic (at request time), not at import time
const config = getServerConfig();

// Core config still available via DI for infrastructure concerns
import { container } from '@cyanheads/mcp-ts-core/container';
import { AppConfig } from '@cyanheads/mcp-ts-core/tokens';
const coreConfig = container.resolve(AppConfig);
```

---

## Container Split

The current `composeContainer()` calls two functions. After extraction, core owns both — but `registerMcpServices` takes definitions as input instead of importing them.

### Current (monolith)

```
composeContainer()
  -> registerCoreServices()     // config, logger, storage, rate limiter, LLM, speech
  -> registerMcpServices()      // imports allToolDefinitions, allResourceDefinitions directly
```

### After extraction

```
bootstrap(options)
  -> registerCoreServices()                    // unchanged — all from core
  -> registerMcpServices(options.definitions)   // definitions injected, not imported
  -> options.services?.(container)              // server-specific DI extensions
```

### `registerMcpServices` changes

```ts
// Before (imports definitions directly)
import { allToolDefinitions } from '@/mcp-server/tools/definitions/index.js';
import { allResourceDefinitions } from '@/mcp-server/resources/definitions/index.js';

export const registerMcpServices = () => {
  for (const tool of allToolDefinitions) {
    container.registerMulti(ToolDefinitions, tool);
  }
  // ...
};

// After (definitions passed in)
export const registerMcpServices = (definitions: ServerDefinitions) => {
  for (const tool of definitions.tools) {
    container.registerMulti(ToolDefinitions, tool);
  }
  for (const resource of definitions.resources) {
    container.registerMulti(ResourceDefinitions, resource);
  }
  for (const prompt of definitions.prompts) {
    container.registerMulti(PromptDefinitions, prompt);
  }
  // Prompts also go through DI now (see Pre-extraction Cleanup)
  // Registries, TaskManager, TransportManager, server factory — unchanged
};
```

### Key constraint

**DI resolution timing.** `options.services` runs after `registerMcpServices`, so tokens registered there won't be available during definition registration — only during request handling. Tool definitions must defer container resolution to call time (inside `logic`), not registration time. This is already the pattern but must be explicit in the contract.

---

## Checklist

- [ ] `registerMcpServices()` accepts `ServerDefinitions` parameter instead of static imports
- [ ] `bootstrap()` applies name/version overrides before DI registration
- [ ] `options.services` callback runs after core services, supports async
- [ ] Server config uses lazy accessor pattern (no top-level `process.env` parsing)
- [ ] Core config exposes `overrides` parameter on `parseConfig` for name/version
