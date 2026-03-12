# 03 — Config & App Wiring

> Config extension pattern, `createApp()` internal wiring.

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

Tool handlers import from the server's config, not from core:

```ts
import { getServerConfig } from '../../config/server-config.js';

// Called inside handler (at request time), not at import time
const config = getServerConfig();

// Core config available via the setup() callback or lazy accessor
import type { AppConfig } from '@cyanheads/mcp-ts-core/config';
```

---

## App Wiring (internal)

> This section describes how `createApp()` is implemented inside core. Consumers never see this — they call `createApp()` and get a `ServerHandle`. See [02-public-api.md](02-public-api.md) for the consumer-facing API.

### Current (monolith)

```
composeContainer()
  -> registerCoreServices()     // config, logger, storage, rate limiter, LLM, speech
  -> registerMcpServices()      // imports allToolDefinitions, allResourceDefinitions directly
```

Uses a DI container with tokens, registrations, and lazy singleton resolution. The container has 7 production `resolve()` calls (2 in `index.ts`, 4 in `server.ts`, 1 in `transports/manager.ts`). Zero tool/resource/prompt definitions use it.

### After extraction

```
createApp(options)
  -> constructCoreServices()              // direct construction, no container
  -> options.setup?.(coreServices)        // server-specific init
  -> constructRegistries(options.tools, options.resources, options.prompts)
  -> constructTransport(...)              // TaskManager, TransportManager
  -> start()
```

No DI container. No tokens. No `registerSingleton`/`resolve` indirection. Services are constructed in dependency order and passed by reference.

### Direct construction replaces container

What was `registerCoreServices()` with container registrations becomes direct construction:

```ts
// Inside createApp() — simplified
const config = parseConfig(options.name, options.version);
const storageProvider = createStorageProvider(config, deps);
const storage = new StorageService(storageProvider);
const rateLimiter = new RateLimiter(config, logger);

// Optional services — constructed only if configured
const llmProvider = config.openRouter?.apiKey
  ? new OpenRouterProvider(rateLimiter, config, logger)
  : undefined;

// Server-specific setup (optional services included when configured)
await options.setup?.({ config, logger, storage, rateLimiter, llmProvider, speechService, supabase });

// Registries from top-level arrays
const toolRegistry = new ToolRegistry(options.tools ?? []);
const resourceRegistry = new ResourceRegistry(options.resources ?? []);
const promptRegistry = new PromptRegistry(options.prompts ?? [], logger);
const rootsRegistry = new RootsRegistry(logger);
const taskManager = new TaskManager(config, storage);

// Transport
const transportManager = new TransportManager(config, logger, serverFactory);
```

### What gets deleted

The entire `src/container/` directory:

| File | Purpose | Replacement |
|:-----|:--------|:------------|
| `core/container.ts` | `Container` class, `Token<T>`, `token()` | Direct construction in `createApp()` |
| `core/tokens.ts` | All DI tokens (`AppConfig`, `StorageService`, etc.) | Local variables passed by reference |
| `registrations/core.ts` | `registerCoreServices()` | Inline construction in `createApp()` |
| `registrations/mcp.ts` | `registerMcpServices()` | Inline construction in `createApp()` |
| `index.ts` | `composeContainer()` barrel | `createApp()` entry point |

### Key constraint

**Service initialization timing.** `setup()` runs after core services are constructed but before registries and transport. Tool definitions access server-specific services at call time (inside `handler`) via module-level lazy accessors — not at definition time. This is already the established pattern; no code needs to change.

### Server-specific services without DI

The container's `services(container)` callback let servers register tokens. Without a container, servers use the init/accessor pattern:

```ts
// Server's service module
let _service: PubMedService | undefined;

export function initPubMedService(config: AppConfig, storage: StorageService): void {
  _service = new PubMedService(config, storage);
}

export function getPubMedService(): PubMedService {
  if (!_service) {
    throw new McpError(JsonRpcErrorCode.InitializationFailed, 'PubMedService not initialized');
  }
  return _service;
}

// Called in createApp's setup() callback
await createApp({
  tools: [...],
  setup(core) {
    initPubMedService(core.config, core.storage);
  },
});

// Consumed in tool handler at call time
handler: async (input, ctx) => {
  return getPubMedService().search(input.query);
},
```

This is the same lazy singleton pattern tools already use for config. No tokens, no indirection.

---

## Checklist

- [x] `src/container/` deleted entirely (container, tokens, registrations, barrel)
- [x] `createApp()` constructs core services directly in dependency order (via `composeServices()`)
- [x] `createApp()` applies name/version overrides before config parsing (via `resetConfig()`)
- [x] `setup()` callback runs after core services, supports async
- [x] `createMcpServerInstance` receives registries as parameters (not via container)
- [x] `TransportManager` receives dependencies as constructor params (not via container)
- [x] Server config uses lazy accessor pattern (no top-level `process.env` parsing)
- [x] Core config exposes `resetConfig()` for name/version override invalidation
