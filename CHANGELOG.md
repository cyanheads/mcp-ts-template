# Changelog

All notable changes to this project will be documented in this file.

For changelog details prior to version 3.0.0, please refer to the [changelog/archive.md](changelog/archive.md) file.

---

## [3.0.0] - 2026-02-27

### Breaking Changes

- **Replaced ESLint + Prettier with Biome**: Unified linting and formatting under [Biome 2.4.4](https://biomejs.dev/). Removed `eslint`, `prettier`, `typescript-eslint`, and `globals` dev dependencies. Removed `.prettierignore`, `.prettierrc.json`, and `eslint.config.js` config files. Added `biome.json` with equivalent rules, import sorting, and interface member sorting.
- **Removed barrel `index.ts` files**: Deleted 22 barrel re-export files across `src/` (utils, services, storage, transports, tasks, tools). All imports now reference the defining file directly (e.g. `@/utils/internal/logger.js` instead of `@/utils/index.js`). Barrel files remain only at aggregation points (`tools/definitions/index.ts`, `resources/definitions/index.ts`, `prompts/definitions/index.ts`, `container/index.ts`, `config/index.ts`).

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
- **CLAUDE.md**: Updated import guidelines, documented direct-import convention and allowed barrel files, refined context object docs.
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

### Removed

- `eslint` (10.0.2), `prettier` (3.8.1), `typescript-eslint` (8.56.1), `globals` (17.3.0), `@eslint/js` (10.0.1) dev dependencies.
- `.prettierignore`, `.prettierrc.json`, `eslint.config.js` config files.
- 22 barrel `index.ts` files and their 15 corresponding barrel test files.

---
