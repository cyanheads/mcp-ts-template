# Changelog

All notable changes to this project will be documented in this file.

For changelog details prior to version 3.0.0, please refer to the [changelog/archive.md](changelog/archive.md) file.

---

## [3.0.0] - 2026-02-27

### Breaking Changes

- **Replaced ESLint + Prettier with Biome**: Unified linting and formatting under [Biome 2.4.4](https://biomejs.dev/). Removed `eslint`, `prettier`, `typescript-eslint`, and `globals` dev dependencies. Removed `.prettierignore`, `.prettierrc.json`, and `eslint.config.js` config files. Added `biome.json` with equivalent rules, import sorting, and interface member sorting.
- **Removed barrel `index.ts` files**: Deleted 22 barrel re-export files across `src/` (utils, services, storage, transports, tasks, tools). All imports now reference the defining file directly (e.g. `@/utils/internal/logger.js` instead of `@/utils/index.js`). Barrel files remain only at aggregation points (`tools/definitions/index.ts`, `resources/definitions/index.ts`, `prompts/definitions/index.ts`, `container/index.ts`, `config/index.ts`).

### Changed

- **`devcheck.ts`**: Merged separate ESLint and Prettier check steps into a single Biome check. Removed `FORMAT_EXTS` and the `getTargets()` helper (Biome handles file targeting via its own `includes` config). Husky hook mode still filters staged files for Biome.
- **`package.json` scripts**: `lint` now runs `biome check`, `format` now runs `biome check --write --unsafe`. Added `test:all` convenience script.
- **Codebase reformatted**: All 260 source, test, and script files reformatted by Biome. Key formatting differences from Prettier: sorted imports, sorted interface/type members, template literal preference over string concatenation, tighter line wrapping at 100 columns.
- **Import convention**: All ~160 source and test files migrated from barrel imports to direct file imports. `src/utils/pagination/index.ts` renamed to `src/utils/pagination/pagination.ts`.
- **CLAUDE.md**: Updated import guidelines, documented direct-import convention and allowed barrel files, refined context object docs.
- **Changelog archives**: Consolidated `changelog/archive1.md` and `changelog/archive2.md` into single `changelog/archive.md`.

### Removed

- `eslint` (10.0.2), `prettier` (3.8.1), `typescript-eslint` (8.56.1), `globals` (17.3.0), `@eslint/js` (10.0.1) dev dependencies.
- `.prettierignore`, `.prettierrc.json`, `eslint.config.js` config files.
- 22 barrel `index.ts` files and their 15 corresponding barrel test files.

---
