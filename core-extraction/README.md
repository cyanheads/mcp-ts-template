# Core Extraction Plan

**Project:** Extract `mcp-ts-template` infrastructure into `@cyanheads/mcp-ts-core`
**Status:** In progress (Phase 2 next)
**Date:** 2026-03-09

---

## Overview

This directory contains the living plan for extracting the infrastructure layer of `mcp-ts-template` into a publishable scoped package (`@cyanheads/mcp-ts-core`). The monolithic design doc has been decomposed into focused, cross-referenced modules.

## Documents

| # | Document | Scope |
|:--|:---------|:------|
| 01 | [Architecture](01-architecture.md) | Problem, solution, package boundary, repo strategy, versioning |
| 02 | [Public API](02-public-api.md) | `createApp()`, `createWorkerHandler()`, subpath exports |
| 03 | [Config & App Wiring](03-config-container.md) | Config extension pattern, `createApp()` internal wiring (no DI container) |
| 03a | [Build Pipeline](03a-build.md) | `tsc` + `tsc-alias`, `.d.ts` generation, `files` array, export verification |
| 04 | [Dependencies](04-dependencies.md) | Dependency tiers, lazy import conversion, minimal install |
| 05 | [Agent DX](05-agent-dx.md) | Agent discovery, `CLAUDE.md` management, Agent Skills |
| 06 | [Testing](06-testing.md) | Testing strategy post-extraction |
| 07 | [Migration](07-migration.md) | Migration path for existing servers, `create-mcp-server` CLI |
| 08 | [Pre-extraction Cleanup](08-pre-extraction.md) | DI/wiring fixes, dep placement bugs, lazy dep conversion, coupling fixes |
| 09 | [Execution Sequence](09-execution.md) | Phased execution with per-phase checklists |
| 10 | [Decisions](10-decisions.md) | Resolved decisions, open questions, decision log |
| 11 | [Consumer Workflow](11-consumer-workflow.md) | End-to-end walkthrough of building a server on core |
| 12 | [Developer API](12-developer-api.md) | Builders, `Context`, inline auth, task tools |

## Phase Summary

| Phase | Description | Status |
|:------|:------------|:-------|
| 1a | Fixes & hardening (deps, coupling, tests) | **Complete** |
| 1b | DI removal & `createApp()` | **Complete** |
| 2 | Lazy dependency conversion | Not started |
| 3 | Repo transformation (the extraction) | Not started |
| 4 | Validate with examples | Not started |
| 5 | Publish `@cyanheads/mcp-ts-core@0.1.0` | Not started |
| 6 | Create thin `mcp-ts-template` reference repo | Not started |
| 7 | Migrate downstream servers | Not started |
| 8 | Cut 1.0 | Not started |
| 9 | Build `create-mcp-server` (deferred) | Not started |

## Audience

These documents are **internal** — they describe how we build and maintain `@cyanheads/mcp-ts-core`. They are NOT shipped in the published package. Consumer-facing documentation (how to use the core package to build MCP servers) lives in `CLAUDE.md` and `skills/`, which ship with the package. See [05-agent-dx.md](05-agent-dx.md) for the full internal/external distinction.

## How to Use

- **Starting work on a phase?** Read the phase's checklist in [09-execution.md](09-execution.md), then the relevant detail docs.
- **Making a decision?** Log it in [10-decisions.md](10-decisions.md).
- **Updating the plan?** Edit the specific doc, not this README. Update phase status here when phases complete.
- **Source doc:** The original monolithic design doc is at [docs/mcp-ts-core-design.md](../docs/mcp-ts-core-design.md).
