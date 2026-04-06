Title: Progress - Model Context Protocol

URL Source: https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/progress

Markdown Content:
# Progress - Model Context Protocol

[Skip to main content](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/progress#content-area)

[Model Context Protocol home page![Image 1: light logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/light.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=a5ac61ce77858fb1ddaf6de761c39499)![Image 2: dark logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/dark.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=1227cb7feb8344f9f6288c6b5b0a6d80)](https://modelcontextprotocol.io/)

Version 2025-11-25 (latest)

Search...

⌘K

*   [Blog](https://blog.modelcontextprotocol.io/)
*   [GitHub](https://github.com/modelcontextprotocol)

Search...

Navigation

Utilities

Progress

[Documentation](https://modelcontextprotocol.io/docs/getting-started/intro)[Extensions](https://modelcontextprotocol.io/extensions/overview)[Specification](https://modelcontextprotocol.io/specification/2025-11-25)[Registry](https://modelcontextprotocol.io/registry/about)[SEPs](https://modelcontextprotocol.io/seps)[Community](https://modelcontextprotocol.io/community/contributing)

*   [Specification](https://modelcontextprotocol.io/specification/2025-11-25)

*   [Key Changes](https://modelcontextprotocol.io/specification/2025-11-25/changelog)

*   [Architecture](https://modelcontextprotocol.io/specification/2025-11-25/architecture)

##### Base Protocol

*   [Overview](https://modelcontextprotocol.io/specification/2025-11-25/basic)
*   [Lifecycle](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle)
*   [Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)
*   [Authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
*   Utilities 
    *   [Cancellation](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/cancellation)
    *   [Ping](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/ping)
    *   [Progress](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/progress)
    *   [Tasks](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks)

##### Client Features

*   [Roots](https://modelcontextprotocol.io/specification/2025-11-25/client/roots)
*   [Sampling](https://modelcontextprotocol.io/specification/2025-11-25/client/sampling)
*   [Elicitation](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation)

##### Server Features

*   [Overview](https://modelcontextprotocol.io/specification/2025-11-25/server)
*   [Prompts](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts)
*   [Resources](https://modelcontextprotocol.io/specification/2025-11-25/server/resources)
*   [Tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)
*   Utilities 

*   [Schema Reference](https://modelcontextprotocol.io/specification/2025-11-25/schema)

On this page

*   [Progress Flow](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/progress#progress-flow)
*   [Behavior Requirements](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/progress#behavior-requirements)
*   [Implementation Notes](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/progress#implementation-notes)

Utilities

# Progress

Copy page

Copy page

The Model Context Protocol (MCP) supports optional progress tracking for long-running operations through notification messages. Either side can send progress notifications to provide updates about operation status.
## [​](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/progress#progress-flow)

Progress Flow

When a party wants to _receive_ progress updates for a request, it includes a `progressToken` in the request metadata.
*   Progress tokens **MUST** be a string or integer value
*   Progress tokens can be chosen by the sender using any means, but **MUST** be unique across all active requests.

```
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "some_method",
  "params": {
    "_meta": {
      "progressToken": "abc123"
    }
  }
}
```

The receiver **MAY** then send progress notifications containing:
*   The original progress token
*   The current progress value so far
*   An optional “total” value
*   An optional “message” value

```
{
  "jsonrpc": "2.0",
  "method": "notifications/progress",
  "params": {
    "progressToken": "abc123",
    "progress": 50,
    "total": 100,
    "message": "Reticulating splines..."
  }
}
```

*   The `progress` value **MUST** increase with each notification, even if the total is unknown.
*   The `progress` and the `total` values **MAY** be floating point.
*   The `message` field **SHOULD** provide relevant human readable progress information.

## [​](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/progress#behavior-requirements)

Behavior Requirements

1.   Progress notifications **MUST** only reference tokens that:
    *   Were provided in an active request
    *   Are associated with an in-progress operation

2.   Receivers of progress requests **MAY**:
    *   Choose not to send any progress notifications
    *   Send notifications at whatever frequency they deem appropriate
    *   Omit the total value if unknown

3.   For [task-augmented requests](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks), the `progressToken` provided in the original request **MUST** continue to be used for progress notifications throughout the task’s lifetime, even after the `CreateTaskResult` has been returned. The progress token remains valid and associated with the task until the task reaches a terminal status.
    *   Progress notifications for tasks **MUST** use the same `progressToken` that was provided in the initial task-augmented request
    *   Progress notifications for tasks **MUST** stop after the task reaches a terminal status (`completed`, `failed`, or `cancelled`)

## [​](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/progress#implementation-notes)

Implementation Notes

*   Senders and receivers **SHOULD** track active progress tokens
*   Both parties **SHOULD** implement rate limiting to prevent flooding
*   Progress notifications **MUST** stop after completion

Was this page helpful?

Yes No

[Ping](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/ping)[Tasks](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks)

⌘I

[github](https://github.com/modelcontextprotocol)
