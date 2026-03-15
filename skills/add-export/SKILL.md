---
name: add-export
description: >
  Add a new subpath export to the @cyanheads/mcp-ts-core package. Use when creating a new public API surface that consumers import from a dedicated subpath (e.g., @cyanheads/mcp-ts-core/newutil).
metadata:
  author: cyanheads
  version: "1.0"
  audience: internal
  type: reference
---

## Context

Subpath exports are defined in `package.json` under the `exports` field. Each subpath maps to a source entry point that gets compiled to `dist/`. The exports catalog in `CLAUDE.md` must stay in sync with `package.json`.

The build uses `tsconfig.build.json` (not `tsconfig.json`) with `rootDir: ./src` and `include: ["src/**/*"]`. This means every source file at `src/foo/bar.ts` compiles to `dist/foo/bar.js` — the `dist/` paths in `exports` must mirror the source tree exactly, not flatten it.

## Steps

1. **Create the entry point** source file under `src/` (e.g., `src/utils/new-util.ts`)
2. **Add the subpath** to `package.json` `exports`, mirroring the source path:
   ```jsonc
   // source: src/utils/new-util.ts → dist: dist/utils/new-util.js
   "./newutil": {
     "types": "./dist/utils/new-util.d.ts",
     "import": "./dist/utils/new-util.js"
   }
   ```
3. **Update the exports catalog** in `CLAUDE.md` — add a row to the table
4. **Build** with `bun run build` to generate `dist/` output
5. **Verify the export** by inspecting the compiled output directly:
   ```bash
   # Confirm the compiled file exists at the expected dist path
   ls dist/utils/new-util.js

   # Confirm the declared exports resolve to real files
   bun -e "import('./dist/utils/new-util.js').then(m => console.log(Object.keys(m)))"
   ```
6. **Run `bun run devcheck`** to verify

## Naming conventions

| Convention | Rule |
|:-----------|:-----|
| Subpath | lowercase, no underscores (e.g., `utils/errorHandler`) |
| Source file | kebab-case (e.g., `error-handler.ts`) |
| Export name | camelCase for values, PascalCase for types |

## Checklist

- [ ] Source entry point file created with JSDoc header
- [ ] Subpath added to `package.json` `exports` with `types` and `import` conditions
- [ ] Exports catalog in `CLAUDE.md` updated with new row
- [ ] `bun run build` succeeds
- [ ] Compiled file exists at expected `dist/` path and exports the expected symbols
- [ ] `bun run devcheck` passes
