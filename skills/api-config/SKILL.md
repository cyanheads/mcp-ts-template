---
name: api-config
description: >
  Reference for core and server configuration in `@cyanheads/mcp-ts-core`. Covers env var tables, priority order, server-specific Zod schema pattern, and Workers lazy-parsing requirement.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
---

## Overview

Configuration has two layers: **core config** (managed by the framework, env-driven) and **server config** (your own Zod schema for domain-specific env vars). Never merge them.

Import: `AppConfig`, `parseConfig` from `@cyanheads/mcp-ts-core/config`.

---

## Core Config

Managed by `@cyanheads/mcp-ts-core`. Validated via Zod from environment variables.

**Priority (highest to lowest):**

1. `name`/`version` overrides passed to `createApp()` or `createWorkerHandler()`
2. Environment variables
3. `package.json` fields

| Category | Key Variables |
|:---------|:-------------|
| Transport | `MCP_TRANSPORT_TYPE` (`stdio`\|`http`), `MCP_HTTP_PORT`, `MCP_HTTP_HOST`, `MCP_HTTP_ENDPOINT_PATH` |
| Auth | `MCP_AUTH_MODE` (`none`\|`jwt`\|`oauth`), `MCP_AUTH_SECRET_KEY`, `OAUTH_*` |
| Storage | `STORAGE_PROVIDER_TYPE` (`in-memory`\|`filesystem`\|`supabase`\|`cloudflare-r2`\|`cloudflare-kv`\|`cloudflare-d1`) |
| LLM | `OPENROUTER_API_KEY`, `OPENROUTER_APP_URL/NAME`, `LLM_DEFAULT_*` |
| Telemetry | `OTEL_ENABLED`, `OTEL_SERVICE_NAME/VERSION`, `OTEL_EXPORTER_OTLP_*` |

---

## Server Config (Separate Schema)

Servers define their own Zod schema for domain-specific env vars. **Never merge with core's schema.**

Use the lazy init/accessor pattern — do not parse `process.env` at module top-level.

```ts
// src/config/server-config.ts
import { z } from 'zod';

const ServerConfigSchema = z.object({
  myApiKey: z.string().describe('External API key'),
  maxResults: z.coerce.number().default(100),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

let _config: ServerConfig | undefined;

export function getServerConfig(): ServerConfig {
  _config ??= ServerConfigSchema.parse({
    myApiKey: process.env.MY_API_KEY,
    maxResults: process.env.MY_MAX_RESULTS,
  });
  return _config;
}
```

**Workers warning:** Do not eagerly parse `process.env` at module top-level. In Workers, env bindings are injected at request time via `injectEnvVars()` — after all static imports. Lazy parsing is mandatory for Worker compatibility.
