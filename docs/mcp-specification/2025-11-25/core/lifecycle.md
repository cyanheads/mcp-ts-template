Title: Lifecycle - Model Context Protocol

URL Source: https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle

Markdown Content:
# Lifecycle - Model Context Protocol

[Skip to main content](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#content-area)

[Model Context Protocol home page![Image 1: light logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/light.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=a5ac61ce77858fb1ddaf6de761c39499)![Image 2: dark logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/dark.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=1227cb7feb8344f9f6288c6b5b0a6d80)](https://modelcontextprotocol.io/)

Version 2025-11-25 (latest)

Search...

⌘K

*   [Blog](https://blog.modelcontextprotocol.io/)
*   [GitHub](https://github.com/modelcontextprotocol)

Search...

Navigation

Base Protocol

Lifecycle

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

*   [Lifecycle Phases](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#lifecycle-phases)
*   [Initialization](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#initialization)
*   [Version Negotiation](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#version-negotiation)
*   [Capability Negotiation](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#capability-negotiation)
*   [Operation](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#operation)
*   [Shutdown](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#shutdown)
*   [stdio](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#stdio)
*   [HTTP](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#http)
*   [Timeouts](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#timeouts)
*   [Error Handling](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#error-handling)

Base Protocol

# Lifecycle

Copy page

Copy page

The Model Context Protocol (MCP) defines a rigorous lifecycle for client-server connections that ensures proper capability negotiation and state management.
1.   **Initialization**: Capability negotiation and protocol version agreement
2.   **Operation**: Normal protocol communication
3.   **Shutdown**: Graceful termination of the connection

## [​](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#lifecycle-phases)

Lifecycle Phases

### [​](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#initialization)

Initialization

The initialization phase **MUST** be the first interaction between client and server. During this phase, the client and server:
*   Establish protocol version compatibility
*   Exchange and negotiate capabilities
*   Share implementation details

The client **MUST** initiate this phase by sending an `initialize` request containing:
*   Protocol version supported
*   Client capabilities
*   Client implementation information

```
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-11-25",
    "capabilities": {
      "roots": {
        "listChanged": true
      },
      "sampling": {},
      "elicitation": {
        "form": {},
        "url": {}
      },
      "tasks": {
        "requests": {
          "elicitation": {
            "create": {}
          },
          "sampling": {
            "createMessage": {}
          }
        }
      }
    },
    "clientInfo": {
      "name": "ExampleClient",
      "title": "Example Client Display Name",
      "version": "1.0.0",
      "description": "An example MCP client application",
      "icons": [
        {
          "src": "https://example.com/icon.png",
          "mimeType": "image/png",
          "sizes": ["48x48"]
        }
      ],
      "websiteUrl": "https://example.com"
    }
  }
}
```

The server **MUST** respond with its own capabilities and information:

```
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-11-25",
    "capabilities": {
      "logging": {},
      "prompts": {
        "listChanged": true
      },
      "resources": {
        "subscribe": true,
        "listChanged": true
      },
      "tools": {
        "listChanged": true
      },
      "tasks": {
        "list": {},
        "cancel": {},
        "requests": {
          "tools": {
            "call": {}
          }
        }
      }
    },
    "serverInfo": {
      "name": "ExampleServer",
      "title": "Example Server Display Name",
      "version": "1.0.0",
      "description": "An example MCP server providing tools and resources",
      "icons": [
        {
          "src": "https://example.com/server-icon.svg",
          "mimeType": "image/svg+xml",
          "sizes": ["any"]
        }
      ],
      "websiteUrl": "https://example.com/server"
    },
    "instructions": "Optional instructions for the client"
  }
}
```

After successful initialization, the client **MUST** send an `initialized` notification to indicate it is ready to begin normal operations:

```
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized"
}
```

*   The client **SHOULD NOT** send requests other than [pings](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/ping) before the server has responded to the `initialize` request.
*   The server **SHOULD NOT** send requests other than [pings](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/ping) and [logging](https://modelcontextprotocol.io/specification/2025-11-25/server/utilities/logging) before receiving the `initialized` notification.

#### [​](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#version-negotiation)

Version Negotiation

In the `initialize` request, the client **MUST** send a protocol version it supports. This **SHOULD** be the _latest_ version supported by the client.If the server supports the requested protocol version, it **MUST** respond with the same version. Otherwise, the server **MUST** respond with another protocol version it supports. This **SHOULD** be the _latest_ version supported by the server.If the client does not support the version in the server’s response, it **SHOULD** disconnect.

If using HTTP, the client **MUST** include the `MCP-Protocol-Version: <protocol-version>` HTTP header on all subsequent requests to the MCP server. For details, see [the Protocol Version Header section in Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports#protocol-version-header).

#### [​](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#capability-negotiation)

Capability Negotiation

Client and server capabilities establish which optional protocol features will be available during the session.Key capabilities include:

| Category | Capability | Description |
| --- | --- | --- |
| Client | `roots` | Ability to provide filesystem [roots](https://modelcontextprotocol.io/specification/2025-11-25/client/roots) |
| Client | `sampling` | Support for LLM [sampling](https://modelcontextprotocol.io/specification/2025-11-25/client/sampling) requests |
| Client | `elicitation` | Support for server [elicitation](https://modelcontextprotocol.io/specification/2025-11-25/client/elicitation) requests |
| Client | `tasks` | Support for [task-augmented](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks) client requests |
| Client | `experimental` | Describes support for non-standard experimental features |
| Server | `prompts` | Offers [prompt templates](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts) |
| Server | `resources` | Provides readable [resources](https://modelcontextprotocol.io/specification/2025-11-25/server/resources) |
| Server | `tools` | Exposes callable [tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools) |
| Server | `logging` | Emits structured [log messages](https://modelcontextprotocol.io/specification/2025-11-25/server/utilities/logging) |
| Server | `completions` | Supports argument [autocompletion](https://modelcontextprotocol.io/specification/2025-11-25/server/utilities/completion) |
| Server | `tasks` | Support for [task-augmented](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/tasks) server requests |
| Server | `experimental` | Describes support for non-standard experimental features |

Capability objects can describe sub-capabilities like:
*   `listChanged`: Support for list change notifications (for prompts, resources, and tools)
*   `subscribe`: Support for subscribing to individual items’ changes (resources only)

### [​](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#operation)

Operation

During the operation phase, the client and server exchange messages according to the negotiated capabilities.Both parties **MUST**:
*   Respect the negotiated protocol version
*   Only use capabilities that were successfully negotiated

### [​](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#shutdown)

Shutdown

During the shutdown phase, one side (usually the client) cleanly terminates the protocol connection. No specific shutdown messages are defined—instead, the underlying transport mechanism should be used to signal connection termination:
#### [​](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#stdio)

stdio

For the stdio [transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), the client **SHOULD** initiate shutdown by:
1.   First, closing the input stream to the child process (the server)
2.   Waiting for the server to exit, or sending `SIGTERM` if the server does not exit within a reasonable time
3.   Sending `SIGKILL` if the server does not exit within a reasonable time after `SIGTERM`

The server **MAY** initiate shutdown by closing its output stream to the client and exiting.
#### [​](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#http)

HTTP

For HTTP [transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports), shutdown is indicated by closing the associated HTTP connection(s).
## [​](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#timeouts)

Timeouts

Implementations **SHOULD** establish timeouts for all sent requests, to prevent hung connections and resource exhaustion. When the request has not received a success or error response within the timeout period, the sender **SHOULD** issue a [cancellation notification](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/cancellation) for that request and stop waiting for a response.SDKs and other middleware **SHOULD** allow these timeouts to be configured on a per-request basis.Implementations **MAY** choose to reset the timeout clock when receiving a [progress notification](https://modelcontextprotocol.io/specification/2025-11-25/basic/utilities/progress) corresponding to the request, as this implies that work is actually happening. However, implementations **SHOULD** always enforce a maximum timeout, regardless of progress notifications, to limit the impact of a misbehaving client or server.
## [​](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#error-handling)

Error Handling

Implementations **SHOULD** be prepared to handle these error cases:
*   Protocol version mismatch
*   Failure to negotiate required capabilities
*   Request [timeouts](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#timeouts)

Example initialization error:

```
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32602,
    "message": "Unsupported protocol version",
    "data": {
      "supported": ["2024-11-05"],
      "requested": "1.0.0"
    }
  }
}
```

Was this page helpful?

Yes No

[Overview](https://modelcontextprotocol.io/specification/2025-11-25/basic)[Transports](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)

⌘I

[github](https://github.com/modelcontextprotocol)
