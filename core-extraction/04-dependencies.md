# 04 — Dependencies

> Dependency tiers, lazy import conversion, minimal install story.

---

## Design Principle

Servers shouldn't pay for deps they never use. The package has three tiers.

### How utilities work at each level

**At runtime (ESM):** Lazy by design. If a server never imports `@cyanheads/mcp-ts-core/utils/parsing`, that module never executes — its deps never resolve. Subpath exports enforce this.

**At bundle time (Workers):** `build:worker` runs esbuild, which tree-shakes unused exports.

**At install time — this is where it matters.** `bun install` pulls every package in `dependencies` regardless of whether the server imports the code that uses it. The tiered strategy prevents this.

---

## Tier 1: Core dependencies (always installed)

In the critical path of `bootstrap()`. Every server needs these.

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
- `pino-pretty` is a dev/debug dependency, not Tier 1. Make it optional peer or `devDependency` only.
- `dotenv` is unused in Workers (env comes from CF bindings). Acceptable in Tier 1 since every Node server needs it, but the Worker entry point should not import it.

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
| `@hono/otel` | HTTP instrumentation middleware |

### Parsing (`@cyanheads/mcp-ts-core/utils/parsing`)

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

## What a minimal server installs

```json
{
  "dependencies": {
    "@cyanheads/mcp-ts-core": "^1.0.0",
    "zod": "^4.0.0"
  }
}
```

No OTEL, no parsers, no Supabase, no OpenAI. Add deps as you add features:

```json
{
  "dependencies": {
    "@cyanheads/mcp-ts-core": "^1.0.0",
    "zod": "^4.0.0",
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

- [ ] `package.json` reorganized: Tier 1 in `dependencies`, Tier 2 in `peerDependencies`, Tier 3 in `peerDependencies` + `peerDependenciesMeta` optional
- [ ] All Tier 3 static imports converted to lazy dynamic `import()` with cached module ref
- [ ] Each lazy import throws `McpError(ConfigurationError)` with install instruction on missing dep
- [ ] `pino-pretty` moved out of `dependencies` (devDependency or optional peer)
- [ ] `@opentelemetry/api` stays in Tier 1 (lightweight API surface)
- [ ] Full OTEL SDK stays in Tier 3 (already dynamically imported)
