---
name: add-export
description: >
  Add a new subpath export to the @cyanheads/mcp-ts-core package. Use when creating a new public API surface that consumers import from a dedicated subpath (e.g., @cyanheads/mcp-ts-core/utils/newutil).
metadata:
  author: cyanheads
  version: "1.0"
  audience: internal
  type: reference
---

## Context

Subpath exports are defined in `package.json` under the `exports` field. Each subpath maps to a source entry point that gets compiled to `dist/`. The exports catalog in `CLAUDE.md` must stay in sync with `package.json`.

## Steps

1. **Create the entry point** source file (e.g., `src/utils/new-util.ts`)
2. **Add the subpath** to `package.json` `exports`:
   ```jsonc
   "./utils/newutil": {
     "types": "./dist/utils/new-util.d.ts",
     "import": "./dist/utils/new-util.js"
   }
   ```
3. **Update the exports catalog** in `CLAUDE.md` — add a row to the table
4. **Build** with `bun run build` to generate `dist/` output
5. **Verify the export** resolves correctly:
   ```bash
   node -e "import('@cyanheads/mcp-ts-core/utils/newutil').then(m => console.log(Object.keys(m)))"
   ```
6. **Run `bun run devcheck`** to verify

## Naming Conventions

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
- [ ] Export resolves correctly from `node_modules`
- [ ] `bun run devcheck` passes
