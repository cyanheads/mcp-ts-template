# MCP Conformance Test Plan

**Version:** 1.0.0
**Target Spec:** MCP 2025-06-18 (SDK `LATEST_PROTOCOL_VERSION` is `2025-11-25`; codebase targets `2025-06-18`)
**SDK:** `@modelcontextprotocol/sdk` ^1.27.1
**Created:** 2026-03-09

---

## Overview

This plan defines a comprehensive conformance testing strategy that validates the server against every testable requirement in the MCP specification, tracks every protocol message exchanged, and exercises all three transport paths (InMemory, stdio, HTTP).

Three layers, ordered by effort-to-value ratio:

| Layer | Purpose | Transport | Speed |
|:------|:--------|:----------|:------|
| **1. Protocol Conformance** | Spec compliance for every capability | InMemoryTransport | Fast (~2s) |
| **2. Wire-Level Recording** | Full audit trail of every JSON-RPC message | InMemoryTransport (wrapped) | Fast |
| **3. Transport Integration** | Real stdio process + real HTTP server | stdio, Streamable HTTP | Slow (~10-30s) |

Layers 1 and 2 share the same harness (`createConformanceHarness`) and run together. Layer 3 is a separate Vitest config because it requires a built server and is inherently slower.

---

## Table of Contents

- [Current State](#current-state)
- [Layer 1: Protocol Conformance](#layer-1-protocol-conformance)
  - [Existing Coverage](#existing-coverage)
  - [New Test Files](#new-test-files)
  - [1.1 Cancellation](#11-cancellation)
  - [1.2 Progress](#12-progress)
  - [1.3 Logging](#13-logging)
  - [1.4 Pagination](#14-pagination)
  - [1.5 Completions](#15-completions)
  - [1.6 Resource Subscriptions](#16-resource-subscriptions)
  - [1.7 List Change Notifications](#17-list-change-notifications)
  - [1.8 Roots](#18-roots)
  - [1.9 Elicitation](#19-elicitation)
  - [1.10 Sampling](#110-sampling)
  - [1.11 Tasks API](#111-tasks-api)
  - [1.12 Version Negotiation](#112-version-negotiation)
  - [1.13 JSON-RPC Edge Cases](#113-json-rpc-edge-cases)
- [Layer 2: Wire-Level Recording](#layer-2-wire-level-recording)
  - [2.1 RecordingTransport](#21-recordingtransport)
  - [2.2 Harness Integration](#22-harness-integration)
  - [2.3 Protocol Ordering Assertions](#23-protocol-ordering-assertions)
  - [2.4 Audit Output](#24-audit-output)
- [Layer 3: Transport Integration](#layer-3-transport-integration)
  - [3.1 Stdio Integration](#31-stdio-integration)
  - [3.2 HTTP Integration](#32-http-integration)
  - [3.3 Auth Integration](#33-auth-integration)
  - [3.4 Session Management](#34-session-management)
- [Infrastructure](#infrastructure)
  - [File Layout](#file-layout)
  - [Vitest Configuration](#vitest-configuration)
  - [Helper Utilities](#helper-utilities)
  - [CI Integration](#ci-integration)
- [Spec Coverage Matrix](#spec-coverage-matrix)
- [Implementation Order](#implementation-order)

---

## Current State

### Existing Coverage

The conformance suite lives in `tests/conformance/` and uses a real `McpServer` wired to an SDK `Client` over `InMemoryTransport`. No mocks. The harness (`tests/conformance/helpers/server-harness.ts`) calls `createApp()` to build the full server, then connects via `InMemoryTransport.createLinkedPair()`.

| File | What it tests |
|:-----|:-------------|
| `protocol-init.test.ts` | Initialize handshake, server identity, capability advertisement, ping |
| `lifecycle.test.ts` | Connect/disconnect cycles, concurrent tool calls, concurrent mixed ops, post-close rejection |
| `tools.test.ts` | listTools, tool invocation, structured content, annotations, outputSchema, error handling, smoke tests for all self-contained tools |
| `resources.test.ts` | listResources, resource templates, readResource, invalid URI |
| `prompts.test.ts` | listPrompts, prompt arguments, getPrompt, unknown prompt |

### Implementation Status

All planned conformance and integration tests have been implemented. **122 tests across 19 conformance files** plus **4 integration test files** covering stdio, HTTP, auth, and session management.

**Known SDK limitations documented in tests:**
- `elicitInput` / `createMessage` live on the `Server` class, not `RequestHandlerExtra` — tool duck-type checks fail at runtime
- `getTaskResult` triggers a Zod 4 compat error in SDK 1.27.x (`isZ4Schema` receives undefined schema)
- Integration tests skip when `dist/index.js` is not built (`bun run build` first)

---

## Layer 1: Protocol Conformance

### New Test Files

```
tests/conformance/
  cancellation.test.ts        # 1.1
  progress.test.ts            # 1.2
  logging.test.ts             # 1.3
  pagination.test.ts          # 1.4
  completions.test.ts         # 1.5
  subscriptions.test.ts       # 1.6
  list-changed.test.ts        # 1.7
  roots.test.ts               # 1.8
  elicitation.test.ts         # 1.9
  sampling.test.ts            # 1.10
  tasks.test.ts               # 1.11
  version-negotiation.test.ts # 1.12
  jsonrpc-edge-cases.test.ts  # 1.13
```

All tests use `createConformanceHarness()` from the existing harness. The harness already accepts optional `ClientCapabilities` for tests that need elicitation, sampling, or roots.

---

### 1.1 Cancellation

**Spec ref:** `2025-06-18/utils/cancellation`

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Client sends `notifications/cancelled` for in-progress request; server stops processing | SHOULD stop processing |
| AbortSignal fires on server side when cancel received | Implementation detail, but critical for tool logic |
| Cancellation of already-completed request is silently ignored | SHOULD be ignored |
| Cancellation of unknown request ID is silently ignored | SHOULD be ignored |
| `initialize` request cannot be cancelled (client-side invariant) | MUST NOT |

**Approach:**

The existing `template_echo_message` completes too fast to cancel mid-flight. Options:

1. **Use the task tool** (`template_async_countdown`) with a multi-second countdown -- cancel during the countdown.
2. **Create a test-only tool** that blocks on a Promise and resolves only when signaled, giving deterministic control over cancellation timing.

Option 2 is more reliable. Register a test-only tool in the harness that waits for a signal, then send `notifications/cancelled` while it's blocked. Verify the abort signal fires and the tool stops.

```ts
// Pseudocode for the test-only blocking tool
const blocker = Promise.withResolvers<void>();
// Register tool whose logic awaits blocker.promise, respecting sdkContext.signal
// Client calls tool with an AbortController, then aborts mid-flight:
const ac = new AbortController();
const toolPromise = client.callTool(
  { name: 'test_blocking_tool', arguments: {} },
  undefined,
  { signal: ac.signal },
);
// Cancel while tool is still blocked
ac.abort();
// Assert: server-side sdkContext.signal fires, tool logic stops
// The client-side toolPromise rejects with AbortError
await expect(toolPromise).rejects.toThrow(/abort/i);
```

**Implementation notes:**

- The SDK `Client` supports cancellation via `AbortSignal` in `RequestOptions`. Pass `{ signal: abortController.signal }` as the `options` parameter to `callTool()` or any request method. When `abortController.abort()` is called, the SDK automatically sends `notifications/cancelled` to the server and the server's `sdkContext.signal` fires.
- Example: `const ac = new AbortController(); client.callTool(params, undefined, { signal: ac.signal }); ac.abort();`
- There is no `cancel(requestId)` method — `AbortController` is the intended API.

---

### 1.2 Progress

**Spec ref:** `2025-06-18/utils/progress`

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Client sends `progressToken` in `_meta`; server emits `notifications/progress` | MAY send progress |
| Progress values increase monotonically | MUST increase |
| `total` is optional in progress notifications | MAY omit total |
| `message` field provides human-readable status | SHOULD provide |
| Progress notifications stop after response | MUST stop after completion |
| No progress notifications when no `progressToken` provided | MUST only reference active tokens |

**Approach:**

The task tool (`template_async_countdown`) emits progress via `taskStore.updateTaskStatus`. However, that's the Tasks API, not the base progress protocol.

For base protocol progress testing, you need a tool whose logic calls `sdkContext.sendNotification` with `notifications/progress`. This requires either:

1. A test-only tool that emits progress notifications.
2. Verify progress via the task tool's `notifications/progress` emissions (if the SDK's task handlers emit standard progress notifications -- check this).

The cleanest approach: add a test-only tool registered only in the conformance harness that:
- Accepts a `_meta.progressToken` from the request
- Emits 3-4 progress notifications with increasing values
- Completes with a result

On the client side, collect progress notifications and assert ordering, value monotonicity, and that they stop after the response.

```ts
// Client-side collection
const progressUpdates: ProgressNotification[] = [];
client.setNotificationHandler(
  { method: 'notifications/progress' },
  (notification) => { progressUpdates.push(notification.params); }
);

await client.callTool({
  name: 'test_progress_tool',
  arguments: {},
}, { _meta: { progressToken: 'test-token-1' } });

expect(progressUpdates.length).toBeGreaterThanOrEqual(3);
for (let i = 1; i < progressUpdates.length; i++) {
  expect(progressUpdates[i].progress).toBeGreaterThan(progressUpdates[i-1].progress);
}
```

---

### 1.3 Logging

**Spec ref:** `2025-06-18/utils/logging`

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Server declares `logging` capability | MUST declare if emitting log notifications |
| Client sends `logging/setLevel`; server acknowledges | Empty result response |
| Server respects minimum log level (emits only >= set level) | Implicit from spec |
| Log notifications have valid `level`, optional `logger`, optional `data` | Message format |
| Invalid log level in `logging/setLevel` returns -32602 | SHOULD return standard error |
| All 8 syslog levels are valid | RFC 5424 levels |

**Approach:**

- Verify the `logging` capability is declared (already tested in `protocol-init.test.ts`, but re-verify here for completeness).
- Call `client.setLoggingLevel('debug')` -- the SDK client should support this.
- Trigger a tool call that causes the server to log (any tool will do).
- Collect `notifications/message` on the client.
- Then set level to `error` and repeat -- verify no `debug`/`info` messages arrive.

```ts
const logMessages: LoggingMessageNotification[] = [];
client.setNotificationHandler(
  { method: 'notifications/message' },
  (notification) => { logMessages.push(notification.params); }
);

await client.setLoggingLevel('debug');
await client.callTool({ name: 'template_echo_message', arguments: { message: 'log-test' } });

// Should have received some log messages
expect(logMessages.length).toBeGreaterThan(0);
for (const msg of logMessages) {
  expect(['debug','info','notice','warning','error','critical','alert','emergency']).toContain(msg.level);
}
```

**Implementation note:** The server uses `logger` (pino) internally. Whether those logs get forwarded as MCP `notifications/message` depends on whether the SDK/server bridges pino logs to MCP log notifications. If not, this test will expose that gap, which is itself valuable -- it means the `logging` capability is declared but not functional.

---

### 1.4 Pagination

**Spec ref:** `2025-06-18/utils/pagination`

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| `tools/list` returns all tools without cursor (single page) | Baseline |
| `resources/list` supports pagination when result set is large | SHOULD paginate large sets |
| `prompts/list` supports pagination | Same |
| `nextCursor` is omitted when all results fit in one page | MUST treat missing nextCursor as end |
| Invalid cursor returns -32602 | SHOULD result in error |
| Cursor is opaque (server determines format) | MUST treat as opaque |
| Paginated results are complete (union of all pages = full list) | Completeness invariant |

**Approach:**

The template server has a small number of tools/resources/prompts, so pagination won't naturally trigger. Two options:

1. **Force small page size** -- if the SDK/server allows configuring page size, set it to 1 or 2 to force pagination even with few items.
2. **Register many test items** -- programmatically register 20+ tools in the test harness to exceed the default page size.

Option 1 is cleaner if the server supports it. If not, option 2 works but is noisier.

For invalid cursor testing, send a garbage cursor string and assert -32602.

```ts
// Walk all pages
let cursor: string | undefined;
const allTools: ToolInfo[] = [];
do {
  const result = await client.listTools(cursor ? { cursor } : {});
  allTools.push(...result.tools);
  cursor = result.nextCursor;
} while (cursor);

expect(allTools.length).toBe(expectedTotal);
```

---

### 1.5 Completions

**Spec ref:** `2025-06-18/utils/completion`

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Server declares `completions` capability (if supported) | MUST declare |
| `completion/complete` with `ref/prompt` returns suggestions | Basic flow |
| `completion/complete` with `ref/resource` returns suggestions | Basic flow |
| Max 100 items per response | Server SHOULD |
| `hasMore` and `total` are returned | Optional fields |
| Invalid prompt name returns -32602 | SHOULD return standard error |
| Context arguments are passed for multi-argument completions | Contextual completions |

**Approach:**

Check whether the server currently declares the `completions` capability. Per `server.ts`, it does **not** -- the declared capabilities are `logging`, `resources`, `tools`, `prompts`, and `tasks`. So this test would verify that `completion/complete` is correctly rejected (method not found, -32601) or, if we choose to implement completions, validate the happy path.

**Decision:** Add a test that verifies the server either:
- Supports completions and returns valid results, or
- Does not declare the capability and rejects completion requests appropriately.

This makes the test forward-compatible.

---

### 1.6 Resource Subscriptions

**Spec ref:** `2025-06-18/server/resources` (subscribe section)

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Server declares `resources.subscribe` capability (if supported) | MUST declare |
| `resources/subscribe` with valid URI succeeds | Basic flow |
| `resources/unsubscribe` removes subscription | Basic flow |
| Server emits `notifications/resources/updated` when subscribed resource changes | Notification |
| Subscribe to non-existent resource returns error | Error handling |

**Approach:**

Check the server's declared capabilities. Per `server.ts`:
```ts
resources: { listChanged: true }
```

`subscribe` is **not** declared. So this test should verify that subscription requests are appropriately rejected. Document that subscription support is not implemented.

If we later implement subscriptions, this test becomes a full validation suite.

---

### 1.7 List Change Notifications

**Spec ref:** `2025-06-18/basic/lifecycle` (capability negotiation, listChanged)

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Server declares `tools.listChanged: true` | MUST declare if supporting |
| Server declares `resources.listChanged: true` | Same |
| Server declares `prompts.listChanged: true` | Same |
| When a tool is added/removed at runtime, `notifications/tools/list_changed` is emitted | Should emit |
| When a resource is added/removed at runtime, `notifications/resources/list_changed` is emitted | Should emit |
| When a prompt is added/removed at runtime, `notifications/prompts/list_changed` is emitted | Should emit |

**Approach:**

The server declares `listChanged: true` for all three. To test emission:

1. Connect client and collect notifications.
2. Programmatically add a tool via `McpServer.tool()` — it returns a `RegisteredTool` handle with `.remove()`, `.enable()`, `.disable()`, `.update()` methods.
3. Assert that a `notifications/tools/list_changed` notification arrives.
4. Call `listTools` again and verify the new tool is in the list.
5. Call `handle.remove()` on the registered tool, assert another `list_changed` notification, and verify it's gone from `listTools`.

**Note:** There is no `McpServer.removeTool(name)` method. Removal is done via the handle returned by `server.tool()`.

```ts
const listChangedEvents: void[] = [];
const listChangedReceived = Promise.withResolvers<void>();
client.setNotificationHandler(
  { method: 'notifications/tools/list_changed' },
  () => {
    listChangedEvents.push();
    listChangedReceived.resolve();
  }
);

// Add a tool at runtime — returns a RegisteredTool handle
const handle = harness.server.tool('runtime_test_tool', { message: z.string() }, async (args) => ({
  content: [{ type: 'text', text: args.message }],
}));

await listChangedReceived.promise; // Should resolve quickly

const { tools } = await client.listTools();
const added = tools.find(t => t.name === 'runtime_test_tool');
expect(added).toBeDefined();

// Remove via handle
const removeReceived = Promise.withResolvers<void>();
client.setNotificationHandler(
  { method: 'notifications/tools/list_changed' },
  () => { removeReceived.resolve(); }
);
handle.remove();
await removeReceived.promise;

const { tools: afterRemove } = await client.listTools();
expect(afterRemove.find(t => t.name === 'runtime_test_tool')).toBeUndefined();
```

---

### 1.8 Roots

**Spec ref:** `2025-06-18/client/roots`

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Client declares `roots` capability; server can list roots | Basic flow |
| Client with `roots.listChanged` sends `notifications/roots/list_changed` | Notification |
| Server receives root URIs from client | Root discovery |
| Roots are accessible from server-side code | Implementation detail |

**Approach:**

Create the harness with `roots` capability:
```ts
const harness = await createConformanceHarness({
  roots: { listChanged: true },
});
```

The SDK `Client` class allows setting roots. Set some roots on the client, then verify the server can access them via `sdkContext`.

**Implementation note:** The `RootsRegistry` currently just logs that roots are enabled. The actual root retrieval would happen via `sdkContext.sendRequest({ method: 'roots/list' })` from within tool logic. This test may expose that root retrieval is not wired up end-to-end, which is valuable feedback.

---

### 1.9 Elicitation

**Spec ref:** `2025-06-18/client/elicitation`

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Client declares `elicitation` capability; tool can call `elicitInput` | Basic flow |
| Elicitation returns user-provided values | Round-trip |
| Tool gracefully handles when client does NOT support elicitation | Capability gating |
| Elicitation with schema validates returned data | Validation |

**Approach:**

Use `template_madlibs_elicitation` -- it already calls `sdkContext.elicitInput()` when fields are missing.

```ts
// Client WITH elicitation support
const harness = await createConformanceHarness({
  elicitation: {},
});

// Mock the elicitation handler on the client
client.setRequestHandler(
  { method: 'elicitation/create' },
  async (request) => ({
    action: 'accept',
    content: { noun: 'cat', verb: 'jumped', adjective: 'fluffy' },
  })
);

// Call tool with missing fields -- should trigger elicitation
const result = await client.callTool({
  name: 'template_madlibs_elicitation',
  arguments: {}, // All fields missing
});

// Should succeed with elicited values
expect(result.isError).toBeFalsy();
```

For the "no elicitation" case:
```ts
// Client WITHOUT elicitation support
const harness = await createConformanceHarness({}); // No elicitation capability

const result = await client.callTool({
  name: 'template_madlibs_elicitation',
  arguments: {}, // All fields missing
});

// Should return error because elicitation is unavailable
expect(result.isError).toBe(true);
```

---

### 1.10 Sampling

**Spec ref:** `2025-06-18/client/sampling`

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Client declares `sampling` capability; tool can call `createMessage` | Basic flow |
| Sampling returns LLM-generated response | Round-trip |
| Tool gracefully handles when client does NOT support sampling | Capability gating |
| Model preferences / hints are passed through | Optional field |

**Approach:**

Use `template_code_review_sampling` -- it already calls `sdkContext.createMessage()`.

```ts
// Client WITH sampling support
const harness = await createConformanceHarness({
  sampling: {},
});

// Mock the sampling handler on the client
client.setRequestHandler(
  { method: 'sampling/createMessage' },
  async (request) => ({
    role: 'assistant',
    content: { type: 'text', text: 'LGTM - code looks clean.' },
    model: 'mock-model',
    stopReason: 'endTurn',
  })
);

const result = await client.callTool({
  name: 'template_code_review_sampling',
  arguments: { code: 'const x = 1;' },
});

expect(result.isError).toBeFalsy();
```

---

### 1.11 Tasks API

**Spec ref:** `2025-06-18/utils/tasks` (experimental)

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Task tool creates a task and returns task handle | createTask flow |
| Polling returns current status (`working`, progress message) | getTask flow |
| Completed task returns result via `getTaskResult` | Terminal state |
| Cancelled task transitions to `cancelled` status | Cancel flow |
| Failed task (simulateFailure) transitions to `failed` | Error path |
| Task TTL is respected | Expiration |
| `tasks/list` returns active tasks | List capability |

**Approach:**

Use `template_async_countdown` with short durations (1-3 seconds).

**SDK note:** Task methods live on `client.experimental.tasks`, not directly on `Client`. Key methods: `getTask(taskId)`, `getTaskResult(taskId, schema?)`, `cancelTask(taskId)`, `listTasks(cursor?)`.

```ts
const tasks = client.experimental.tasks;

// Start a countdown task
const response = await client.callTool({
  name: 'template_async_countdown',
  arguments: { seconds: 2 },
});

// Should have a task handle
expect(response.task).toBeDefined();
const { taskId } = response.task;

// Poll until complete
let task = await tasks.getTask(taskId);
while (task.status === 'working') {
  expect(task.statusMessage).toBeTruthy(); // Has progress message
  await new Promise(r => setTimeout(r, task.pollInterval ?? 500));
  task = await tasks.getTask(taskId);
}

expect(task.status).toBe('completed');

// Get result
const result = await tasks.getTaskResult(taskId);
expect(result.structuredContent).toBeDefined();
expect(result.structuredContent.success).toBe(true);
```

For cancellation:
```ts
const tasks = client.experimental.tasks;

const response = await client.callTool({
  name: 'template_async_countdown',
  arguments: { seconds: 10 }, // Long enough to cancel mid-flight
});
const { taskId } = response.task;

// Wait briefly then cancel
await new Promise(r => setTimeout(r, 1000));
await tasks.cancelTask(taskId);

const task = await tasks.getTask(taskId);
expect(task.status).toBe('cancelled');
```

---

### 1.12 Version Negotiation

**Spec ref:** `2025-06-18/basic/lifecycle` (version negotiation)

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Client and server agree on compatible version | Happy path |
| Server returns supported version when client sends unsupported version | MUST respond with supported version |
| Protocol version is reflected in server response | Initialize response |

**Approach:**

This is tricky with the high-level SDK Client because it handles version negotiation internally. Options:

1. **Low-level transport test:** Use `InMemoryTransport` directly (without the SDK Client) to send raw JSON-RPC initialize messages with incorrect protocol versions.
2. **Use the SDK's `protocolVersion` option** on the Client constructor if available.

Option 1 gives the most control:
```ts
const { createServer } = createApp();
const server = await createServer();
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);

// Send raw initialize with unsupported version
clientTransport.send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '1999-01-01', // Unsupported
    capabilities: {},
    clientInfo: { name: 'test', version: '1.0.0' },
  },
});

// Collect response — arrives on clientTransport (server responds via serverTransport,
// which is linked to clientTransport.onmessage)
const response = await collectNextMessage(clientTransport);
// Server MUST respond with a version it supports
expect(response.result.protocolVersion).not.toBe('1999-01-01');
expect(SUPPORTED_PROTOCOL_VERSIONS).toContain(response.result.protocolVersion);
```

---

### 1.13 JSON-RPC Edge Cases

**Spec ref:** `2025-06-18/basic/index` (messages)

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Unknown method returns -32601 (Method not found) | JSON-RPC 2.0 |
| Missing `jsonrpc: "2.0"` field is rejected | JSON-RPC 2.0 |
| Request with `id: null` is rejected | MCP: MUST NOT be null |
| Request without `id` (notification) is handled correctly | JSON-RPC 2.0 |
| Duplicate request IDs within a session are handled | MCP: MUST NOT reuse |
| Extra fields in request are ignored | JSON-RPC 2.0 |

**Approach:**

Use low-level transport (same as 1.12) to send malformed JSON-RPC messages:

```ts
const { createServer } = createApp();
const server = await createServer();
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);

// Unknown method
clientTransport.send({
  jsonrpc: '2.0',
  id: 99,
  method: 'nonexistent/method',
  params: {},
});

// Collect response from clientTransport (linked to serverTransport)
const response = await collectNextMessage(clientTransport);
expect(response.error).toBeDefined();
expect(response.error.code).toBe(-32601);
```

**Note:** Some of these tests depend on what the SDK handles vs. what reaches the server. The SDK may swallow certain errors before they reach our code. That's fine -- the test still validates the behavior the client sees.

---

## Layer 2: Wire-Level Recording

### 2.1 RecordingTransport

A transparent wrapper around any `Transport` that captures every message in both directions with timestamps.

**Location:** `tests/conformance/helpers/recording-transport.ts`

```ts
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

export interface RecordedMessage {
  /** Monotonic timestamp (performance.now()) */
  timestamp: number;
  /** Which direction the message traveled */
  direction: 'client-to-server' | 'server-to-client';
  /** The raw JSON-RPC message */
  message: JSONRPCMessage;
  /** Extracted method name (requests/notifications) or null (responses) */
  method: string | null;
  /** Message ID (requests/responses) or null (notifications) */
  id: string | number | null;
}

export class RecordingTransport implements Transport {
  readonly messages: RecordedMessage[] = [];

  constructor(
    private inner: Transport,
    private direction: 'client-to-server' | 'server-to-client',
  ) {}

  get onclose() { return this.inner.onclose; }
  set onclose(v) { this.inner.onclose = v; }
  get onerror() { return this.inner.onerror; }
  set onerror(v) { this.inner.onerror = v; }

  get onmessage() { return this.inner.onmessage; }
  set onmessage(handler) {
    this.inner.onmessage = (msg) => {
      this.record(msg, this.oppositeDirection());
      handler?.(msg);
    };
  }

  async start() { return this.inner.start(); }
  async close() { return this.inner.close(); }
  get sessionId() { return (this.inner as { sessionId?: string }).sessionId; }

  async send(message: JSONRPCMessage) {
    this.record(message, this.direction);
    return this.inner.send(message);
  }

  // --- Query helpers ---

  /** All messages with the given method name */
  byMethod(method: string): RecordedMessage[] {
    return this.messages.filter(m => m.method === method);
  }

  /** All messages in a given direction */
  byDirection(dir: RecordedMessage['direction']): RecordedMessage[] {
    return this.messages.filter(m => m.direction === dir);
  }

  /** Methods in chronological order (for ordering assertions) */
  methodSequence(): (string | null)[] {
    return this.messages.map(m => m.method);
  }

  /** Full dump for debugging */
  dump(): string {
    return this.messages
      .map(m => `[${m.timestamp.toFixed(1)}ms] ${m.direction} ${m.method ?? `response(${m.id})`}`)
      .join('\n');
  }

  // --- Internals ---

  private record(msg: JSONRPCMessage, direction: RecordedMessage['direction']) {
    this.messages.push({
      timestamp: performance.now(),
      direction,
      message: msg,
      method: 'method' in msg ? msg.method : null,
      id: 'id' in msg ? msg.id : null,
    });
  }

  private oppositeDirection(): RecordedMessage['direction'] {
    return this.direction === 'client-to-server' ? 'server-to-client' : 'client-to-server';
  }
}
```

### 2.2 Harness Integration

Modify `createConformanceHarness` to optionally wrap transports with `RecordingTransport`.

**Note:** This wraps only the client-side transport, producing a single-sided trace. Client-sent messages are recorded directly; server-sent messages (including server-initiated notifications like `notifications/message`) are captured when they arrive at `clientTransport.onmessage`. This is sufficient for all protocol ordering assertions, but be aware that the trace reflects the client's view, not a true bidirectional wiretap.

```ts
export interface ConformanceHarness {
  cleanup: () => Promise<void>;
  client: Client;
  server: McpServer;
  /** Available when recording is enabled */
  recorder?: RecordingTransport;
}

export async function createConformanceHarness(
  clientCapabilities?: ClientCapabilities,
  options?: { recording?: boolean },
): Promise<ConformanceHarness> {
  const { createServer } = createApp();
  const server = await createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  let recorder: RecordingTransport | undefined;
  let effectiveClientTransport: Transport = clientTransport;

  if (options?.recording) {
    recorder = new RecordingTransport(clientTransport, 'client-to-server');
    effectiveClientTransport = recorder;
  }

  const client = new Client(
    { name: 'conformance-test-client', version: '1.0.0' },
    clientCapabilities ? { capabilities: clientCapabilities } : {},
  );

  await server.connect(serverTransport);
  await client.connect(effectiveClientTransport);

  return {
    client,
    server,
    recorder,
    cleanup: async () => {
      await client.close();
      await server.close();
    },
  };
}
```

### 2.3 Protocol Ordering Assertions

A dedicated test file that validates protocol invariants across the full message trace.

**Location:** `tests/conformance/protocol-ordering.test.ts`

| Assertion | What it validates |
|:----------|:-----------------|
| First client message is `initialize` | Lifecycle ordering |
| Server response to `initialize` contains `protocolVersion` | Handshake |
| `notifications/initialized` follows `initialize` response | Lifecycle ordering |
| No non-ping requests before `initialize` completes | SHOULD NOT |
| All request IDs are unique within a session | MUST NOT reuse |
| Every request has exactly one response | JSON-RPC completeness |
| All notification directions are correct (client vs server) | Protocol correctness |

```ts
it('follows correct initialization sequence', async () => {
  const { client, cleanup, recorder } = await createConformanceHarness({}, { recording: true });

  // Do some operations to generate a trace
  await client.listTools();
  await client.callTool({ name: 'template_echo_message', arguments: { message: 'test' } });
  await cleanup();

  const methods = recorder!.methodSequence();

  // First message must be initialize
  expect(methods[0]).toBe('initialize');
  // Second client message must be initialized notification
  const clientMethods = recorder!
    .byDirection('client-to-server')
    .map(m => m.method);
  expect(clientMethods[0]).toBe('initialize');
  expect(clientMethods[1]).toBe('notifications/initialized');

  // All request IDs are unique
  const ids = recorder!.messages
    .filter(m => m.id !== null)
    .map(m => m.id);
  const requestIds = recorder!
    .byDirection('client-to-server')
    .filter(m => m.id !== null)
    .map(m => m.id);
  expect(new Set(requestIds).size).toBe(requestIds.length);
});
```

### 2.4 Audit Output

For CI/debugging, optionally write the full message trace to a file:

```ts
afterAll(async () => {
  if (recorder && process.env.CONFORMANCE_DUMP) {
    const dump = JSON.stringify(recorder.messages, null, 2);
    await fs.writeFile('conformance-trace.json', dump);
  }
  await cleanup();
});
```

This gives a full JSON audit trail of every message exchanged during the test run.

---

## Layer 3: Transport Integration

These tests validate the actual deployment paths -- spawning a real server process (stdio) or starting a real HTTP server. They are slower, require a built server (`bun run build`), and live in a separate Vitest config.

### 3.1 Stdio Integration

**Location:** `tests/integration/stdio.test.ts`

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Server launches as subprocess, completes handshake | stdio transport |
| Messages are newline-delimited on stdout | MUST be newline-delimited |
| Server does not write non-MCP data to stdout | MUST NOT |
| Server may write to stderr (logging) | MAY |
| Tool invocation works end-to-end over stdio | Full stack |
| Client closes stdin; server exits cleanly | Shutdown |

**Approach:**

```ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['dist/index.js'],
  env: {
    ...process.env,
    MCP_TRANSPORT_TYPE: 'stdio',
    LOG_LEVEL: 'error', // Reduce noise
  },
});

const client = new Client({ name: 'stdio-integration', version: '1.0.0' });
await client.connect(transport);

// Verify handshake
const version = client.getServerVersion();
expect(version?.name).toBeTruthy();

// Tool call
const result = await client.callTool({
  name: 'template_echo_message',
  arguments: { message: 'stdio-test' },
});
expect(result.isError).toBeFalsy();

// Clean shutdown
await client.close();
```

**Prerequisite:** `bun run build` must have been run. The test should check for `dist/index.js` and skip with a clear message if not found.

### 3.2 HTTP Integration

**Location:** `tests/integration/http.test.ts`

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Server starts on HTTP port, completes handshake | Streamable HTTP |
| POST to MCP endpoint with JSON-RPC request | MUST use POST |
| `Accept` header includes `application/json` and `text/event-stream` | MUST include |
| `MCP-Protocol-Version` header is required on subsequent requests | MUST include |
| SSE stream delivers server messages | Streamable HTTP |
| GET to MCP endpoint returns info (without SSE accept) | Server implementation |
| GET to MCP endpoint with SSE accept opens stream | MUST return SSE |
| `/healthz` is accessible without auth | Unprotected endpoint |
| Unsupported `MCP-Protocol-Version` returns 400 | MUST respond 400 |
| Missing `MCP-Protocol-Version` defaults to `2025-03-26` | Server fallback behavior |
| CORS headers are present | Configuration |

**Approach:**

Two sub-approaches:

**A. SDK Client over StreamableHTTPClientTransport:**
```ts
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Start server in background (child process or in-process)
const serverProcess = spawn('node', ['dist/index.js'], {
  env: { ...process.env, MCP_TRANSPORT_TYPE: 'http', MCP_HTTP_PORT: '0' },
});

// Wait for server to be ready (parse port from stdout)
const port = await waitForServerReady(serverProcess);

const transport = new StreamableHTTPClientTransport(
  new URL(`http://localhost:${port}/mcp`)
);
const client = new Client({ name: 'http-integration', version: '1.0.0' });
await client.connect(transport);

// Same test operations as stdio
```

**B. Direct HTTP requests (for header/protocol validation):**
```ts
// Initialize request — MCP-Protocol-Version header is NOT required on the initial request,
// only on subsequent requests after version negotiation.
const initResponse = await fetch(`http://localhost:${port}/mcp`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'raw-http-test', version: '1.0.0' },
    },
  }),
});

expect(initResponse.ok).toBe(true);
const contentType = initResponse.headers.get('content-type');
expect(
  contentType?.includes('application/json') || contentType?.includes('text/event-stream')
).toBe(true);

// Subsequent request — MUST include MCP-Protocol-Version
const sessionId = initResponse.headers.get('mcp-session-id');
const toolsResponse = await fetch(`http://localhost:${port}/mcp`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'MCP-Protocol-Version': '2025-06-18',
    ...(sessionId && { 'Mcp-Session-Id': sessionId }),
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  }),
});
expect(toolsResponse.ok).toBe(true);

// Protocol version fallback — missing header defaults to 2025-03-26 in our implementation
// (see httpTransport.ts:245). Verify the server accepts the request.
const fallbackResponse = await fetch(`http://localhost:${port}/mcp`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    // No MCP-Protocol-Version header — server should use DEFAULT_NEGOTIATED_PROTOCOL_VERSION
    ...(sessionId && { 'Mcp-Session-Id': sessionId }),
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/list',
    params: {},
  }),
});
expect(fallbackResponse.ok).toBe(true);
```

### 3.3 Auth Integration

**Location:** `tests/integration/http-auth.test.ts`

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| With `MCP_AUTH_MODE=jwt`: unauthenticated request to POST /mcp returns 401 | Auth enforcement |
| Valid JWT grants access | Auth flow |
| Expired JWT returns 401 | Token validation |
| Insufficient scopes return 403 (via `withToolAuth`) | Scope enforcement |
| GET /mcp (info) and /healthz are accessible without auth | Unprotected endpoints |
| `/.well-known/oauth-protected-resource` returns metadata | RFC 9728 |

**Approach:**

Start the server with `MCP_AUTH_MODE=jwt` and `MCP_AUTH_SECRET_KEY=test-secret`. Generate JWTs with known claims and test each scenario.

**Dependency note:** Requires `jsonwebtoken` as a devDependency (`bun add -d jsonwebtoken @types/jsonwebtoken`), or use Node's `crypto.createHmac` / `crypto.sign` to construct test JWTs manually.

```ts
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { sub: 'test-user', cid: 'test-client', scp: ['tool:echo:read'], tid: 'test-tenant' },
  'test-secret',
  { expiresIn: '5m' },
);

const response = await fetch(`http://localhost:${port}/mcp`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'MCP-Protocol-Version': '2025-06-18',
  },
  body: JSON.stringify(initializeRequest),
});

expect(response.ok).toBe(true);
```

### 3.4 Session Management

**Location:** `tests/integration/http-sessions.test.ts`

**What to test:**

| Test | Spec requirement |
|:-----|:-----------------|
| Stateful mode: server returns `Mcp-Session-Id` in initialize response | MAY assign session ID |
| Client includes `Mcp-Session-Id` on subsequent requests | MUST include |
| Request without session ID (non-initialize) returns 400 | SHOULD respond 400 |
| Invalid session ID returns 404 | MUST respond 404 |
| DELETE with session ID terminates session | SHOULD send DELETE |
| Terminated session returns 404 on subsequent requests | MUST respond 404 |
| Session ID is cryptographically secure (visible ASCII, sufficient entropy) | SHOULD be secure |

**Approach:**

Start server with `MCP_SESSION_MODE=stateful`. (The default is `auto`, which behaves as stateful in HTTP mode, so an explicit override may not be needed — but setting it explicitly makes test intent clear.) Use raw `fetch` to control headers precisely.

```ts
// Initialize -- should get session ID
const initResponse = await fetch(...initializeRequest);
const sessionId = initResponse.headers.get('mcp-session-id');
expect(sessionId).toBeTruthy();
expect(sessionId).toMatch(/^[\x21-\x7E]+$/); // Visible ASCII only

// Subsequent request with session ID
const toolsResponse = await fetch(`http://localhost:${port}/mcp`, {
  method: 'POST',
  headers: {
    'Mcp-Session-Id': sessionId,
    'MCP-Protocol-Version': '2025-06-18',
    ...commonHeaders,
  },
  body: JSON.stringify(listToolsRequest),
});
expect(toolsResponse.ok).toBe(true);

// Terminate session
const deleteResponse = await fetch(`http://localhost:${port}/mcp`, {
  method: 'DELETE',
  headers: { 'Mcp-Session-Id': sessionId },
});
expect(deleteResponse.ok).toBe(true);

// Session should be invalid now
const afterDelete = await fetch(`http://localhost:${port}/mcp`, {
  method: 'POST',
  headers: { 'Mcp-Session-Id': sessionId, ...commonHeaders },
  body: JSON.stringify(listToolsRequest),
});
expect(afterDelete.status).toBe(404);
```

---

## Infrastructure

### File Layout

```
tests/
  conformance/                          # Layer 1 + 2 (InMemoryTransport)
    helpers/
      assertions.ts                     # Existing: content block validators
      server-harness.ts                 # Existing: harness (extend with recording)
      recording-transport.ts            # NEW: wire-level message recorder
      low-level-helpers.ts              # NEW: raw JSON-RPC send/receive for edge cases
    protocol-init.test.ts               # Existing
    lifecycle.test.ts                   # Existing
    tools.test.ts                       # Existing
    resources.test.ts                   # Existing
    prompts.test.ts                     # Existing
    cancellation.test.ts                # NEW
    progress.test.ts                    # NEW
    logging.test.ts                     # NEW
    pagination.test.ts                  # NEW
    completions.test.ts                 # NEW
    subscriptions.test.ts              # NEW
    list-changed.test.ts                # NEW
    roots.test.ts                       # NEW
    elicitation.test.ts                 # NEW
    sampling.test.ts                    # NEW
    tasks.test.ts                       # NEW
    version-negotiation.test.ts         # NEW
    jsonrpc-edge-cases.test.ts          # NEW
    protocol-ordering.test.ts           # NEW (Layer 2)
  integration/                          # Layer 3 (real transports)
    helpers/
      server-process.ts                 # Spawn/manage server subprocess
      http-helpers.ts                   # Raw fetch wrappers, JWT generation
    stdio.test.ts                       # NEW
    http.test.ts                        # NEW
    http-auth.test.ts                   # NEW
    http-sessions.test.ts              # NEW
```

### Vitest Configuration

**Existing:** `vitest.conformance.ts` -- handles Layer 1 + 2 tests.

**New:** `vitest.integration.ts` -- handles Layer 3 tests.

```ts
// vitest.integration.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  ssr: {
    noExternal: ['zod'],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    pool: 'forks',
    maxWorkers: 1,       // Sequential -- shared server processes
    isolate: true,
    testTimeout: 30_000, // Longer timeout for subprocess startup
    hookTimeout: 15_000,
  },
});
```

**package.json scripts:**

```json
{
  "test:conformance": "vitest run --config vitest.conformance.ts",
  "test:integration": "vitest run --config vitest.integration.ts",
  "test:all": "vitest run && vitest run --config vitest.conformance.ts && vitest run --config vitest.integration.ts"
}
```

### Helper Utilities

**`tests/conformance/helpers/low-level-helpers.ts`:**

For tests that need raw JSON-RPC control (version negotiation, edge cases):

```ts
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

/**
 * Sends a raw JSON-RPC message and waits for the next response on the same transport.
 * Pass the **client-side** transport from `InMemoryTransport.createLinkedPair()` —
 * it sends to the server and receives the server's response via the linked pair.
 */
export async function sendRawAndCollect(
  transport: InMemoryTransport,
  message: Record<string, unknown>,
  timeoutMs = 5000,
): Promise<Record<string, unknown>> {
  const { promise, resolve, reject } = Promise.withResolvers<Record<string, unknown>>();
  const timer = setTimeout(() => reject(new Error('Timeout waiting for response')), timeoutMs);

  const originalHandler = transport.onmessage;
  transport.onmessage = (msg) => {
    clearTimeout(timer);
    transport.onmessage = originalHandler;
    resolve(msg as Record<string, unknown>);
  };

  await transport.send(message as JSONRPCMessage);
  return promise;
}
```

**`tests/integration/helpers/server-process.ts`:**

```ts
import { spawn, type ChildProcess } from 'node:child_process';

export interface ServerHandle {
  process: ChildProcess;
  port?: number;
  kill: () => Promise<void>;
}

/**
 * Spawns the server as a subprocess and waits for it to be ready.
 * For HTTP mode, parses the port from stdout.
 */
export async function startServer(
  transport: 'stdio' | 'http',
  env?: Record<string, string>,
): Promise<ServerHandle> {
  // Implementation: spawn process, parse ready signal, return handle
}
```

### CI Integration

Add conformance and integration test stages:

```yaml
# In CI workflow
- name: Conformance tests
  run: bun run test:conformance

- name: Build (required for integration tests)
  run: bun run build

- name: Integration tests
  run: bun run test:integration
```

---

## Spec Coverage Matrix

Tracks which spec sections have conformance tests. Update as tests are added.

| Spec Section | File | Status | Notes |
|:-------------|:-----|:-------|:------|
| **Core** | | | |
| JSON-RPC 2.0 messages | `jsonrpc-edge-cases.test.ts` | Done | 3 tests: unknown method, extra params fields, notifications |
| Lifecycle: initialize handshake | `protocol-init.test.ts` | Done | |
| Lifecycle: version negotiation | `version-negotiation.test.ts` | Done | 3 tests via raw transport: supported, past, future versions |
| Lifecycle: capability negotiation | `protocol-init.test.ts` | Done | |
| Lifecycle: shutdown | `lifecycle.test.ts` | Done | |
| Lifecycle: timeouts | -- | Not planned | SDK-handled |
| **Server Features** | | | |
| Tools: list | `tools.test.ts` | Done | |
| Tools: call | `tools.test.ts` | Done | |
| Tools: outputSchema / structuredContent | `tools.test.ts` | Done | |
| Tools: annotations | `tools.test.ts` | Done | |
| Tools: error handling | `tools.test.ts` | Done | |
| Resources: list | `resources.test.ts` | Done | |
| Resources: templates | `resources.test.ts` | Done | |
| Resources: read | `resources.test.ts` | Done | |
| Resources: subscribe | `subscriptions.test.ts` | Done | Negative test: server does not declare subscribe capability |
| Prompts: list | `prompts.test.ts` | Done | |
| Prompts: get | `prompts.test.ts` | Done | |
| Prompts: arguments | `prompts.test.ts` | Done | |
| **Client Features** | | | |
| Sampling: createMessage | `sampling.test.ts` | Done | SDK limitation: `createMessage` not on `RequestHandlerExtra`; tests verify graceful error |
| Elicitation: elicitInput | `elicitation.test.ts` | Done | SDK limitation: `elicitInput` not on `RequestHandlerExtra`; tests verify bypass + graceful error |
| Roots: listRoots | `roots.test.ts` | Done | 10 tests: with/without roots, listChanged variants |
| **Utilities** | | | |
| Ping | `protocol-init.test.ts` | Done | |
| Cancellation | `cancellation.test.ts` | Done | 4 tests: mid-flight cancel, post-complete, unused, pre-aborted |
| Progress | `progress.test.ts` | Done | 6 tests: delivery, monotonic, messages, total, no-callback, single-step |
| Logging | `logging.test.ts` | Done | 5 tests: capability, level control, syslog levels, severity filtering |
| Pagination | `pagination.test.ts` | Done | 4 tests: tools, resources, prompts (no nextCursor), invalid cursor |
| Completions | `completions.test.ts` | Done | Negative test: server does not declare completions capability |
| **Notifications** | | | |
| tools/list_changed | `list-changed.test.ts` | Done | Add, remove, enable/disable lifecycle |
| resources/list_changed | `list-changed.test.ts` | Done | |
| prompts/list_changed | `list-changed.test.ts` | Done | |
| roots/list_changed | `roots.test.ts` | Done | Capability negotiation variants |
| **Tasks API** (experimental) | | | |
| Task creation | `tasks.test.ts` | Done | Uses dedicated TaskHarness with InMemoryTaskStore |
| Task polling | `tasks.test.ts` | Done | Polls through working → completed with status messages |
| Task cancellation | `tasks.test.ts` | Done | |
| Task result retrieval | `tasks.test.ts` | Done | SDK Zod 4 compat issue with `getTaskResult`; falls back to stream result |
| Task listing | `tasks.test.ts` | Done | |
| Task failure | `tasks.test.ts` | Done | simulateFailure → failed status |
| Task fields | `tasks.test.ts` | Done | Validates required fields per spec |
| **Wire-Level** | | | |
| Message ordering | `protocol-ordering.test.ts` | Done | 6 tests via RecordingTransport |
| Request ID uniqueness | `protocol-ordering.test.ts` | Done | |
| Full message audit trail | Recording transport | Done | RecordingTransport helper with query API |
| **Transport: stdio** | | | |
| Subprocess launch + handshake | `stdio.test.ts` | Done | Skips if dist/index.js not built |
| Newline-delimited messages | `stdio.test.ts` | Done | |
| Clean shutdown | `stdio.test.ts` | Done | |
| **Transport: Streamable HTTP** | | | |
| POST JSON-RPC | `http.test.ts` | Done | SDK Client over HTTP, healthz, GET /mcp |
| SSE streaming | `http.test.ts` | Done | |
| MCP-Protocol-Version header | `http.test.ts` | Done | |
| Protocol version fallback (missing header → `2025-03-26`) | `http.test.ts` | Done | |
| Session management | `http-sessions.test.ts` | Done | Session ID tracking, DELETE termination |
| Session termination (DELETE) | `http-sessions.test.ts` | Done | |
| Origin validation | `http.test.ts` | Done | |
| CORS headers | `http.test.ts` | Done | |
| **Auth** | | | |
| JWT validation | `http-auth.test.ts` | Done | 401 without token, valid token, expired token |
| Scope enforcement | `http-auth.test.ts` | Done | |
| Unprotected endpoints | `http-auth.test.ts` | Done | |
| OAuth protected resource metadata | `http-auth.test.ts` | Done | |

---

## Implementation Order

Prioritized by value delivered per unit of effort.

### Phase 1: Recording Infrastructure + Quick Wins

**Files:** `recording-transport.ts`, `protocol-ordering.test.ts`, `logging.test.ts`, `list-changed.test.ts`

- Build the recording transport (reusable across all tests).
- Protocol ordering test validates invariants across the entire trace -- high value, catches regressions.
- Logging is declared in capabilities but may not be wired -- this test surfaces the gap.
- List-changed tests the notification contract that's already declared.

### Phase 2: Client Capability Tests

**Files:** `elicitation.test.ts`, `sampling.test.ts`, `roots.test.ts`

- All three have existing template tools that exercise the feature.
- The conformance tests confirm the round-trip works through the protocol layer.
- High value because these are user-facing features that can't be tested with unit tests.

### Phase 3: Advanced Protocol Features

**Files:** `cancellation.test.ts`, `progress.test.ts`, `tasks.test.ts`

- Cancellation and progress require test-only tools or careful timing.
- Tasks API tests use the existing countdown tool with short durations.
- May require helper infrastructure (blocking tools, signal coordination).

### Phase 4: Edge Cases + Negative Testing

**Files:** `version-negotiation.test.ts`, `jsonrpc-edge-cases.test.ts`, `pagination.test.ts`, `completions.test.ts`, `subscriptions.test.ts`

- Low-level transport tests for protocol edge cases.
- Pagination may require registering many items or configuring small page sizes.
- Completions and subscriptions test capabilities that aren't currently implemented (negative tests: verify correct rejection).

### Phase 5: Transport Integration

**Files:** `tests/integration/stdio.test.ts`, `http.test.ts`, `http-auth.test.ts`, `http-sessions.test.ts`

- Requires a built server and subprocess management.
- Slowest tests, run separately in CI.
- Validates the actual deployment path end-to-end.
- Auth and session tests need JWT generation and raw HTTP requests.

---

## Open Questions

1. **Test-only tool registration:** Some tests (cancellation, progress) need tools with controllable timing. Should these be registered:
   - (a) Via the `McpServer.tool()` API inside the test (after harness creation), or
   - (b) As dedicated test fixtures in a `tests/conformance/fixtures/` directory that the harness conditionally loads?

   Option (a) is simpler; option (b) is cleaner if many tests need custom tools.

2. **Logging bridge:** The server declares `logging` capability but it's unclear whether pino log calls are bridged to MCP `notifications/message`. The logging test will surface this. If not bridged, this is a feature gap to address before or alongside the conformance tests.

3. **Pagination page size:** Is there a way to configure the SDK's/server's default page size? If not, pagination tests need to register enough items to exceed the default. Check the SDK source for `DEFAULT_PAGE_SIZE` or similar.

4. ~~**SDK Client cancellation API:**~~ **Resolved.** The SDK Client uses `AbortSignal` via `RequestOptions.signal`. Call `abortController.abort()` to cancel in-flight requests — the SDK handles sending `notifications/cancelled` automatically. No raw transport manipulation needed.

5. **Task tool in conformance:** The `template_async_countdown` uses `setTimeout` with real delays. For fast tests, consider a variant with very short intervals (10ms instead of 1s) or a test-only task tool with controllable timing.