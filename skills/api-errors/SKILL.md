---
name: api-errors
description: >
  McpError constructor, JsonRpcErrorCode reference, and error handling patterns for `@cyanheads/mcp-ts-core`. Use when looking up error codes, understanding where errors should be thrown vs. caught, or using ErrorHandler.tryCatch in services.
metadata:
  author: cyanheads
  version: "1.0"
  audience: external
  type: reference
---

## Overview

Error handling in `@cyanheads/mcp-ts-core` follows a strict layered pattern: tool and resource handlers throw `McpError` freely (no try/catch), the handler factory catches and normalizes all errors, and services use `ErrorHandler.tryCatch` for graceful recovery.

**Imports:**

```ts
import { notFound, validationError, McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';
import { ErrorHandler } from '@cyanheads/mcp-ts-core/utils';
```

---

## Error Factories (Preferred)

Ergonomic factory functions — shorter than `new McpError(...)` and self-documenting. All return `McpError` instances.

```ts
throw notFound('Item not found', { itemId: '123' });
throw validationError('Missing required field: name', { field: 'name' });
throw unauthorized('Token expired');
```

**Available factories:**

| Factory | Code |
|:--------|:-----|
| `invalidParams(msg, data?)` | InvalidParams (-32602) |
| `invalidRequest(msg, data?)` | InvalidRequest (-32600) |
| `notFound(msg, data?)` | NotFound (-32001) |
| `forbidden(msg, data?)` | Forbidden (-32005) |
| `unauthorized(msg, data?)` | Unauthorized (-32006) |
| `validationError(msg, data?)` | ValidationError (-32007) |
| `conflict(msg, data?)` | Conflict (-32002) |
| `rateLimited(msg, data?)` | RateLimited (-32003) |
| `timeout(msg, data?)` | Timeout (-32004) |
| `serviceUnavailable(msg, data?)` | ServiceUnavailable (-32000) |
| `configurationError(msg, data?)` | ConfigurationError (-32008) |

---

## McpError Constructor

For codes not covered by factories, or when you need `cause` chaining:

```ts
throw new McpError(code, message?, data?, options?)
```

- `code` — a `JsonRpcErrorCode` enum value
- `message` — optional human-readable description of the failure
- `data` — optional structured context (plain object)
- `options` — optional `{ cause?: unknown }` for error chaining

**Example:**

```ts
import { McpError, JsonRpcErrorCode } from '@cyanheads/mcp-ts-core/errors';

throw new McpError(JsonRpcErrorCode.DatabaseError, 'Connection pool exhausted', {
  pool: 'primary',
});
```

---

## Error Codes

**Standard JSON-RPC 2.0 codes:**

| Code | Value | When to Use |
|:-----|------:|:------------|
| `ParseError` | -32700 | Malformed JSON received |
| `InvalidRequest` | -32600 | Unsupported operation, missing client capability |
| `MethodNotFound` | -32601 | Requested method does not exist |
| `InvalidParams` | -32602 | Bad input, missing required fields, schema validation failure |
| `InternalError` | -32603 | Unexpected failure, catch-all for programmer errors |

**Implementation-defined codes (-32000 to -32099):**

| Code | Value | When to Use |
|:-----|------:|:------------|
| `ServiceUnavailable` | -32000 | External dependency down, upstream failure |
| `NotFound` | -32001 | Resource, entity, or record doesn't exist |
| `Conflict` | -32002 | Duplicate key, version mismatch, concurrent modification |
| `RateLimited` | -32003 | Rate limit exceeded |
| `Timeout` | -32004 | Operation exceeded time limit |
| `Forbidden` | -32005 | Authenticated but insufficient scopes/permissions |
| `Unauthorized` | -32006 | No auth, invalid token, expired credentials |
| `ValidationError` | -32007 | Business rule violation (not schema — use `InvalidParams` for that) |
| `ConfigurationError` | -32008 | Missing env var, invalid config |
| `InitializationFailed` | -32009 | Server/component startup failure |
| `DatabaseError` | -32010 | Storage/persistence layer failure |
| `SerializationError` | -32070 | Data serialization/deserialization failed |
| `UnknownError` | -32099 | Generic fallback when no other code fits |

---

## Where Errors Are Handled

| Layer | Pattern |
|:------|:--------|
| Tool/resource handlers | Throw `McpError` — no try/catch |
| Handler factory | Catches all errors, normalizes to `McpError`, sets `isError: true` |
| Services/setup code | `ErrorHandler.tryCatch` for graceful recovery |

**Handler — throw freely, no try/catch:**

```ts
import { notFound } from '@cyanheads/mcp-ts-core/errors';

export const myTool = tool('my_tool', {
  input: z.object({ id: z.string().describe('Item ID') }),
  async handler(input, ctx) {
    const item = await db.find(input.id);
    if (!item) {
      throw notFound(`Item not found: ${input.id}`, { id: input.id });
    }
    return item;
  },
});
```

---

## ErrorHandler.tryCatch (Services)

Use `ErrorHandler.tryCatch` in service code — not in tool handlers. It wraps arbitrary exceptions into `McpError` and supports structured logging context.

```ts
import { ErrorHandler } from '@cyanheads/mcp-ts-core/utils';

// Works with both async and sync functions
const result = await ErrorHandler.tryCatch(
  () => externalApi.fetch(url),
  {
    operation: 'ExternalApi.fetch',
    context: { url },
    errorCode: JsonRpcErrorCode.ServiceUnavailable,
  },
);

const parsed = await ErrorHandler.tryCatch(
  () => JSON.parse(raw),
  {
    operation: 'parseConfig',
    errorCode: JsonRpcErrorCode.ConfigurationError,
  },
);
```

`tryCatch` always logs and rethrows — it never swallows errors. The `fn` argument may be synchronous or return a `Promise`; both are handled via `Promise.resolve(fn())`.

**Options** (`Omit<ErrorHandlerOptions, 'rethrow'>`):

| Option | Type | Required | Purpose |
|:-------|:-----|:--------:|:--------|
| `operation` | `string` | Yes | Name logged with the error |
| `context` | `ErrorContext` | No | Extra structured fields merged into the log record; `requestId` and `timestamp` receive special treatment |
| `errorCode` | `JsonRpcErrorCode` | No | Code used if the caught error is not already an `McpError` |
| `input` | `unknown` | No | Input value sanitized and logged alongside the error |
| `critical` | `boolean` | No | Marks the error as critical in logs (default `false`) |
| `includeStack` | `boolean` | No | Include stack trace in log output (default `true`) |
| `errorMapper` | `(error: unknown) => Error` | No | Custom transform applied instead of default `McpError` wrapping |
