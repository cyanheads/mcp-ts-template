Title: Prompts - Model Context Protocol

URL Source: https://modelcontextprotocol.io/specification/2025-11-25/server/prompts

Markdown Content:
# Prompts - Model Context Protocol

[Skip to main content](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#content-area)

[Model Context Protocol home page![Image 1: light logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/light.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=a5ac61ce77858fb1ddaf6de761c39499)![Image 2: dark logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/dark.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=1227cb7feb8344f9f6288c6b5b0a6d80)](https://modelcontextprotocol.io/)

Version 2025-11-25 (latest)

Search...

⌘K

*   [Blog](https://blog.modelcontextprotocol.io/)
*   [GitHub](https://github.com/modelcontextprotocol)

Search...

Navigation

Server Features

Prompts

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

*   [User Interaction Model](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#user-interaction-model)
*   [Capabilities](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#capabilities)
*   [Protocol Messages](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#protocol-messages)
*   [Listing Prompts](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#listing-prompts)
*   [Getting a Prompt](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#getting-a-prompt)
*   [List Changed Notification](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#list-changed-notification)
*   [Message Flow](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#message-flow)
*   [Data Types](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#data-types)
*   [Prompt](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#prompt)
*   [PromptMessage](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#promptmessage)
*   [Text Content](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#text-content)
*   [Image Content](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#image-content)
*   [Audio Content](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#audio-content)
*   [Embedded Resources](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#embedded-resources)
*   [Error Handling](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#error-handling)
*   [Implementation Considerations](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#implementation-considerations)
*   [Security](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#security)

Server Features

# Prompts

Copy page

Copy page

The Model Context Protocol (MCP) provides a standardized way for servers to expose prompt templates to clients. Prompts allow servers to provide structured messages and instructions for interacting with language models. Clients can discover available prompts, retrieve their contents, and provide arguments to customize them.
## [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#user-interaction-model)

User Interaction Model

Prompts are designed to be **user-controlled**, meaning they are exposed from servers to clients with the intention of the user being able to explicitly select them for use.Typically, prompts would be triggered through user-initiated commands in the user interface, which allows users to naturally discover and invoke available prompts.For example, as slash commands:![Image 3: Example of prompt exposed as slash command](https://mintcdn.com/mcp/uzELntid9uQ-QMAr/specification/2025-11-25/server/slash-command.png?fit=max&auto=format&n=uzELntid9uQ-QMAr&q=85&s=965e4fa2273b376721d6f26c396c69c5)However, implementors are free to expose prompts through any interface pattern that suits their needs—the protocol itself does not mandate any specific user interaction model.
## [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#capabilities)

Capabilities

Servers that support prompts **MUST** declare the `prompts` capability during [initialization](https://modelcontextprotocol.io/specification/2025-11-25/basic/lifecycle#initialization):

```
{
  "capabilities": {
    "prompts": {
      "listChanged": true
    }
  }
}
```

`listChanged` indicates whether the server will emit notifications when the list of available prompts changes.
## [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#protocol-messages)

Protocol Messages

### [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#listing-prompts)

Listing Prompts

To retrieve available prompts, clients send a `prompts/list` request. This operation supports [pagination](https://modelcontextprotocol.io/specification/2025-11-25/server/utilities/pagination).**Request:**

```
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "prompts/list",
  "params": {
    "cursor": "optional-cursor-value"
  }
}
```

**Response:**

```
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "prompts": [
      {
        "name": "code_review",
        "title": "Request Code Review",
        "description": "Asks the LLM to analyze code quality and suggest improvements",
        "arguments": [
          {
            "name": "code",
            "description": "The code to review",
            "required": true
          }
        ],
        "icons": [
          {
            "src": "https://example.com/review-icon.svg",
            "mimeType": "image/svg+xml",
            "sizes": ["any"]
          }
        ]
      }
    ],
    "nextCursor": "next-page-cursor"
  }
}
```

### [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#getting-a-prompt)

Getting a Prompt

To retrieve a specific prompt, clients send a `prompts/get` request. Arguments may be auto-completed through [the completion API](https://modelcontextprotocol.io/specification/2025-11-25/server/utilities/completion).**Request:**

```
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "prompts/get",
  "params": {
    "name": "code_review",
    "arguments": {
      "code": "def hello():\n    print('world')"
    }
  }
}
```

**Response:**

```
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "description": "Code review prompt",
    "messages": [
      {
        "role": "user",
        "content": {
          "type": "text",
          "text": "Please review this Python code:\ndef hello():\n    print('world')"
        }
      }
    ]
  }
}
```

### [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#list-changed-notification)

List Changed Notification

When the list of available prompts changes, servers that declared the `listChanged` capability **SHOULD** send a notification:

```
{
  "jsonrpc": "2.0",
  "method": "notifications/prompts/list_changed"
}
```

## [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#message-flow)

Message Flow

## [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#data-types)

Data Types

### [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#prompt)

Prompt

A prompt definition includes:
*   `name`: Unique identifier for the prompt
*   `title`: Optional human-readable name of the prompt for display purposes.
*   `description`: Optional human-readable description
*   `icons`: Optional array of icons for display in user interfaces
*   `arguments`: Optional list of arguments for customization

### [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#promptmessage)

PromptMessage

Messages in a prompt can contain:
*   `role`: Either “user” or “assistant” to indicate the speaker
*   `content`: One of the following content types:

All content types in prompt messages support optional [annotations](https://modelcontextprotocol.io/specification/2025-11-25/server/resources#annotations) for metadata about audience, priority, and modification times.

#### [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#text-content)

Text Content

Text content represents plain text messages:

```
{
  "type": "text",
  "text": "The text content of the message"
}
```

This is the most common content type used for natural language interactions.
#### [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#image-content)

Image Content

Image content allows including visual information in messages:

```
{
  "type": "image",
  "data": "base64-encoded-image-data",
  "mimeType": "image/png"
}
```

The image data **MUST** be base64-encoded and include a valid MIME type. This enables multi-modal interactions where visual context is important.
#### [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#audio-content)

Audio Content

Audio content allows including audio information in messages:

```
{
  "type": "audio",
  "data": "base64-encoded-audio-data",
  "mimeType": "audio/wav"
}
```

The audio data MUST be base64-encoded and include a valid MIME type. This enables multi-modal interactions where audio context is important.
#### [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#embedded-resources)

Embedded Resources

Embedded resources allow referencing server-side resources directly in messages:

```
{
  "type": "resource",
  "resource": {
    "uri": "resource://example",
    "mimeType": "text/plain",
    "text": "Resource content"
  }
}
```

Resources can contain either text or binary (blob) data and **MUST** include:
*   A valid resource URI
*   The appropriate MIME type
*   Either text content or base64-encoded blob data

Embedded resources enable prompts to seamlessly incorporate server-managed content like documentation, code samples, or other reference materials directly into the conversation flow.
## [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#error-handling)

Error Handling

Servers **SHOULD** return standard JSON-RPC errors for common failure cases:
*   Invalid prompt name: `-32602` (Invalid params)
*   Missing required arguments: `-32602` (Invalid params)
*   Internal errors: `-32603` (Internal error)

## [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#implementation-considerations)

Implementation Considerations

1.   Servers **SHOULD** validate prompt arguments before processing
2.   Clients **SHOULD** handle pagination for large prompt lists
3.   Both parties **SHOULD** respect capability negotiation

## [​](https://modelcontextprotocol.io/specification/2025-11-25/server/prompts#security)

Security

Implementations **MUST** carefully validate all prompt inputs and outputs to prevent injection attacks or unauthorized access to resources.

Was this page helpful?

Yes No

[Overview](https://modelcontextprotocol.io/specification/2025-11-25/server)[Resources](https://modelcontextprotocol.io/specification/2025-11-25/server/resources)

⌘I

[github](https://github.com/modelcontextprotocol)
