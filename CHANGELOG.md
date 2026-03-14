# Changelog

All notable changes to this project will be documented in this file.

---

## [0.1.0] - 2026-03-14

First stable pre-release of `@cyanheads/mcp-ts-core` — a framework for building MCP servers in TypeScript. Extracted from the `mcp-ts-template` template into a standalone npm package with explicit subpath exports, builder-pattern definition APIs, unified handler context, and full-stack observability.

### Highlights

- **Package identity**: `@cyanheads/mcp-ts-core` on npm, `ghcr.io/cyanheads/mcp-ts-core` on Docker.
- **Builder API**: `tool()`, `resource()`, `prompt()` builders with Zod-validated `input`/`output`/`args`, inline `auth`, and `handler(input, ctx)` signatures. Replaces the legacy `logic`/`inputSchema`/`outputSchema`/`responseFormatter`/`withToolAuth` pattern.
- **Unified `Context`**: Single handler argument providing `ctx.log`, `ctx.state`, `ctx.elicit`, `ctx.sample`, `ctx.signal`, `ctx.progress`, and `ctx.uri`.
- **`createApp()` lifecycle**: Owns OTEL init, logger, transport startup, signal handling, and graceful shutdown. Returns `ServerHandle` with `shutdown()` and `services`.
- **Cloudflare Workers**: `createWorkerHandler()` with per-request `McpServer` factory, env binding injection, and `onScheduled` support.
- **Comprehensive observability**: Every tool/resource/prompt call automatically instrumented with OTel spans, duration histograms, call/error counters, and structured completion logs. Process-level gauges (RSS, heap, uptime, event loop delay). Subsystem instrumentation for storage, auth, sessions, tasks, LLM, speech, graph, and error classification. 60+ semantic convention constants.

### Added

- **Definition builders**: `tool()`, `resource()`, `prompt()` with Zod schemas, inline `auth` scopes, `format` functions, `title` field, and `task: true` for async task tools.
- **Unified `Context` interface**: `ctx.log` (auto-correlated logging), `ctx.state` (tenant-scoped KV with generics, Zod validation, batch ops, TTL), `ctx.elicit` (user prompting), `ctx.sample` (LLM completion), `ctx.signal` (cancellation), `ctx.progress` (task progress).
- **`createApp(options)`**: Composition root accepting `tools`, `resources`, `prompts`, `setup()`, `name`, `version`. Full server lifecycle management.
- **`createWorkerHandler(options)`**: Cloudflare Workers entry point with `extraEnvBindings`, `extraObjectBindings`, `onScheduled`.
- **Subpath exports**: 25+ explicit entries — `./tools`, `./resources`, `./prompts`, `./tasks`, `./errors`, `./config`, `./auth`, `./storage`, `./storage/types`, `./utils`, `./services`, `./testing`, `./worker`.
- **`z` re-export**: `import { tool, z } from '@cyanheads/mcp-ts-core'` — no separate `zod` import needed.
- **Error factories**: `notFound()`, `validationError()`, `unauthorized()`, `forbidden()`, `conflict()`, `rateLimited()`, `timeout()`, `serviceUnavailable()`, `configurationError()`, `invalidParams()`, `invalidRequest()` — all accept `(message, data?, options?)` with `{ cause }` for error chaining.
- **Auto-error classification**: Framework catches all handler errors and classifies by type/message pattern matching — `ZodError` to `ValidationError`, HTTP status codes, common message patterns, `McpError` preserved as-is.
- **`checkScopes(ctx, scopes)`**: Dynamic scope checking for runtime-dependent auth requirements.
- **`createMockContext(options?)`**: Test utility with stubbed `log`, in-memory `state`, optional `elicit`/`sample`/`progress` mocks.
- **Auto-task tools**: `task: true` on tool definitions — framework manages task creation, background execution, progress reporting, cancellation, and result storage.
- **`GET /mcp` discovery**: Server capabilities, framework identity, auth mode, and definition counts.
- **`init` CLI**: `mcp-ts-core init [name]` scaffolds a new consumer project with templates, echo definitions, and agent protocol files.
- **Shareable configs**: `tsconfig.base.json`, `biome.json`, `vitest.config.base.ts` for consumer extension.
- **Agent skills**: 12+ skill files (`skills/`) covering `setup`, `add-tool`, `add-resource`, `add-prompt`, `add-service`, `add-provider`, `add-export`, `devcheck`, `release`, `maintenance`, `migrate-mcp-ts-template`, and API references.
- **`examples/` directory**: Complete reference consumer server with 7 tools, 2 resources, 1 prompt, and 39 tests.
- **OTel instrumentation**: Process gauges, startup/shutdown spans, resource/prompt measurement, active request gauge, storage/auth/session/task/LLM/speech/graph instrumentation, error classification metric.
- **Semantic conventions**: `src/utils/telemetry/semconv.ts` with 60+ constants for all custom OTel attributes.
- **Services**: `CoreServices` exposes `config`, `logger`, `storage`, `rateLimiter`, optional `llmProvider`, `speechService`, `supabase`.
- **`GraphService.healthCheck()`**: Liveness check delegated to the underlying graph provider.
- **Utility barrels**: Unified `./utils` and `./services` exports covering formatting, parsing, security, network, pagination, scheduling, telemetry, encoding, runtime, token counting, and type guards.

### Changed (from legacy template)

- **DI container removed**: Replaced by `createApp()` direct construction. Explicit dependency struct (`McpServerDeps`) instead of token-based resolution.
- **Definition types consolidated**: Merged `New*Definition` types into canonical `ToolDefinition`, `ResourceDefinition`, `PromptDefinition`. Single code path per primitive in registration.
- **Error handling simplified**: "Logic throws, framework catches." Handlers throw plain `Error` or use error factories. No `try/catch` needed in handlers. Framework classifies, normalizes, and returns `isError: true`.
- **Auth moved inline**: `auth: ['scope']` on definitions replaces `withToolAuth()`/`withResourceAuth()` HOF wrappers.
- **`ctx.state` accepts any serializable value**: No manual `JSON.stringify`/`JSON.parse`. Supports generic types, Zod validation, batch operations (`getMany`, `setMany`, `deleteMany`), and TTL.
- **Tenant ID defaults to `'default'`**: `ctx.state` works in stdio mode without JWT auth.
- **Build system**: `tsc` + `tsc-alias` replaces `bun build` for proper `.d.ts` generation.
- **Dependencies restructured**: Heavy deps (OTEL, Supabase, OpenAI, parsers, sanitization, scheduling) moved to optional peer dependencies with lazy dynamic `import()`. Core deps minimized.
- **Auth fail-closed**: When auth is enabled but no auth context exists, throws `Unauthorized` instead of defaulting to allowed.
- **Config immutable**: Config proxy `set()`/`defineProperty()` traps return `false` after parse.
- **Async API surface**: Parser `parse()` methods, `diffFormatter`, and `sanitization` methods are async due to lazy loading.
- **Zod modernized**: `z.url()`, `z.email()`, `z.iso.datetime()` replace string refinements.
- **`devcheck` audit**: Classifies vulnerabilities as direct vs transitive, warns instead of failing for upstream-only issues.
- **HTTP error mappings expanded**: `InvalidParams` 400, `Timeout` 504, `ServiceUnavailable` 503. Error responses include `McpError.data`.
- **Prompt registration**: Callbacks wrapped in error handling via `ErrorHandler.handleError`.
- **OpenRouter provider**: SDK-level retries (`maxRetries: 2`) with exponential backoff on 429/5xx, replacing manual retry logic.
- **`ElicitResult` type**: Updated to match actual MCP SDK shape — flat `Record<string, string | number | boolean | string[]>` content, not a discriminated union with typed `data`.
- **Speech API parameters**: TTS uses `voice: { voiceId }` / `format`, STT uses `audio` / `format`. `WhisperProvider` uses direct HTTP instead of OpenAI SDK.
- **`AuthContext` narrowed**: Removed `[key: string]: unknown` index signature — explicit fields only.
- **Agent skill documentation**: Expanded with full env var reference tables (all defaults), provider registration guides per domain, auto-classification pattern reference, vitest `mergeConfig` setup, and corrected pagination/elicitation examples.

### Removed

- **DI container** (`src/container/`): 6 source files + 5 test files.
- **Legacy definition types**: `New*` prefixed types, `isNew*Definition` type guards, `newToolHandlerFactory`, `newResourceHandlerFactory`, `newPromptDefinition` — all consolidated into canonical modules.
- **`withAuth` HOF**: `withToolAuth()`, `withResourceAuth()` — replaced by inline `auth` on definitions.
- **Template definitions from `src/`**: Moved to `examples/`. Core library ships with no built-in tools/resources/prompts.
- **Legacy READMEs**: `src/mcp-server/README.md`, `src/services/README.md`, `src/storage/README.md` — superseded by CLAUDE.md and skill files.
- **Conformance test suite**: 20 test files + 4 helpers — to be rewritten against stable API post-publish.
- **`./context` subpath export**: `Context` available from main entry point.
- **11 granular `./utils/*` subpath exports**: Replaced by single `./utils` barrel.
- **`changelog/archive.md`**: Pre-3.0.0 history.
- **`@traversable/*` devDependencies**: No longer needed after removing Zod schema compatibility tests.
- **`vite-tsconfig-paths`**: Replaced by native Vitest `resolve.tsconfigPaths`.
