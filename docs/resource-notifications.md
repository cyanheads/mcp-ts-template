# Resource Notifications

## Gap

Tool handlers cannot send `notifications/resources/updated` or `notifications/resources/list_changed` to subscribed clients. The `Context` interface has no method for this, so servers with dynamic resources that change in response to tool calls (or background events) have no way to notify clients.

## Origin

Discovered while field-testing [shift-mcp-server](https://github.com/cyanheads/shift-mcp-server) — a coordination server where tool calls (`shift_check_in`, `shift_check_out`) mutate state that a resource (`shift://status`) reflects. The design calls for pushing resource update notifications after each state change, but handlers have no mechanism to do so.

## SDK Surface

The MCP SDK already supports both notification types:

```ts
// McpServer (high-level)
server.sendResourceListChanged(): void;

// Server (low-level)
server.sendResourceListChanged(): Promise<void>;

// Per-resource update notification (spec type)
interface ResourceUpdatedNotification {
  method: "notifications/resources/updated";
  params: { uri: string };
}
```

Clients subscribe via `resources/subscribe` with a URI, and expect `notifications/resources/updated` when that resource changes. `notifications/resources/list_changed` is for when the set of available resources changes (not relevant for static resource lists).

## Proposed API

Expose on `Context` so handlers can fire notifications after mutations:

```ts
interface Context {
  // ... existing properties ...

  /** Send a resource-updated notification to subscribed clients. */
  readonly notifyResourceUpdated?: (uri: string) => void;

  /** Notify clients that the resource list has changed. */
  readonly notifyResourceListChanged?: () => void;
}
```

Optional (like `elicit`/`sample`) since it depends on having a reference to the server instance. Presence check before use:

```ts
handler(input, ctx) {
  workers.delete(input.workerId);
  ctx.notifyResourceUpdated?.('shift://status');
  return { workerId: input.workerId };
}
```

## Alternatives

1. **Automatic notifications** — the framework could detect when a resource handler would return different content and auto-send. Too magical, expensive (requires re-evaluating resources after every tool call), and doesn't work for resources that depend on external state.

2. **Post-handler hook on tools** — declare which resource URIs a tool affects, and the framework sends notifications after the handler returns. Declarative but inflexible — the tool may not always affect the resource.

3. **Event emitter / bus** — tools emit events, resources subscribe. Over-engineered for what's essentially a one-liner in the handler.

The `ctx.notifyResourceUpdated` approach is the simplest, most explicit, and consistent with existing optional capabilities on Context.

## Implementation Notes

- The framework creates per-request `McpServer` instances (security: GHSA-345p-7cg4-v4c7). Notifications need the server instance — thread it through `ContextDeps` like `elicit`/`sample`.
- For stdio transport, notifications go to stdout. For HTTP/SSE, they go to the active SSE connection.
- `resources/subscribe` and `resources/unsubscribe` request handlers may need to be registered (check if SDK handles this automatically when the server declares resource subscription capability).
