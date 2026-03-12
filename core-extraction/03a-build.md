# 03a — Build Pipeline

> Build strategy for multi-entry subpath exports, declaration generation, and package `files` array.

---

## Problem

The current build uses `bun build` with a single entry point (`src/index.ts`). A package with subpath exports needs:

1. **`.js` output** for every subpath entry point — not bundled into one file
2. **`.d.ts` declarations** for every exported module — `bun build` doesn't emit these
3. **Declaration maps** (`.d.ts.map`) for IDE go-to-definition into source
4. A `files` array that ships `dist/`, build configs, `CLAUDE.md`, and `skills/`

---

## Strategy: `tsc` for Everything

Use `tsc` as the sole build tool for the core package. No bundler for the library output.

**Why `tsc`, not a bundler:**

| Concern | Bundler (`bun build`, `tsup`, `unbuild`) | `tsc` |
|:--------|:------------------------------------------|:------|
| `.d.ts` generation | Separate step or plugin required | Built-in (`declaration: true`) |
| Subpath exports | Must configure multiple entry points | Mirrors `src/` → `dist/` 1:1 — subpaths just work |
| Source maps | Bundler source maps point into bundled output | Maps point to original `.ts` files |
| Tree-shaking | Bundler's job | Consumer's bundler handles it (Workers `build:worker`) |
| Path aliases (`@/`) | Must be resolved by bundler | `tsc` doesn't resolve — use `tsc-alias` post-build or switch to relative imports |

A library package should emit unbundled ESM. Bundling is the consumer's responsibility (e.g., `build:worker` for Cloudflare). Core's job is to emit clean `.js` + `.d.ts` that Node and bundlers can consume.

### Path alias resolution

The current codebase uses `@/` path aliases (`@/utils/internal/logger.js`). `tsc` emits these verbatim — they don't resolve to relative paths in output. Two options:

| Option | Approach | Tradeoff |
|:-------|:---------|:---------|
| `tsc-alias` post-build | Run `tsc-alias` after `tsc` to rewrite `@/` → relative in `dist/` | Extra build step, but zero source changes |
| Convert to relative imports | Replace `@/` with relative paths in source | Clean output, but large diff and loses the ergonomic alias |

**Decision: `tsc-alias` post-build.** The `@/` alias is used extensively and provides clear signal about "this is my code, not a dep." Converting to relative paths is a high-churn change with no architectural benefit. `tsc-alias` is a lightweight, well-maintained tool that rewrites paths in the emitted `.js` and `.d.ts` files.

```bash
# Build command
tsc && tsc-alias
```

---

## `tsconfig.json` Changes

The current `tsconfig.json` already has the right foundation:

```jsonc
{
  "compilerOptions": {
    "outDir": "./dist",
    "declaration": true,       // already set
    "declarationMap": true,    // already set
    "sourceMap": true,         // already set
    // ...
  }
}
```

Changes needed for core package:

```jsonc
{
  "compilerOptions": {
    // Remove bun-types from the core package — consumers may not use Bun
    "types": ["node", "@cloudflare/workers-types"],

    // Keep everything else as-is
  },
  // Exclude tests and examples from the published build
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "src/**/*.test.ts", "examples/**/*"]
}
```

The base `tsconfig.base.json` that downstream servers extend will be a subset — strict settings, module config, path alias setup — without core-specific `include`/`exclude`/`outDir`.

---

## `package.json` Changes

### `files` array

```jsonc
{
  "files": [
    "dist/",
    "skills/",
    "CLAUDE.md",
    "tsconfig.base.json",
    "vitest.config.js",
    "biome.json"
  ]
}
```

- `dist/` — compiled `.js`, `.d.ts`, `.d.ts.map`, `.js.map`
- `skills/` — Agent Skills definitions (`SKILL.md` files + assets)
- `CLAUDE.md` — consumer-facing agent reference
- `tsconfig.base.json`, `vitest.config.js`, `biome.json` — shared build configs (shipped as-is, not compiled)

**`vitest.config.js` is authored as plain JS, not compiled from `.ts`.** Vitest configs are simple objects that don't benefit from TypeScript. A `.ts` file can't be imported from `node_modules` through subpath exports without extra consumer-side TypeScript config — `.js` works universally. Core's own `vitest.config.ts` (used internally during development) is separate from the exported `vitest.config.js` base preset.

**Excluded:** `examples/`, `tests/`, `CONTRIBUTING.md`, `src/`, `.github/`

### `exports` with dual conditions

Every compiled subpath export needs both `import` and `types` conditions. Additionally, `"./package.json": "./package.json"` must be included — some bundlers and tools resolve `<pkg>/package.json` as a subpath import, which fails under strict `exports` without it. See [02-public-api.md](02-public-api.md) for the full map.

```jsonc
{
  "exports": {
    ".": {
      "types": "./dist/app.d.ts",
      "import": "./dist/app.js"
    },
    "./tools": {
      "types": "./dist/mcp-server/tools/utils/toolDefinition.d.ts",
      "import": "./dist/mcp-server/tools/utils/toolDefinition.js"
    },
    // ... etc for all subpaths from 02-public-api.md
  }
}
```

The `types` condition must come first — TypeScript requires it before `import` for correct resolution.

### Build scripts

```jsonc
{
  "scripts": {
    "build": "tsc && tsc-alias",
    "build:check": "tsc --noEmit",
    "prepublishOnly": "bun run build"
  }
}
```

- `build` — library output for npm (`tsc` + alias resolution)
- `build:check` — type-check without emitting (CI, `devcheck`)
- `prepublishOnly` — ensure fresh build before `bun publish`

> **Note:** `build:worker` is removed from core. After extraction, Worker builds are a server-level concern — each server's `build:worker` targets its own `src/worker.ts` entry point that calls `createWorkerHandler()`.

---

## Worker Build

After extraction, core no longer has a Worker entry point — `src/worker.ts` becomes `createWorkerHandler()`, a factory that returns a Workers export object. The actual entry point moves to each downstream server (or `examples/`).

**Core:** Remove `build:worker` from `package.json` scripts. Core ships `createWorkerHandler()` as library code compiled by `tsc`.

**Downstream servers:** Each server owns its own `build:worker` script using `bun build` with `--no-external`, targeting the server's `src/worker.ts` that calls `createWorkerHandler()`. Imports from `@cyanheads/mcp-ts-core/*` subpaths resolve to `dist/` files in `node_modules`. `bun build` handles this natively.

---

## Build Verification

CI should verify:

1. `tsc && tsc-alias` succeeds with zero errors
2. Every subpath in `exports` resolves to an existing `.js` and `.d.ts` file in `dist/`
3. A clean `npm pack` produces a tarball with the expected file set
4. `examples/` build successfully against the `dist/` output (not source)

A simple verification script:

```ts
// scripts/verify-exports.ts
import { readFileSync, existsSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const exports = pkg.exports;

for (const [subpath, conditions] of Object.entries(exports)) {
  if (typeof conditions === 'string') {
    if (!existsSync(conditions)) {
      console.error(`Missing: ${subpath} → ${conditions}`);
      process.exit(1);
    }
  } else {
    for (const [condition, path] of Object.entries(conditions as Record<string, string>)) {
      if (!existsSync(path)) {
        console.error(`Missing: ${subpath} [${condition}] → ${path}`);
        process.exit(1);
      }
    }
  }
}

console.log(`All ${Object.keys(exports).length} export paths verified.`);
```

---

## New Dev Dependency

| Package | Purpose | Notes |
|:--------|:--------|:------|
| `tsc-alias` | Rewrite `@/` path aliases in `tsc` output | Lightweight, well-maintained. Only needed at build time. |

---

## Checklist

- [x] `build` script changed to `tsc && tsc-alias`
- [x] `tsc-alias` added to `devDependencies`
- [x] `tsconfig.json` updated: `types` without `bun-types`, `include` excludes tests/examples
- [x] `tsconfig.base.json` created for downstream server extension
- [x] `files` array includes `dist/`, `skills/`, `CLAUDE.md`, `tsconfig.base.json`, `biome.json`
- [ ] `vitest.config.js` authored as plain JS (not compiled from `.ts`)
- [x] Every subpath in `exports` has both `types` and `import` conditions (`types` first)
- [x] `"./package.json": "./package.json"` included in `exports` (toolchain compatibility)
- [x] `prepublishOnly` script added
- [x] Export verification script added (`scripts/verify-exports.ts`)
- [x] `build:worker` removed from core scripts (server-level concern post-extraction)
- [ ] `npm pack --dry-run` produces expected file set
