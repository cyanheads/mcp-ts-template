---
name: devcheck
description: >
  Lint, format, typecheck, and verify the project is clean. Use after making changes, before committing, or when the user asks to verify quality.
metadata:
  author: cyanheads
  version: "1.3"
  audience: external
  type: workflow
---

## What It Runs

`bun run devcheck` runs a broader check suite than just lint + types. By default it includes local hygiene checks, MCP definition linting, Biome, TypeScript, and slow dependency/security checks unless `--fast` is passed. Tests are opt-in via `--test`.

| Check | Tool | Notes |
|:------|:-----|:------|
| TODOs / FIXMEs | `git grep` | Fails on tracked TODO/FIXME markers outside excluded files |
| Tracked secrets | `git ls-files` | Flags tracked `.env`, keys, credentials, and similar sensitive files |
| MCP definitions | `bun run scripts/lint-mcp.ts` | Validates tool/resource/prompt definitions against framework rules |
| Biome | `biome check` | Unified lint + format — read-only by default |
| TypeScript | `tsc --noEmit` | Full project type check |
| Unused dependencies | `depcheck` | Runs by default; network-free but slower on large repos |
| Security audit | `bun audit` | Runs by default unless `--fast` or `--no-audit` |
| Outdated dependencies | `bun outdated` | Runs by default unless `--fast` or `--no-deps` |
| Tests | `vitest run` | Off by default; enable with `bun run devcheck --test` |

To auto-fix lint/format issues, run `bun run format`.

## Steps

1. Run `bun run devcheck`
2. Read the failing checks in the summary and per-check output
3. Fix the reported issues
4. Re-run `bun run devcheck` until clean
5. If the change touches runtime behavior, also run `bun run devcheck --test` or `bun run test`
6. Do not consider this skill complete until the required commands exit successfully with no errors

## Common Issues

| Check | Error Type | Typical Fix |
|:------|:-----------|:------------|
| TODOs / FIXMEs | Tracked work markers | Resolve or remove the marker before committing |
| Tracked secrets | Sensitive files in git | Add to `.gitignore` and remove from the index |
| MCP definitions | Definition lint errors | Fix schema/name/annotation issues reported by `lint-mcp` |
| Biome | Lint/format errors | Run `bun run format` to auto-fix, or address the flagged rule manually |
| TypeScript | Type errors | Fix type mismatches, missing properties, incorrect generics |
| Security audit | Vulnerabilities in direct deps | Update or replace the affected dependency |
| Outdated deps | Stale package versions | Run `bun update` or allowlist intentionally pinned packages |

## Checklist

- [ ] `bun run devcheck` exits with no errors
- [ ] Tests run when needed (`bun run devcheck --test` or `bun run test`)
