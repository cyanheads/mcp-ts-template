# 04 — Dependencies

> Dependency tiers, lazy import conversion, minimal install story.

---

## Design Principle

Servers shouldn't pay for deps they never use. The package has three tiers.

### How utilities work at each level

**At runtime (ESM):** Lazy by design. If a server never uses parsers from `@cyanheads/mcp-ts-core/utils`, those lazy-loaded deps never resolve — its deps never resolve. Subpath exports enforce this.

**At bundle time (Workers):** `build:worker` runs esbuild, which tree-shakes unused exports.

**At install time — this is where it matters.** `bun install` pulls every package in `dependencies` regardless of whether the server imports the code that uses it. The tiered strategy prevents this.

---

## Tier 1: Core dependencies (always installed)

In the critical path of `createApp()`. Every server needs these.

| Package | Used By | Notes |
|:--------|:--------|:------|
| `@modelcontextprotocol/sdk` | MCP protocol, server creation | |
| `@modelcontextprotocol/ext-apps` | MCP Apps extension | Experimental — re-evaluate if still pre-stable at 1.0 |
| `hono` | HTTP transport framework | |
| `@hono/node-server` | Hono Node.js adapter | |
| `@hono/mcp` | Streamable HTTP transport | |
| `pino` | Logger | |
| `dotenv` | Config env loading | Node-only; Workers get env from bindings |
| `jose` | JWT/JWKS auth verification | |
| `@opentelemetry/api` | Trace context extraction (requestContext, errorHandler, performance) | Lightweight API surface only, not the SDK |

**Notes:**
- `pino-pretty` is currently in `dependencies` ([package.json:186](../package.json#L186)) but must be moved to `devDependencies` before extraction. The logger already loads it via dynamic `require.resolve()` with a try/catch fallback to JSON output ([logger.ts:107-112](../src/utils/internal/logger.ts#L107-L112)). Servers that want pretty dev output install it themselves; production servers never need it.
- `dotenv` is unused in Workers (env comes from CF bindings). Acceptable in Tier 1 since every Node server needs it, but the Worker entry point should not import it.

**Current `package.json` bugs to fix before extraction:**
- `@hono/mcp` is in `devDependencies` ([package.json:83](../package.json#L83)) but is required at runtime by the HTTP transport. Must move to `dependencies`.
- `diff` is only in `devDependencies` ([package.json:99](../package.json#L99)) and `resolutions` ([package.json:68](../package.json#L68)). `resolutions` pins versions but doesn't install packages — so `diff` has no runtime install path in production. Move from `devDependencies` to `dependencies`. During extraction it becomes an optional peer (Tier 3).

### `hono` as peer dependency consideration

`hono` is Tier 1 core infrastructure — core owns its version. However, downstream servers may import from `hono` directly (e.g., custom middleware for the HTTP transport). Since core re-exports the Hono app from `createHttpApp()`, servers extending it need compatible types. Decision: **keep `hono` as a core dependency only, not a peer.** Servers that need direct Hono imports should use the version core provides. If version conflicts arise in practice, promote to peer in a minor release.

## Tier 2: Required peer dependency

| Package | Rationale |
|:--------|:----------|
| `zod` | Servers use Zod directly for tool/resource schemas. Must share the same Zod instance for `.parse()` compatibility. |

## Tier 3: Optional peer dependencies (install what you use)

`peerDependencies` with `"optional": true` in `peerDependenciesMeta`. Core's utility code uses lazy dynamic `import()` — if the dep isn't installed, the import throws a clear error message telling the server author what to install.

### Telemetry (enable with `OTEL_ENABLED=true`)

| Package | Used By |
|:--------|:--------|
| `@opentelemetry/sdk-node` | OTEL SDK initialization |
| `@opentelemetry/sdk-trace-node` | Trace exporter |
| `@opentelemetry/sdk-metrics` | Metrics exporter |
| `@opentelemetry/resources` | Resource attributes |
| `@opentelemetry/exporter-trace-otlp-http` | OTLP trace export |
| `@opentelemetry/exporter-metrics-otlp-http` | OTLP metrics export |
| `@opentelemetry/auto-instrumentations-node` | Auto-instrumentation |
| `@opentelemetry/instrumentation-pino` | Pino log correlation |
| `@opentelemetry/semantic-conventions` | Standard attributes |
| `@hono/otel` | HTTP instrumentation middleware. Currently a static import in `httpTransport.ts` but only used behind `if (config.openTelemetry.enabled)` — the import itself runs unconditionally. Lazy conversion requires restructuring: dynamic `import()` inside the `if` block, not just replacing the top-level import. |

### Parsing (via `@cyanheads/mcp-ts-core/utils`)

| Package | Used By |
|:--------|:--------|
| `js-yaml` | `yamlParser` |
| `fast-xml-parser` | `xmlParser` |
| `papaparse` | `csvParser` |
| `partial-json` | `jsonParser` (streaming/partial parse) |
| `unpdf`, `pdf-lib` | `pdfParser` |
| `chrono-node` | `dateParser` |

### Formatting

| Package | Used By |
|:--------|:--------|
| `diff` | `diffFormatter` |

### Security

| Package | Used By |
|:--------|:--------|
| `sanitize-html` | `sanitization` utility |
| `validator` | `sanitization` utility |

### Scheduling

| Package | Used By |
|:--------|:--------|
| `node-cron` | `scheduler` (already lazy) |

### Storage

| Package | Used By |
|:--------|:--------|
| `@supabase/supabase-js` | Supabase storage provider |

### Services

| Package | Used By |
|:--------|:--------|
| `openai` | OpenRouter LLM provider, Whisper STT provider |

---

## Storage & Service Providers in Core

Storage providers (`in-memory`, `filesystem`, `supabase`, `cloudflare-*`) and service providers (`openrouter.provider.ts`) ship in the core package even though their heavy deps (`@supabase/supabase-js`, `openai`) are Tier 3 optional peers. The provider **code** is always present but the **deps** are only required if the server configures that provider. This is intentional:

- Splitting providers into separate packages adds coordination overhead with no real benefit
- The lazy import pattern means the code is inert until activated by config
- The serverless whitelist already gates which providers load in Workers

Service **interfaces** (`ILlmProvider`, `ISpeechProvider`, `IGraphProvider`) are deferred — they remain in downstream servers until shared by 2+ servers (see [10-decisions.md](10-decisions.md) #1).

---

## What a minimal server installs

```json
{
  "dependencies": {
    "@cyanheads/mcp-ts-core": "^1.0.0",
    "zod": "^4.3.0"
  }
}
```

Zod minimum is `4.3.0` — the version the codebase is tested against. The `^4.0.0` range is too broad; earlier Zod 4 releases had API churn.

No OTEL, no parsers, no Supabase, no OpenAI. Add deps as you add features:

```json
{
  "dependencies": {
    "@cyanheads/mcp-ts-core": "^1.0.0",
    "zod": "^4.3.0",
    "js-yaml": "^4.1.0",
    "sanitize-html": "^2.17.0",
    "validator": "^13.15.0"
  }
}
```

---

## Lazy Import Pattern

Applied to all Tier 3 deps:

```ts
// Example: yamlParser.ts — only runs if someone imports this module
let yaml: typeof import('js-yaml') | undefined;

export async function parseYaml(input: string) {
  yaml ??= await import('js-yaml').catch(() => {
    throw new McpError(
      JsonRpcErrorCode.ConfigurationError,
      'Install "js-yaml" to use YAML parsing: bun add js-yaml',
    );
  });
  return yaml.load(input) as unknown;
}
```

### Already lazy

- `node-cron` (scheduler)
- OTEL SDK packages (instrumentation.ts)

### Needs conversion (see [08-pre-extraction.md](08-pre-extraction.md))

| File | Static dep to make lazy |
|:-----|:------------------------|
| `yamlParser.ts` | `js-yaml` |
| `xmlParser.ts` | `fast-xml-parser` |
| `csvParser.ts` | `papaparse` |
| `jsonParser.ts` | `partial-json` |
| `pdfParser.ts` | `unpdf`, `pdf-lib` |
| `dateParser.ts` | `chrono-node` |
| `diffFormatter.ts` | `diff` |
| `sanitization.ts` | `sanitize-html`, `validator` |
| `httpTransport.ts` | `@hono/otel` (conditional on OTEL enabled) |
| `openrouter.provider.ts` | `openai` |
| `core.ts` (registrations) | `@supabase/supabase-js` |

---

## Checklist

- [x] `@hono/mcp` in `dependencies`
- [x] `diff` moved to optional `peerDependencies`
- [x] `package.json` reorganized: Tier 1 in `dependencies`, Tier 2 in `peerDependencies` (`"zod": "^4.3.6"`), Tier 3 in `peerDependencies` + `peerDependenciesMeta` optional
- [x] All Tier 3 static imports converted to lazy dynamic `import()` with cached module ref (Phase 2)
- [x] Each lazy import throws `McpError(ConfigurationError)` with install instruction on missing dep (Phase 2)
- [x] `pino-pretty` moved from `dependencies` to `devDependencies` (Phase 1a)
- [x] `@opentelemetry/api` stays in Tier 1 (lightweight API surface)
- [x] Full OTEL SDK stays in Tier 3 (already dynamically imported)
- [x] `@hono/otel` lazy conversion uses dynamic `import()` inside the OTEL-enabled guard (Phase 2)
