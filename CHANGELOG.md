# Changelog

All notable changes to this project will be documented in this file.

For changelog details prior to version 3.0.0, please refer to the [changelog/archive.md](changelog/archive.md) file.

---

## [3.0.8] - 2026-03-09

### Fixed

- **Prompt registration**: Made `PromptRegistry.registerAll` async so `ErrorHandler.tryCatch` errors are properly awaited. Moved into `Promise.all` alongside tool and resource registration for parallel startup.
- **Task list visibility**: Session-bound tasks are now hidden from callers without a `sessionId`. Previously only filtered when the caller had a *different* session, leaking task existence to unauthenticated list requests.
- **HTTP transport test**: Replaced hardcoded port 9999 with OS-assigned port (`:0`) to avoid collisions with other processes.
- **Fuzz test types**: Added cast to fix `zxTest.fuzz` return type incompatibility with `fast-check` ^4.6.0.

### Changed

- **Data Explorer response formatter**: Now emits two content blocks — a JSON blob (for MCP Apps UI `loadData`) and a human-readable table (for non-app hosts / LLM context).
- **OpenRouter provider**: `_prepareApiParameters` now propagates `top_k` and `min_p` defaults when not explicitly set in params.
- **Dependencies**: Bumped `@cloudflare/workers-types` ^4.20260305.1→^4.20260307.1, `@types/sanitize-html` ^2.16.0→^2.16.1, `fast-check` ^4.5.3→^4.6.0, `@modelcontextprotocol/ext-apps` ^1.1.2→^1.2.0, `@supabase/supabase-js` ^2.98.0→^2.99.0, `jose` ^6.2.0→^6.2.1.

### Added

- **Type-satisfaction tests**: Replaced TODO stubs with real tests for `PromptDefinition`, `ResourceDefinition`, `ILlmProvider`, speech service types, Supabase types, and error handler types.
- **Task store test**: Coverage for session-bound task hiding from callers without a sessionId.
- **CLAUDE.md**: Added Code Navigation section with LSP-vs-Grep decision table.

### Removed

- Deleted barrel-export stub tests (`tests/services/speech/index.test.ts`, `tests/utils/internal/error-handler/index.test.ts`).

---

## [3.0.7] - 2026-03-09

### Fixed

- **Tool error responses**: Removed `structuredContent` from error results in `toolHandlerFactory`. Per MCP spec, `structuredContent` is reserved for successful structured output tied to `outputSchema`, not error details. Errors now return only `content` with `isError: true`.

---

## [3.0.6] - 2026-03-05

### Fixed

- **HTTP CORS credentials**: `Access-Control-Allow-Credentials: true` with wildcard origin is invalid per Fetch spec — browsers reject the preflight. Now only sets credentials when origin is explicitly configured.
- **HTTP session minting**: Sessions were allocated before the SDK processed the request, wasting resources on requests that fail protocol validation. Deferred session creation until after a successful response.
- **HTTP transport shutdown**: `SessionStore` cleanup interval was not cleared on server stop, leaking timers.

### Changed

- **Config module**: Replaced eager `parseConfig()` at module load with a lazy `Proxy` that defers parsing until first property access. Critical for Cloudflare Workers where env vars are injected at request time after ESM imports evaluate. Added `resetConfig()` for test isolation.
- **HTTP transport API**: `createHttpApp` now returns `{ app, sessionStore }`. `startHttpTransport` returns `HttpTransportHandle` with a `stop()` method that encapsulates cleanup.
- **Dependencies**: Bumped `@biomejs/biome` 2.4.5→2.4.6, `@types/node` ^25.3.3→^25.3.5, `jose` ^6.1.3→^6.2.0, `openai` ^6.25.0→^6.27.0.

### Added

- **Output schema coverage tests**: Validates that tool output schemas cover all fields returned by logic at runtime using `schema.strict().parse()`. Catches silent field stripping that causes strict clients to reject responses.
- **HTTP transport tests**: Unskipped and implemented previously-skipped tests for stateful session management, wildcard CORS, and DELETE handling. Added `withConfigOverrides` test helper.

---

## [3.0.5] - 2026-03-04

### Fixed

- **Config path resolution**: Replaced `URL`-based path derivation with proper `node:path` utilities (`fileURLToPath`, `dirname`, `join`, `isAbsolute`) for cross-runtime compatibility.

### Changed

- **OpenTelemetry on Bun**: Removed `!runtimeCaps.isBun` guard from `canUseNodeSDK()`. Auto-instrumentations that rely on Node http hooks silently no-op on Bun, but manual spans, custom metrics, and OTLP export all work correctly.
- **Dependencies**: Pinned all `latest` specifiers in `bun.lock` to exact versions. Bumped `hono` 4.12.3→4.12.5 and `@hono/node-server` 1.19.9→1.19.11.

---

## [3.0.4] - 2026-03-04

### Fixed

- **Data Explorer app resource**: Switched CDN from `esm.sh` to `unpkg.com` for `@modelcontextprotocol/ext-apps` import. Fixed `sendMessage` content format from single object to array. Added CSP `_meta.ui.csp.resource_domains` to whitelist the CDN for MCP Apps-capable hosts.

---

## [3.0.3] - 2026-03-04

### Fixed

- **Task tool client compatibility**: Changed `template_async_countdown` from `taskSupport: 'required'` to `'optional'` so the tool works with clients that don't advertise Tasks API support (currently all major clients). Updated description to reflect dual-mode behavior.
- **MCP Apps host detection**: Added flat `_meta["ui/resourceUri"]` key alongside nested `_meta.ui.resourceUri` on `template_data_explorer`, matching the format `registerAppTool` from `@modelcontextprotocol/ext-apps` produces. Hosts like Claude Desktop that look for the flat key can now discover the linked UI resource.

### Changed

- **README**: Added public demo instance callout and streamable-http client configuration example.

---

## [3.0.2] - 2026-03-04

### Fixed

- **HTTP transport SSE stream abort**: Per-request server was closed in a `finally` block after `handleRequest()`, which aborted SSE `ReadableStream` responses before Hono could consume them — producing empty-message errors on the client. Moved transport close to the error path only.

### Changed

- **Biome**: Bumped schema version from 2.4.4 to 2.4.5.

---

## [3.0.1] - 2026-03-04

### Fixed

- **`devMcpAuthBypass` config coercion**: `z.coerce.boolean()` treated any non-empty string (including `"false"`, `"0"`, `"no"`) as `true`. Replaced with explicit string comparison so only `"true"` and `"1"` enable the bypass.
- **`fetchWithTimeout` abort disambiguation**: Timeout aborts and external signal aborts (e.g., client disconnect) were indistinguishable — both threw `McpError(Timeout)`. Added a sentinel value to the internal `AbortController` so timeouts throw `Timeout` while external aborts throw `InternalError` with `errorSource: 'FetchAborted'`.

### Changed

- **Dockerfile**: Removed platform-specific `@oven` and `@rollup` binaries from the production image — pulled as `optionalDependencies` by `@modelcontextprotocol/ext-apps` but only needed for its build toolchain, not runtime.
- **`docs/tree.md`**: Refreshed directory tree to reflect 3.0.0 file additions and removals.

---

## [3.0.0] - 2026-02-28

### Breaking Changes

- **Replaced ESLint + Prettier with Biome**: Unified linting and formatting under [Biome 2.4.4](https://biomejs.dev/). Removed `eslint`, `prettier`, `typescript-eslint`, and `globals` dev dependencies. Removed `.prettierignore`, `.prettierrc.json`, and `eslint.config.js` config files. Added `biome.json` with equivalent rules, import sorting, and interface member sorting.
- **Removed barrel `index.ts` files**: Deleted 22 barrel re-export files across `src/` (utils, services, storage, transports, tasks, tools). All imports now reference the defining file directly (e.g. `@/utils/internal/logger.js` instead of `@/utils/index.js`). Barrel files remain only at aggregation points (`tools/definitions/index.ts`, `resources/definitions/index.ts`, `prompts/definitions/index.ts`, `container/index.ts`, `config/index.ts`).
- **JWT auth bypass requires explicit opt-in**: Dev-mode JWT auth bypass no longer activates implicitly in non-production environments. Non-production deployments that omit `MCP_AUTH_SECRET_KEY` must now set `DEV_MCP_AUTH_BYPASS=true` to retain bypass behavior. Production deployments (which already required the secret key) are unaffected.
- **Elicitation response shape**: `elicitAndValidate` in `template-madlibs-elicitation.tool.ts` updated to expect `{ action: 'accept' | 'decline' | 'cancel', content: { value: string } }` instead of flat `{ value: string }`, matching the actual MCP SDK elicitation API. Decline/cancel actions now throw `McpError(InvalidRequest)`.

### Changed

- **`requestContext.ts`**: Extracted `extractTenantId` helper to replace three verbose tenant ID extraction blocks with `as` casts. Removed dead code: `ContextConfig` interface, `OperationContext` interface, `configure()`, and `getConfig()` methods (stored config was never consumed). Added index signature to `CreateRequestContextParams` for ad-hoc properties. `createRequestContext()` now strips `requestId` and `timestamp` from `additionalContext` to prevent callers from accidentally overwriting generated correlation IDs.
- **`logger.ts`**: Extracted `logWithError` private helper to deduplicate dispatch logic across `error`, `crit`, `alert`, and `emerg` methods. Changed `||` to `??` for `mcpToPinoLevel` lookups (4 sites).
- **`performance.ts`**: Renamed `initializePerformance_Hrt` to `initHighResTimer`. Extracted `getMemoryUsage` helper to deduplicate inline memory usage fallback. Removed unnecessary optional chain on confirmed non-null `perf` reference. Simplified `toBytes` by removing intermediate variable. Added optional `perfLoader` parameter to `initHighResTimer` for testability. Default remains `loadPerfHooks`, so all callers are unaffected. Fixes ESM self-call mocking limitation in vitest.
- **`encoding.ts`**: Replaced loop string concatenation with `String.fromCharCode(...bytes)` spread, removed unnecessary `as number` cast on `Uint8Array` element access. `arrayBufferToBase64` now chunked in 32 KB blocks to avoid stack overflow on large buffers in browser/Worker environments. `base64ToString` optimized to avoid intermediate array allocation from `split('')`.
- **`startupBanner.ts`**: Added `typeof process` guard to prevent crash in Cloudflare Workers where `process.stdout` may not exist.
- **`server.ts`**: Removed unused `requestContextService.configure()` call. Parallelized registry resolution and capability registration — all four registry instances resolved at once via array destructuring, tool and resource `registerAll` calls run concurrently with `Promise.all`. Fixed `logger.error` call to use the structured `(message, Error, context)` three-argument signature instead of spreading error fields into the context object.
- **`devcheck.ts`**: Merged separate ESLint and Prettier check steps into a single Biome check. Removed `FORMAT_EXTS` and the `getTargets()` helper (Biome handles file targeting via its own `includes` config). Husky hook mode still filters staged files for Biome.
- **`package.json` scripts**: `lint` now runs `biome check`, `format` now runs `biome check --write --unsafe`. Added `test:all` convenience script.
- **Codebase reformatted**: All 260 source, test, and script files reformatted by Biome. Key formatting differences from Prettier: sorted imports, sorted interface/type members, template literal preference over string concatenation, tighter line wrapping at 100 columns.
- **Import convention**: All ~160 source and test files migrated from barrel imports to direct file imports. `src/utils/pagination/index.ts` renamed to `src/utils/pagination/pagination.ts`.
- **CLAUDE.md**: Updated import guidelines, documented direct-import convention and allowed barrel files, refined context object docs. Expanded pre-commit checklist with Zod schema, JSDoc, tenantId, naming convention, task tool, pagination, and secrets items. Fixed `bun test`→`bun run test` and `bun devcheck`→`bun run devcheck` commands.
- **Changelog archives**: Consolidated `changelog/archive1.md` and `changelog/archive2.md` into single `changelog/archive.md`.
- **Formatting utilities** (`src/utils/formatting/`):
  - `markdownBuilder`: Added `emoji` param to `h4()` for consistency with `h1`–`h3`. Fixed `section()` unsafe cast with proper overload signatures.
  - `diffFormatter`: Implemented `formatInline` (was a no-op returning raw patch). Removed trivial `isEqual()` method. Removed redundant `splitLines` method. Consolidated `getStats()` to single reduce pass. Fixed `error as Error` casts with proper `instanceof` narrowing.
  - `tableFormatter`: Implemented `bold` header style (was silently ignored). Added markdown alignment separators (`:---`, `---:`, `:---:`). Fixed truncation edge case for narrow columns. Removed redundant type cast.
  - `treeFormatter`: Extracted `ResolvedTreeOptions` type alias (was repeated 4×). Fixed ASCII style to distinguish last child (`\--`) from non-last (`+--`). Fixed `getChildPrefix` to handle non-space indent characters.
  - All formatters: Fixed JSDoc examples from barrel imports to direct imports. Fixed error narrowing in catch blocks.
- **Error handler** (`src/utils/internal/error-handler/`):
  - Removed ~890 lines of unused speculative infrastructure: `Result` type and Railway helpers (`tryAsResult`, `mapResult`, `flatMapResult`, `recoverResult`), retry logic (`tryCatchWithRetry`, `createExponentialBackoffStrategy`, `ErrorRecoveryStrategy`), breadcrumb tracking (`addBreadcrumb`, `ErrorBreadcrumb`, `ErrorMetadata`, `EnhancedErrorContext`), `ErrorSeverity` const/type, `createSafeRegex` wrapper, and `serializeErrorCauseChain`.
  - Made `COMMON_ERROR_PATTERNS` and `PROVIDER_ERROR_PATTERNS` non-exported (private to module); only pre-compiled versions are public.
  - Fixed `tryCatch` double-throw: now calls `handleError` with `rethrow: false` and throws the returned error explicitly.
  - Guarded cause chain extraction behind `error.cause` check to avoid unnecessary allocation on the common path.
- **Auth middleware & strategies** (`src/mcp-server/transports/auth/`):
  - Extracted shared `buildAuthInfoFromClaims` and `handleJoseVerifyError` into new `lib/claimParser.ts`, eliminating duplicated claim-parsing and jose-error-handling logic across JWT and OAuth strategies.
  - Simplified `authMiddleware.ts`: removed unnecessary `try/catch` wrapper — strategy errors propagate directly to the HTTP error handler.
  - Updated `authTypes.ts` JSDoc for `SdkAuthInfo`.
  - Simplified JWT and OAuth strategy catch blocks to log + delegate to `handleJoseVerifyError`.
  - **`jwtStrategy.ts`**: Removed implicit environment-based dev bypass — JWT bypass now requires explicit `devMcpAuthBypass` config flag. Removed unused `env` instance field. Dev bypass warning log now includes the current environment name for easier audit trail.
- **HTTP transport** (`src/mcp-server/transports/http/`):
  - Fixed MCP Spec 2025-06-18 compliance: `GET /mcp` with `Accept: text/event-stream` now falls through to the transport handler for SSE streams instead of unconditionally returning server info JSON.
  - Fixed unsafe `(handledError as McpError).code` cast in `httpErrorHandler.ts` — `errorCode` is now computed once before the status-mapping switch and reused in both the switch and the log.
  - Removed dead `HonoVariables` type from `httpTypes.ts` (never used in production code).
  - Simplified `httpTransport.ts`: removed redundant `authContext.run(store, handleRpc)` re-entry (ALS already propagates from middleware); compacted `SessionIdentity` construction with `Object.fromEntries` filter. Per-request MCP server instances now closed in a `finally` block (was error-path-only), fixing a resource leak on successful stateless HTTP requests. Session termination (`DELETE /mcp`) now validates session ownership before allowing termination, preventing cross-session termination attacks.
  - Deduplicated `requestContextService.createRequestContext()` calls in `sessionStore.isValidForIdentity` with a lazy `warn()` closure.
  - Extracted RFC 9728 Protected Resource Metadata handler from `httpTransport.ts` into `protectedResourceMetadata.ts`. The `/.well-known/oauth-protected-resource` endpoint is now always mounted and always returns 200 — oauth mode includes `authorization_servers` and signing algorithms; jwt/none modes return a minimal resource identifier only. Unconditional mounting ensures the `resource_metadata` URL referenced in WWW-Authenticate is always resolvable.
  - Updated `httpErrorHandler.ts`: WWW-Authenticate header is now unconditionally included on 401 responses regardless of auth mode, since the metadata endpoint is always available. Simplified header construction to a single `c.header()` call (removed intermediate array join).
- **Transport manager** (`src/mcp-server/transports/manager.ts`):
  - Fixed relative imports to `@/` path aliases.
  - Replaced `as ServerType` / `as McpServer` casts in `stop()` with a typed `shutdown` closure stored during `start()`.
  - `stop()` now calls `TaskManager.cleanup()` to clear task manager timers, enabling clean process exit without hanging event loop references.
- **Unsafe `as Error` casts**: Replaced `error as Error` and `reason as Error` casts with proper `instanceof Error ? error : new Error(String(error))` narrowing across `index.ts` (3 sites), all five parsers (`frontmatterParser`, `jsonParser`, `pdfParser`, `xmlParser`, `yamlParser`), `scheduler.ts`, and `openrouter.provider.ts`.
- **Nullish coalescing**: Changed `||` to `??` for default value assignments in `openrouter.provider.ts` (3 sites), `elevenlabs.provider.ts` (6 sites), `whisper.provider.ts` (4 sites), and `rateLimiter.ts` (`maxTrackedKeys` fallback) to correctly handle empty-string and zero values.
- **`tool-registration.ts`**: Replaced imperative for-loop tool/task-tool separation with `filter()` predicate calls — `isTaskToolDefinition` used as a type predicate directly in `filter`, removing the manual push loop.
- **`template-async-countdown.task-tool.ts`**: Added `.default(false)` to the `simulateFailure` Zod schema field, eliminating the `?? false` null-coalescing at the call site.
- **`template-echo-message.tool.ts`**: Simplified error object construction using spread syntax. Removed intermediate `response` variable (return directly). Removed verbose before/after JSDoc example blocks from `responseFormatter` — examples belong in the module README, not inline JSDoc.
- **`template-image-test.tool.ts`**: Fixed typo in annotation JSDoc comment (`e.e.,` → `e.g.,`). Removed stale comment about API response validation.
- **`toolHandlerFactory.ts`**: Replaced unsafe `as McpError` cast with `instanceof McpError` check and proper fallback construction. Changed `McpError` from type-only to value import. Replaced hardcoded `-32603` error code with `JsonRpcErrorCode.InternalError`. Added defense-in-depth input validation — tool handler now re-parses input against the tool's Zod schema before calling logic, catching any SDK parsing gaps. `inputSchema` parameter (previously unused at runtime) is now active.
- **`fileSystemProvider.ts`**: Replaced verbose ENOENT detection (`instanceof Error && 'code' in error && (error as { code: string }).code`) with `isErrorWithCode()` type guard from `@/utils/types/guards.js` (2 sites).
- **`prompt-registration.ts`**: Wrapped `server.registerPrompt()` calls in `ErrorHandler.tryCatch` with `InitializationFailed` error code for structured error reporting during startup.
- **`worker.ts`**: Replaced local `ValidLogLevel` type with canonical `McpLogLevel` import from logger module. Removed stale `ctx.waitUntil` placeholder comment. Removed `cron` property from the scheduled event log context (redundant with `scheduledTime`). 500 error responses no longer leak internal error messages — returns generic `"An internal error occurred."`.
- **Cross-runtime compatibility**:
  - `idGenerator.ts`: Replaced `node:crypto` imports (`randomBytes`, `randomUUID`) with Web Crypto API (`crypto.getRandomValues`, `crypto.randomUUID`) for Cloudflare Workers compatibility. Fixed typo in validation error message ("RANDOMLPART" → "RANDOMPART").
  - `pagination.ts`: Replaced Node-only `Buffer.from(..., 'base64url')` encoding/decoding with cross-platform `stringToBase64`/`base64ToString` from `@/utils/internal/encoding.js`.
  - `sanitization.ts`: Replaced ad-hoc `isServerless` check with `runtimeCaps.isNode`; used `runtimeCaps.hasBuffer` and `runtimeCaps.hasTextEncoder` for feature detection. Replaced fire-and-forget `import('node:path').then()` chain with top-level `await import()`, eliminating a race condition where `sanitizePath` could run before `pathModule` was assigned.
- **`scheduler.ts`**: Replaced plain `Error` throws with `McpError` using appropriate codes (`Conflict` for duplicate job IDs, `InvalidParams` for bad cron expressions, `NotFound` for missing jobs). Replaced bare inline log context objects with `requestContextService.createRequestContext()` for OTel trace correlation. Extracted `resolveJob()` private helper to deduplicate job-lookup-or-throw pattern across `start`, `stop`, and `remove`.
- **`metrics/registry.ts`**: Removed module entirely — superseded by `telemetry/metrics.ts` which provides the same counter/histogram/gauge API with proper no-op fallbacks.
- **`telemetry/metrics.ts`**: Observable gauge, counter, and upDownCounter `createObservable*` functions now wire the callback parameter to `addCallback` (were no-ops that ignored the `_callback` parameter).
- **`performance.ts`**: `measureToolExecution` now records `mcp.tool.calls`, `mcp.tool.duration`, and `mcp.tool.errors` to OTel metric instruments for durable metrics across restarts.
- **`httpTransport.ts`**: Added `mcp.sessions.active` observable gauge wired to `SessionStore.getSessionCount()` when OTel is enabled.
- **`runtime.ts`**: Added `isBun` capability flag to `runtimeCaps` (detects Bun via `process.versions.bun`).
- **`Dockerfile`**: Added OCI image metadata labels (`title`, `description`, `source`, `licenses`) per the [OCI image-spec annotations](https://github.com/opencontainers/image-spec/blob/main/annotations.md). Retained existing MCP registry label.
- **`instrumentation.ts`**: `canUseNodeSDK()` now returns false on Bun, where Node.js auto-instrumentations (http, etc.) silently no-op.
- **`resourceDefinition.ts`**: `logic` return type is now inferred from `TOutputSchema` instead of `unknown` when an output schema is provided.
- **`toolDefinition.ts`**: `ToolAnnotations` interface fields sorted alphabetically; added JSDoc for `destructiveHint` and `idempotentHint`.
- **README.md**: Updated Bun version badge and prerequisites from v1.2.21 to v1.3.2 to match `packageManager` field. Stripped AI writing patterns: removed all emoji from headings, replaced bold inline-header bullet lists with plain bullets, removed promotional language, converted Title Case headings to sentence case, and collapsed nested documentation sub-lists. Added `MCP_AUTH_MODE`, `OAUTH_AUDIENCE`, and `DEV_MCP_AUTH_BYPASS` to the configuration reference table. Added dev bypass guidance to the authentication section.
- **`.env.example`**: Reorganized into labeled sections. Added missing variables: `NODE_ENV`, `MCP_AUTH_MODE`, `MCP_RESPONSE_VERBOSITY`, `DEV_MCP_AUTH_BYPASS`, `OAUTH_ISSUER_URL`, `OAUTH_AUDIENCE`, `OAUTH_JWKS_URI`, and `OTEL_ENABLED`. Moved Supabase vars to a conditional section (commented out). Fixed `STORAGE_PROVIDER_TYPE` comment to include `cloudflare-d1`. Corrected stale auth comment that incorrectly stated the secret key is required for all HTTP transport.
- **Module READMEs** (`src/mcp-server/`, `src/container/`, `src/services/`, `src/storage/`): Applied the same editorial pass. Collapsed numbered bold-header sections into tables or plain bullets, removed promotional filler, converted headings to sentence case, and stripped bold `**Label:**` patterns throughout.
- **`config/index.ts`**: Added `devMcpAuthBypass` config field (`DEV_MCP_AUTH_BYPASS` env var) for explicit JWT auth bypass. Added production guard — `DEV_MCP_AUTH_BYPASS=true` is rejected at config validation when `NODE_ENV=production`, preventing accidental auth bypass in production deployments. Added `.superRefine()` cross-field validation: JWT mode requires `mcpAuthSecretKey` (≥32 chars) unless bypass is set; OAuth mode requires `oauthIssuerUrl` and `oauthAudience`. Added range validators: `mcpHttpPort` (1–65535), `openTelemetry.samplingRatio` (0–1).
- **`index.ts`**: Moved `uncaughtException` and `unhandledRejection` process error handlers to register before `transportManager.start()`, ensuring fatal errors during transport binding are caught and trigger graceful shutdown. Removed module-level `config` variable and its stale `import type` — `container.resolve(AppConfig)` now runs as a local `const` inside `start()` after the try/catch, removing the unsafe pre-initialization reference. Removed stale inline comments.
- **`types-global/errors.ts`**: `McpError.code` is now `readonly`, preventing accidental mutation after construction.
- **JWT/OAuth claim logging** (`jwtStrategy.ts`, `oauthStrategy.ts`): Post-verification debug logs now include only safe JWT claim fields (`iss`, `aud`, `exp`, `iat`, `jti`) instead of the full decoded payload, preventing accidental PII in logs.
- **`sessionStore.ts`**: Tightened session identity validation — sessions bound to a tenant/client now reject requests with missing (not just mismatched) identity fields, closing a session-hijacking vector via identity omission. Added `subject` claim validation — sessions bound to a subject now reject requests with a mismatched or missing subject, closing a session reuse vector across different authenticated users.
- **`storageFactory.ts`**: Converted `isServerless` from module-level constant to function evaluated at call time, fixing a race condition where the guard was always `false` in Workers because `IS_SERVERLESS` was set after module import.
- **Storage cursor robustness**: `InMemoryProvider` and `FileSystemProvider` now handle deleted cursor keys by finding the next key lexicographically, instead of silently restarting pagination from the beginning.
- **Storage SQL injection prevention**: `D1Provider` and `SupabaseProvider` now escape SQL `LIKE` wildcards (`%`, `_`) in prefix queries via `escapeLikePattern()` helper.
- **Cloudflare KV/R2 cursor security**: `KvProvider` and `R2Provider` now wrap native cursors in tenant-bound envelopes using `encodeCursor`/`decodeCursor`, preventing cursor reuse across tenants.
- **Cloudflare KV TTL enforcement**: `KvProvider` now enforces a minimum TTL of 60 seconds (Cloudflare KV's platform minimum) instead of passing through sub-60-second values that would fail silently.
- **`storageBackedTaskStore.ts`**: Tasks are now bound to the session that created them. All task operations (`getTask`, `getTaskResult`, `storeTaskResult`, `updateTaskStatus`) enforce ownership via `assertOwnership()`. `listTasks` filters results to show only the caller's tasks and unbound (legacy) tasks. Tasks created without a sessionId remain accessible by any session for backwards compatibility.
- **`fetchWithTimeout.ts`**: Added optional `signal` parameter to combine an external `AbortSignal` (e.g., `sdkContext.signal`) with the internal timeout. Error data in thrown `McpError` objects now includes only `requestId`/`operation` instead of spreading the full context object. Added DNS resolution validation (Node.js only) — resolves hostnames and checks all A/AAAA records against private/reserved ranges before connecting, closing DNS rebinding SSRF vectors. Added IPv6 private range detection (`fe80:`, `fc00::/7`, `::1`, IPv4-mapped addresses). SSRF-protected requests now follow redirects manually with validation on each hop (max 5 redirects), preventing redirect-based SSRF bypasses.

### Tests

- **`encoding.test.ts`**: Added tests for `stringToBase64` (Buffer path, TextEncoder fallback, empty string, multi-byte UTF-8) and `base64ToString` (Buffer path, atob+TextDecoder fallback, empty string, round-trip). Added empty `ArrayBuffer` edge case for `arrayBufferToBase64`.
- **`requestContext.test.ts`**: Added ad-hoc property passthrough test. Added tenant ID resolution priority suite covering all four fallback levels (`additionalContext` → rest params → parent context → auth store).
- **`logger.test.ts`**: Added `alert()` and `emerg()` tests with both Error+context and context-only signatures.
- **`performance.init.test.ts`**: Fixed `Date.now` fallback and `node:perf_hooks` path tests — replaced `vi.spyOn` on ESM export (which doesn't affect internal module calls) with direct loader injection via the new `perfLoader` parameter.
- **`claimParser.test.ts`** (new): Added 5 tests for `handleJoseVerifyError` covering McpError passthrough, JWTExpired mapping, fallback messages, non-Error values, and always-throws guarantee.
- **`httpTransport.test.ts`**: Added SSE GET passthrough test verifying `Accept: text/event-stream` bypasses the info endpoint. Updated OAuth metadata endpoint test — now expects 200 with minimal `bearer_methods_supported` response (was 404) when OAuth is not configured.
- **`httpErrorHandler.test.ts`**: Updated WWW-Authenticate tests — removed "should not add header when OAuth not configured" case (header is now always set on 401); simplified remaining tests to remove OAuth config spying.
- **`httpTransport.integration.test.ts`**: Updated OAuth metadata integration test to use `mcpAuthMode` spy; replaced `jwks_uri` assertion with `bearer_methods_supported` check.
- **`httpTypes.test.ts`**: Removed `HonoVariables` tests (type was deleted).
- **`diffFormatter.test.ts`**, **`markdownBuilder.test.ts`**, **`tableFormatter.test.ts`**, **`treeFormatter.test.ts`**: Added edge-case and branch-coverage tests for formatting utilities.
- **`scheduler.test.ts`**: Updated log assertion matchers to use `operation`/`jobId` context fields (matching `requestContextService` output) instead of raw `requestId` strings. Added assertions for `start` and `stop` log calls.
- **Schema snapshots**: Updated resource and tool schema snapshots with newly added definitions (`data-explorer-ui`, `template_async_countdown`, `template_cat_fact`, `template_code_review_sampling`, `template_data_explorer`, `template_echo_message`, `template_image_test`, `template_madlibs_elicitation`). Removed stale duplicate snapshot entries from pre-`>` Vitest describe separator format. Updated `template_async_countdown` snapshot — `simulateFailure` now carries `default: false` and appears in the `required` array (Zod `.default()` makes the field required in the JSON schema output).
- **`server.test.ts`**: Updated `logger.error` call assertions to match the new three-argument signature — `expect.objectContaining({ message })` for the Error argument and `expect.any(Object)` for the context argument, replacing the previous single-object spread pattern.
- **`template-madlibs-elicitation.tool.test.ts`**: Updated all mock return values for the new `{ action, content }` elicitation response shape. Added `"should throw on user decline"` test case.
- **`jwtStrategy.test.ts`**: Updated bypass tests to use `devMcpAuthBypass` config flag instead of environment-based conditions.
- **`kvProvider.test.ts`**, **`r2Provider.test.ts`**: Updated pagination tests to use tenant-bound encoded cursors via `encodeCursor`/`decodeCursor`.
- **`config/index.test.ts`**: Added tests for production guard rejecting `DEV_MCP_AUTH_BYPASS=true` in production and allowing it in development.
- **`metrics.test.ts`**: Updated observable metric mocks to include `addCallback` method, matching the wired callback implementation. Added `addCallback` registration tests for observable gauge, counter, and up-down counter.
- **`performance.test.ts`**: Added OTel metric recording tests — verifies `mcp.tool.calls` counter, `mcp.tool.duration` histogram, and `mcp.tool.errors` counter are recorded on success and failure paths.
- **`runtime.test.ts`**: Added `isBun` detection test (verifies false in Node/Vitest) and property presence assertion.
- **`instrumentation.test.ts`**: Added Bun runtime detection test verifying `isBun=true` prevents NodeSDK loading.
- **`storageBackedTaskStore.test.ts`**: Added session ownership suite (6 cases): creator access, cross-session rejection, backwards-compat unbound access, ownership enforcement on `getTaskResult`/`storeTaskResult`/`updateTaskStatus`, and `listTasks` session filtering.
- **`sessionStore.test.ts`**: Added subject isolation suite (4 cases): cross-subject rejection, same-subject acceptance, subject-only binding, and unauthenticated request rejection for subject-bound sessions.
- **`fetchWithTimeout.test.ts`**: Added comprehensive SSRF protection suite covering hostname/IP pattern checks (localhost, 127.x, 10.x, 192.168.x, 169.254.169.254, metadata.google.internal, IPv6 loopback, 172.16-31.x, CGNAT range, public IP allowlist) and redirect validation (redirect to private IP, redirect to localhost, excessive redirects, safe redirect following, missing Location header, manual redirect mode toggle).

### Removed

- `eslint` (10.0.2), `prettier` (3.8.1), `typescript-eslint` (8.56.1), `globals` (17.3.0), `@eslint/js` (10.0.1) dev dependencies.
- `.prettierignore`, `.prettierrc.json`, `eslint.config.js` config files.
- 22 barrel `index.ts` files and their 15 corresponding barrel test files.
- `src/utils/metrics/registry.ts` and `tests/utils/metrics/registry.test.ts` — redundant metrics registry, superseded by `telemetry/metrics.ts`.
- `coverage/` directory from version control (generated build artifact).

### Dependencies

- Updated all runtime and dev dependency specifiers to `latest` in `bun.lock`, resolving to current package versions.
- Updated OpenTelemetry SDK packages from 2.5.x/0.212.x to 2.6.x/0.213.x (`@opentelemetry/resources`, `sdk-metrics`, `sdk-trace-node`, `sdk-node`, `exporter-metrics-otlp-http`, `exporter-trace-otlp-http`, `instrumentation-pino`, `auto-instrumentations-node`).
- Updated `@hono/otel` from 1.1.0 to 1.1.1, `fast-xml-parser` from 5.4.1 to 5.4.2, `@biomejs/biome` from 2.4.4 to 2.4.5.
- Updated dev type packages: `@cloudflare/workers-types`, `@types/bun`, `@types/node`.

---
