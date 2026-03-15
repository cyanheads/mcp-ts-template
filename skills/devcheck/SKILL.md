---
name: devcheck
description: >
  Lint, format, typecheck, and verify the project is clean. Use after making changes, before committing, or when the user asks to verify quality.
metadata:
  author: cyanheads
  version: "1.2"
  audience: external
  type: workflow
---

## What It Runs

`bun run devcheck` runs lint and typecheck:

| Check | Tool | Notes |
|:------|:-----|:------|
| Biome | `biome check` | Unified lint + format — read-only by default |
| TypeScript | `tsc --noEmit` | Full project type check |

To auto-fix lint/format issues, run `bun run format` (which runs `biome check --fix .`).

## Steps

1. Run `bun run devcheck`
2. Read the output — both checks run sequentially
3. Fix any lint or type errors in source files
4. Re-run `bun run devcheck` until clean
5. Do not consider this skill complete until the command exits successfully with no errors

## Common Issues

| Check | Error Type | Typical Fix |
|:------|:-----------|:------------|
| Biome | Lint/format errors | Run `bun run format` to auto-fix, or address the flagged rule manually |
| TypeScript | Type errors | Fix type mismatches, missing properties, incorrect generics |

## Checklist

- [ ] `bun run devcheck` exits with no errors
