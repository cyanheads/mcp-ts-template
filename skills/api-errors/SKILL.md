---
name: api-errors
description: >
  McpError constructor, JsonRpcErrorCode reference, and error handling patterns for `@cyanheads/mcp-ts-core`. Use when looking up error codes, understanding where errors should be thrown vs. caught, or using ErrorHandler.tryCatch in services.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
---

## Overview

Error handling in `@cyanheads/mcp-ts-core` follows a strict layered pattern: tool and resource handlers throw `McpError` freely (no try/catch), the handler factory catches and normalizes all errors, and services use `ErrorHandler.tryCatch` for graceful recovery.

**Imports:**

```ts
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';
import { ErrorHandler } from '@cyanheads/mcp-ts-core/utils/errorHandler';
```

---

## McpError Constructor

```ts
throw new McpError(code, message, data?)
```

- `code` — a `JsonRpcErrorCode` enum value
- `message` — human-readable description of the failure
- `data` — optional structured context (plain object)

**Example:**

```ts
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';

throw new McpError(JsonRpcErrorCode.InvalidParams, 'Missing required field: name', {
  requestId: ctx.requestId,
  field: 'name',
});
```

---

## Error Codes

| Code | Value | When to Use |
|:-----|------:|:------------|
| `InvalidParams` | -32602 | Bad input, missing required fields, schema validation failure |
| `InvalidRequest` | -32600 | Unsupported operation, missing client capability |
| `NotFound` | -32001 | Resource, entity, or record doesn't exist |
| `Forbidden` | -32005 | Authenticated but insufficient scopes/permissions |
| `Unauthorized` | -32006 | No auth, invalid token, expired credentials |
| `RateLimited` | -32003 | Rate limit exceeded |
| `ServiceUnavailable` | -32000 | External dependency down, upstream failure |
| `Timeout` | -32004 | Operation exceeded time limit |
| `ConfigurationError` | -32008 | Missing env var, invalid config |
| `ValidationError` | -32007 | Business rule violation (not schema — use `InvalidParams` for that) |
| `Conflict` | -32002 | Duplicate key, version mismatch, concurrent modification |
| `InitializationFailed` | -32009 | Server/component startup failure |
| `DatabaseError` | -32010 | Storage/persistence layer failure |
| `InternalError` | -32603 | Unexpected failure, catch-all for programmer errors |

---

## Where Errors Are Handled

| Layer | Pattern |
|:------|:--------|
| Tool/resource handlers | Throw `McpError` — no try/catch |
| Handler factory | Catches all errors, normalizes to `McpError`, sets `isError: true` |
| Services/setup code | `ErrorHandler.tryCatch` for graceful recovery |

**Handler — throw freely, no try/catch:**

```ts
export const myTool = tool('my_tool', {
  input: z.object({ id: z.string().describe('Item ID') }),
  async handler(input, ctx) {
    const item = await db.find(input.id);
    if (!item) {
      throw new McpError(JsonRpcErrorCode.NotFound, `Item not found: ${input.id}`, {
        id: input.id,
      });
    }
    return item;
  },
});
```

---

## ErrorHandler.tryCatch (Services)

Use `ErrorHandler.tryCatch` in service code — not in tool handlers. It wraps arbitrary exceptions into `McpError` and supports structured logging context.

```ts
import { ErrorHandler } from '@cyanheads/mcp-ts-core/utils/errorHandler';

// Async
const result = await ErrorHandler.tryCatch(
  () => externalApi.fetch(url),
  {
    operation: 'ExternalApi.fetch',
    context: { url },
    errorCode: JsonRpcErrorCode.ServiceUnavailable,
  },
);

// Sync
const parsed = ErrorHandler.tryCatchSync(
  () => JSON.parse(raw),
  {
    operation: 'parseConfig',
    errorCode: JsonRpcErrorCode.ConfigurationError,
  },
);
```

**Options:**

| Option | Type | Purpose |
|:-------|:-----|:--------|
| `operation` | `string` | Name logged with the error |
| `context` | `object` | Extra structured fields attached to the error |
| `errorCode` | `JsonRpcErrorCode` | Code used if the caught error is not already an `McpError` |
| `input` | `unknown` | Input value logged alongside the error |
