---
name: devcheck
description: >
  Lint, format, typecheck, and audit the project. Use after making changes, before committing, or when the user asks to verify the project is clean.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
  type: workflow
---

## Steps

1. Run `bun run devcheck`
2. Read the output carefully — it runs lint, format check, typecheck, and security audit
3. If there are failures, fix the issues in the source files
4. Re-run `bun run devcheck` until clean
5. Do not consider this skill complete until the command exits successfully with no errors

## Common Issues

| Error Type | Typical Fix |
|:-----------|:------------|
| Lint errors | Fix code style issues, unused imports, missing types |
| Format errors | Run `bun run format` or fix manually |
| Type errors | Fix type mismatches, missing properties, incorrect generics |
| Security audit | Update vulnerable dependencies with `bun update` |

## Checklist

- [ ] `bun run devcheck` exits with no errors
