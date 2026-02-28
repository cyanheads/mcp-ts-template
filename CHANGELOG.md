# Changelog

All notable changes to this project will be documented in this file.

For changelog details prior to version 3.0.0, please refer to the [changelog/archive.md](changelog/archive.md) file.

---

## [3.0.0] - 2026-02-28

### Breaking Changes

- **Replaced ESLint + Prettier with Biome**: Unified linting and formatting under [Biome 2.4.4](https://biomejs.dev/). Removed `eslint`, `prettier`, `typescript-eslint`, and `globals` dev dependencies. Removed `.prettierignore`, `.prettierrc.json`, and `eslint.config.js` config files. Added `biome.json` with equivalent rules, import sorting, and interface member sorting.
- **Removed barrel `index.ts` files**: Deleted 22 barrel re-export files across `src/` (utils, services, storage, transports, tasks, tools). All imports now reference the defining file directly (e.g. `@/utils/internal/logger.js` instead of `@/utils/index.js`). Barrel files remain only at aggregation points (`tools/definitions/index.ts`, `resources/definitions/index.ts`, `prompts/definitions/index.ts`, `container/index.ts`, `config/index.ts`).
- **JWT auth bypass requires explicit opt-in**: Dev-mode JWT auth bypass no longer activates implicitly in non-production environments. Requires `DEV_MCP_AUTH_BYPASS=true` environment variable. Existing deployments without `MCP_AUTH_SECRET_KEY` must set this flag to retain bypass behavior.
- **Elicitation response shape**: `elicitAndValidate` in `template-madlibs-elicitation.tool.ts` updated to expect `{ action: 'accept' | 'decline' | 'cancel', content: { value: string } }` instead of flat `{ value: string }`, matching the actual MCP SDK elicitation API. Decline/cancel actions now throw `McpError(InvalidRequest)`.

### Changed

- **`requestContext.ts`**: Extracted `extractTenantId` helper to replace three verbose tenant ID extraction blocks with `as` casts. Removed dead code: `ContextConfig` interface, `OperationContext` interface, `configure()`, and `getConfig()` methods (stored config was never consumed). Added index signature to `CreateRequestContextParams` for ad-hoc properties.
- **`logger.ts`**: Extracted `logWithError` private helper to deduplicate dispatch logic across `error`, `crit`, `alert`, and `emerg` methods. Changed `||` to `??` for `mcpToPinoLevel` lookups (4 sites).
- **`performance.ts`**: Renamed `initializePerformance_Hrt` to `initHighResTimer`. Extracted `getMemoryUsage` helper to deduplicate inline memory usage fallback. Removed unnecessary optional chain on confirmed non-null `perf` reference. Simplified `toBytes` by removing intermediate variable.
- **`encoding.ts`**: Replaced loop string concatenation with `String.fromCharCode(...bytes)` spread, removed unnecessary `as number` cast on `Uint8Array` element access.
- **`startupBanner.ts`**: Added `typeof process` guard to prevent crash in Cloudflare Workers where `process.stdout` may not exist.
- **`server.ts`**: Removed unused `requestContextService.configure()` call.
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
- **HTTP transport** (`src/mcp-server/transports/http/`):
  - Fixed MCP Spec 2025-06-18 compliance: `GET /mcp` with `Accept: text/event-stream` now falls through to the transport handler for SSE streams instead of unconditionally returning server info JSON.
  - Fixed unsafe `(handledError as McpError).code` cast in `httpErrorHandler.ts` — `errorCode` is now computed once before the status-mapping switch and reused in both the switch and the log.
  - Removed dead `HonoVariables` type from `httpTypes.ts` (never used in production code).
  - Simplified `httpTransport.ts`: removed redundant `authContext.run(store, handleRpc)` re-entry (ALS already propagates from middleware); compacted `SessionIdentity` construction with `Object.fromEntries` filter.
  - Deduplicated `requestContextService.createRequestContext()` calls in `sessionStore.isValidForIdentity` with a lazy `warn()` closure.
- **Transport manager** (`src/mcp-server/transports/manager.ts`):
  - Fixed relative imports to `@/` path aliases.
  - Replaced `as ServerType` / `as McpServer` casts in `stop()` with a typed `shutdown` closure stored during `start()`.
- **`performance.ts`**: Added optional `perfLoader` parameter to `initHighResTimer` for testability. Default remains `loadPerfHooks`, so all callers are unaffected. Fixes ESM self-call mocking limitation in vitest.
- **Unsafe `as Error` casts**: Replaced `error as Error` and `reason as Error` casts with proper `instanceof Error ? error : new Error(String(error))` narrowing across `index.ts` (3 sites), all five parsers (`frontmatterParser`, `jsonParser`, `pdfParser`, `xmlParser`, `yamlParser`), `scheduler.ts`, and `openrouter.provider.ts`.
- **Nullish coalescing**: Changed `||` to `??` for default value assignments in `openrouter.provider.ts` (3 sites), `elevenlabs.provider.ts` (6 sites), `whisper.provider.ts` (4 sites), and `rateLimiter.ts` (`maxTrackedKeys` fallback) to correctly handle empty-string and zero values.
- **`toolHandlerFactory.ts`**: Replaced unsafe `as McpError` cast with `instanceof McpError` check and proper fallback construction. Changed `McpError` from type-only to value import. Replaced hardcoded `-32603` error code with `JsonRpcErrorCode.InternalError`.
- **`fileSystemProvider.ts`**: Replaced verbose ENOENT detection (`instanceof Error && 'code' in error && (error as { code: string }).code`) with `isErrorWithCode()` type guard from `@/utils/types/guards.js` (2 sites).
- **`prompt-registration.ts`**: Wrapped `server.registerPrompt()` calls in `ErrorHandler.tryCatch` with `InitializationFailed` error code for structured error reporting during startup.
- **`worker.ts`**: Replaced local `ValidLogLevel` type with canonical `McpLogLevel` import from logger module.
- **Cross-runtime compatibility**:
  - `idGenerator.ts`: Replaced `node:crypto` imports (`randomBytes`, `randomUUID`) with Web Crypto API (`crypto.getRandomValues`, `crypto.randomUUID`) for Cloudflare Workers compatibility. Fixed typo in validation error message ("RANDOMLPART" → "RANDOMPART").
  - `pagination.ts`: Replaced Node-only `Buffer.from(..., 'base64url')` encoding/decoding with cross-platform `stringToBase64`/`base64ToString` from `@/utils/internal/encoding.js`.
  - `sanitization.ts`: Replaced ad-hoc `isServerless` check with `runtimeCaps.isNode`; used `runtimeCaps.hasBuffer` and `runtimeCaps.hasTextEncoder` for feature detection.
- **`scheduler.ts`**: Replaced plain `Error` throws with `McpError` using appropriate codes (`Conflict` for duplicate job IDs, `InvalidParams` for bad cron expressions, `NotFound` for missing jobs). Replaced bare inline log context objects with `requestContextService.createRequestContext()` for OTel trace correlation. Extracted `resolveJob()` private helper to deduplicate job-lookup-or-throw pattern across `start`, `stop`, and `remove`.
- **`metrics/registry.ts`**: Removed unused `bind`/`unbind` methods from no-op counter and histogram stubs.
- **README.md**: Updated Bun version badge and prerequisites from v1.2.21 to v1.3.2 to match `packageManager` field.
- **`config/index.ts`**: Added `devMcpAuthBypass` config field (`DEV_MCP_AUTH_BYPASS` env var) for explicit JWT auth bypass. Added `.superRefine()` cross-field validation: JWT mode requires `mcpAuthSecretKey` (≥32 chars) unless bypass is set; OAuth mode requires `oauthIssuerUrl` and `oauthAudience`. Added range validators: `mcpHttpPort` (1–65535), `openTelemetry.samplingRatio` (0–1).
- **`index.ts`**: Moved `uncaughtException` and `unhandledRejection` process error handlers to register before `transportManager.start()`, ensuring fatal errors during transport binding are caught and trigger graceful shutdown.
- **`worker.ts`**: 500 error responses no longer leak internal error messages — returns generic `"An internal error occurred."`.
- **`types-global/errors.ts`**: `McpError.code` is now `readonly`, preventing accidental mutation after construction.
- **JWT/OAuth claim logging** (`jwtStrategy.ts`, `oauthStrategy.ts`): Post-verification debug logs now include only safe JWT claim fields (`iss`, `aud`, `exp`, `iat`, `jti`) instead of the full decoded payload, preventing accidental PII in logs.
- **`jwtStrategy.ts`**: Removed implicit environment-based dev bypass. JWT bypass now requires explicit `devMcpAuthBypass` config flag. Removed unused `env` instance field.
- **`httpTransport.ts`**: Per-request MCP server instances now closed in a `finally` block (was error-path-only), fixing a resource leak on successful stateless HTTP requests.
- **`sessionStore.ts`**: Tightened session identity validation — sessions bound to a tenant/client now reject requests with missing (not just mismatched) identity fields, closing a session-hijacking vector via identity omission.
- **`transports/manager.ts`**: `TransportManager.stop()` now calls `TaskManager.cleanup()` to clear task manager timers, enabling clean process exit without hanging event loop references.
- **`toolHandlerFactory.ts`**: Added defense-in-depth input validation — tool handler now re-parses input against the tool's Zod schema before calling logic, catching any SDK parsing gaps. `inputSchema` parameter (previously unused at runtime) is now active.
- **`storageFactory.ts`**: Converted `isServerless` from module-level constant to function evaluated at call time, fixing a race condition where the guard was always `false` in Workers because `IS_SERVERLESS` was set after module import.
- **Storage cursor robustness**: `InMemoryProvider` and `FileSystemProvider` now handle deleted cursor keys by finding the next key lexicographically, instead of silently restarting pagination from the beginning.
- **Storage SQL injection prevention**: `D1Provider` and `SupabaseProvider` now escape SQL `LIKE` wildcards (`%`, `_`) in prefix queries via `escapeLikePattern()` helper.
- **Cloudflare KV/R2 cursor security**: `KvProvider` and `R2Provider` now wrap native cursors in tenant-bound envelopes using `encodeCursor`/`decodeCursor`, preventing cursor reuse across tenants.
- **Cloudflare KV TTL enforcement**: `KvProvider` now enforces a minimum TTL of 60 seconds (Cloudflare KV's platform minimum) instead of passing through sub-60-second values that would fail silently.
- **`encoding.ts`**: `arrayBufferToBase64` now chunked in 32 KB blocks to avoid stack overflow on large buffers in browser/Worker environments. `base64ToString` optimized to avoid intermediate array allocation from `split('')`.
- **`requestContext.ts`**: `createRequestContext()` now strips `requestId` and `timestamp` from `additionalContext` to prevent callers from accidentally overwriting generated correlation IDs.
- **`fetchWithTimeout.ts`**: Added optional `signal` parameter to combine an external `AbortSignal` (e.g., `sdkContext.signal`) with the internal timeout. Error data in thrown `McpError` objects now includes only `requestId`/`operation` instead of spreading the full context object.
- **`sanitization.ts`**: Replaced fire-and-forget `import('node:path').then()` chain with top-level `await import()`, eliminating a race condition where `sanitizePath` could run before `pathModule` was assigned.

### Tests

- **`encoding.test.ts`**: Added tests for `stringToBase64` (Buffer path, TextEncoder fallback, empty string, multi-byte UTF-8) and `base64ToString` (Buffer path, atob+TextDecoder fallback, empty string, round-trip). Added empty `ArrayBuffer` edge case for `arrayBufferToBase64`.
- **`requestContext.test.ts`**: Added ad-hoc property passthrough test. Added tenant ID resolution priority suite covering all four fallback levels (`additionalContext` → rest params → parent context → auth store).
- **`logger.test.ts`**: Added `alert()` and `emerg()` tests with both Error+context and context-only signatures.
- **`performance.init.test.ts`**: Fixed `Date.now` fallback and `node:perf_hooks` path tests — replaced `vi.spyOn` on ESM export (which doesn't affect internal module calls) with direct loader injection via the new `perfLoader` parameter.
- **`claimParser.test.ts`** (new): Added 5 tests for `handleJoseVerifyError` covering McpError passthrough, JWTExpired mapping, fallback messages, non-Error values, and always-throws guarantee.
- **`httpTransport.test.ts`**: Added SSE GET passthrough test verifying `Accept: text/event-stream` bypasses the info endpoint.
- **`httpTypes.test.ts`**: Removed `HonoVariables` tests (type was deleted).
- **`diffFormatter.test.ts`**, **`markdownBuilder.test.ts`**, **`tableFormatter.test.ts`**, **`treeFormatter.test.ts`**: Added edge-case and branch-coverage tests for formatting utilities.
- **`scheduler.test.ts`**: Updated log assertion matchers to use `operation`/`jobId` context fields (matching `requestContextService` output) instead of raw `requestId` strings. Added assertions for `start` and `stop` log calls.
- **Schema snapshots**: Updated resource and tool schema snapshots with newly added definitions (`data-explorer-ui`, `template_async_countdown`, `template_cat_fact`, `template_code_review_sampling`, `template_data_explorer`, `template_echo_message`, `template_image_test`, `template_madlibs_elicitation`). Removed stale duplicate snapshot entries from pre-`>` Vitest describe separator format.
- **`template-madlibs-elicitation.tool.test.ts`**: Updated all mock return values for the new `{ action, content }` elicitation response shape. Added `"should throw on user decline"` test case.
- **`jwtStrategy.test.ts`**: Updated bypass tests to use `devMcpAuthBypass` config flag instead of environment-based conditions.
- **`kvProvider.test.ts`**, **`r2Provider.test.ts`**: Updated pagination tests to use tenant-bound encoded cursors via `encodeCursor`/`decodeCursor`.

### Removed

- `eslint` (10.0.2), `prettier` (3.8.1), `typescript-eslint` (8.56.1), `globals` (17.3.0), `@eslint/js` (10.0.1) dev dependencies.
- `.prettierignore`, `.prettierrc.json`, `eslint.config.js` config files.
- 22 barrel `index.ts` files and their 15 corresponding barrel test files.
- `coverage/` directory from version control (generated build artifact).

### Dependencies

- Updated all runtime and dev dependency specifiers to `latest` in `bun.lock`, resolving to current package versions.

---
