---
name: api-workers
description: >
  Cloudflare Workers deployment using `createWorkerHandler` from `@cyanheads/mcp-ts-core/worker`. Covers the full handler signature, binding types, CloudflareBindings extensibility, runtime compatibility guards, and wrangler.toml requirements.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
  type: reference
---

## Overview

`@cyanheads/mcp-ts-core/worker` exports `createWorkerHandler` — the Workers entry point. It wraps tool/resource/prompt registries into a per-request `McpServer` factory that integrates with the Cloudflare Workers runtime.

---

## `createWorkerHandler(options)`

```ts
import { createWorkerHandler } from '@cyanheads/mcp-ts-core/worker';
import { allToolDefinitions } from './mcp-server/tools/index.js';
import { allResourceDefinitions } from './mcp-server/resources/index.js';
import { allPromptDefinitions } from './mcp-server/prompts/index.js';
import { initMyService } from './services/my-domain/my-service.js';

export default createWorkerHandler({
  tools: allToolDefinitions,
  resources: allResourceDefinitions,
  prompts: allPromptDefinitions,
  setup(core) {
    initMyService(core.config, core.storage);
  },
  extraEnvBindings: [['MY_API_KEY', 'MY_API_KEY']],
  extraObjectBindings: [['MY_CUSTOM_KV', 'MY_CUSTOM_KV']],
  onScheduled: async (controller, env, ctx) => {
    // Cloudflare cron trigger handler
  },
});
```

### Options

| Option | Type | Purpose |
|:-------|:-----|:--------|
| `tools` | `AnyToolDefinition[]` | Tool definitions to register |
| `resources` | `AnyResourceDefinition[]` | Resource definitions to register |
| `prompts` | `PromptDefinition[]` | Prompt definitions to register |
| `setup` | `(core: CoreServices) => void \| Promise<void>` | Runs after core services are ready, before first request |
| `extraEnvBindings` | `[bindingKey: string, processEnvKey: string][]` | Maps CF string bindings to `process.env` keys |
| `extraObjectBindings` | `[bindingKey: string, globalKey: string][]` | Maps CF object bindings (KV, R2, D1, AI) to `globalThis` keys |
| `onScheduled` | `(controller, env, ctx) => Promise<void>` | Cloudflare cron trigger handler |

### Key design points

- **Per-request `McpServer` factory** — a new server instance is created for each request. Required by SDK security advisory GHSA-345p-7cg4-v4c7.
- **Env bindings refreshed per-request** — Cloudflare may rotate binding object references between requests; the handler re-injects them on every call.
- **`ctx.waitUntil()` is documented but not yet called by the framework** — the `ExecutionContext` is received and passed through to `app.fetch` and `onScheduled`, but the framework itself does not currently call `ctx.waitUntil()` for telemetry flush. Spans complete synchronously within the request lifecycle.
- **Singleton app promise with retry-on-failure** — the framework init runs once; if it fails, the next request retries rather than leaving the Worker in a permanently broken state.

---

## Binding types

Cloudflare Workers bindings come in two kinds with different injection mechanisms:

| Type | Examples | Injection mechanism | Runtime access |
|:-----|:---------|:--------------------|:---------------|
| String values | API keys, base URLs, feature flags | `injectEnvVars()` → `process.env` | `process.env.MY_API_KEY` |
| Object bindings | KV namespace, R2 bucket, D1 database, AI | `storeBindings()` → `globalThis` | `(globalThis as any).MY_CUSTOM_KV` |

**`extraEnvBindings`** — array of `[bindingKey, processEnvKey]` tuples. The value of `env[bindingKey]` is assigned to `process.env[processEnvKey]` at request time.

**`extraObjectBindings`** — array of `[bindingKey, globalKey]` tuples. The object at `env[bindingKey]` is stored on `globalThis[globalKey]` at request time.

Both are refreshed on every request. Never cache binding references between requests.

---

## `CloudflareBindings` extensibility

Core defines `CloudflareBindings` without an index signature, so servers extend it via intersection rather than module augmentation:

```ts
import type { CloudflareBindings as CoreBindings } from '@cyanheads/mcp-ts-core/worker';

interface MyBindings extends CoreBindings {
  MY_CUSTOM_KV: KVNamespace;
  MY_R2_BUCKET: R2Bucket;
}
```

Pass `MyBindings` as a type parameter where the framework accepts a generic env type (e.g., Hono route handlers, `onScheduled`).

---

## Runtime compatibility

### `runtimeCaps` feature detection

```ts
import { runtimeCaps } from '@cyanheads/mcp-ts-core/utils';

if (runtimeCaps.isWorkerLike) {
  // Workers-specific path
}

if (runtimeCaps.isNode) {
  // Node.js-specific path (e.g., filesystem access)
}
```

`runtimeCaps` is a snapshot taken at import time. Fields: `isNode`, `isBun`, `isWorkerLike`, `isBrowserLike`, `hasProcess`, `hasBuffer`, `hasTextEncoder`, `hasPerformanceNow`. All booleans, never throw.

### Serverless storage whitelist

In Workers, only these storage providers are allowed:

| Provider | Notes |
|:---------|:------|
| `in-memory` | Default — data lost on cold start, no persistence |
| `cloudflare-kv` | KV namespace binding — eventually consistent |
| `cloudflare-r2` | R2 bucket binding — object storage |
| `cloudflare-d1` | D1 database binding — SQLite-compatible |

`filesystem` and `supabase` providers are not on the whitelist. In a serverless environment, any non-whitelisted provider type is **silently forced to `in-memory`** (a warning is logged) rather than throwing. Set `STORAGE_PROVIDER_TYPE` to one of the whitelisted values to avoid the fallback.

---

## `wrangler.toml` requirements

```toml
compatibility_flags = ["nodejs_compat"]
compatibility_date = "2025-09-01"  # must be >= 2025-09-01

[[kv_namespaces]]
binding = "MY_CUSTOM_KV"
id = "..."

[[r2_buckets]]
binding = "MY_R2_BUCKET"
bucket_name = "..."
```

`nodejs_compat` is required for Node.js API shims (e.g., `process.env`, `Buffer`, `crypto`). The minimum `compatibility_date` activates the required shim set.

---

## Workers-specific warnings

**Lazy env parsing is mandatory.** Cloudflare injects env bindings at request time via `injectEnvVars()` — after all static module imports complete. Never parse `process.env` at module top-level in Workers:

```ts
// WRONG — parsed before env is injected
const apiKey = process.env.MY_API_KEY;  // undefined in Workers

// CORRECT — lazy parse inside a function or getter
export function getServerConfig() {
  return ServerConfigSchema.parse({ apiKey: process.env.MY_API_KEY });
}
```

**`in-memory` storage is volatile.** Data stored with the `in-memory` provider is lost between cold starts and is not shared across Worker instances. Use `cloudflare-kv`, `cloudflare-r2`, or `cloudflare-d1` for any state that must persist or be shared.

**Node-only utilities throw in Workers.** `scheduler` (`node-cron`), `sanitizePath` (fs-based), and `filesystem` storage provider all throw `ConfigurationError` when called from a Worker. Guard with `runtimeCaps.isNode` or avoid entirely.
