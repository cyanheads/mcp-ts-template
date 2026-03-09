# Core Extraction Plan

**Project:** Extract `mcp-ts-template` infrastructure into `@cyanheads/mcp-ts-core`
**Status:** Planning
**Date:** 2026-03-09

---

## Overview

This directory contains the living plan for extracting the infrastructure layer of `mcp-ts-template` into a publishable scoped package (`@cyanheads/mcp-ts-core`). The monolithic design doc has been decomposed into focused, cross-referenced modules.

## Documents

| # | Document | Scope |
|:--|:---------|:------|
| 01 | [Architecture](01-architecture.md) | Problem, solution, package boundary, repo strategy, versioning |
| 02 | [Public API](02-public-api.md) | `bootstrap()`, `createWorkerHandler()`, subpath exports |
| 03 | [Config & Container](03-config-container.md) | Config extension pattern, container split, DI changes |
| 04 | [Dependencies](04-dependencies.md) | Dependency tiers, lazy import conversion, minimal install |
| 05 | [Agent DX](05-agent-dx.md) | Agent discovery, `CLAUDE.md` management, Agent Skills |
| 06 | [Testing](06-testing.md) | Testing strategy post-extraction |
| 07 | [Migration](07-migration.md) | Migration path for existing servers, `create-mcp-server` CLI |
| 08 | [Pre-extraction Cleanup](08-pre-extraction.md) | DI/wiring fixes, lazy dep conversion, coupling fixes |
| 09 | [Execution Sequence](09-execution.md) | Phased execution with per-phase checklists |
| 10 | [Decisions](10-decisions.md) | Resolved decisions, open questions, decision log |

## Phase Summary

| Phase | Description | Status |
|:------|:------------|:-------|
| 1 | Pre-extraction cleanup (DI/wiring) | Not started |
| 2 | Lazy dependency conversion | Not started |
| 3 | Repo transformation (the extraction) | Not started |
| 4 | Validate with examples | Not started |
| 5 | Publish `@cyanheads/mcp-ts-core@0.1.0` | Not started |
| 6 | Create thin `mcp-ts-template` reference repo | Not started |
| 7 | Migrate downstream servers | Not started |
| 8 | Cut 1.0 | Not started |
| 9 | Build `create-mcp-server` (deferred) | Not started |

## How to Use

- **Starting work on a phase?** Read the phase's checklist in [09-execution.md](09-execution.md), then the relevant detail docs.
- **Making a decision?** Log it in [10-decisions.md](10-decisions.md).
- **Updating the plan?** Edit the specific doc, not this README. Update phase status here when phases complete.
- **Source doc:** The original monolithic design doc is at [docs/mcp-ts-core-design.md](../docs/mcp-ts-core-design.md).
