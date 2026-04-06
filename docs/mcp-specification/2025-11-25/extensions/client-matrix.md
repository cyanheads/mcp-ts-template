Title: Extension Support Matrix - Model Context Protocol

URL Source: https://modelcontextprotocol.io/extensions/client-matrix

Markdown Content:
This matrix shows which MCP clients support each [official extension](https://modelcontextprotocol.io/extensions/overview). Extensions are always opt-in — a client only uses an extension if both client and server declare support during the [initialization handshake](https://modelcontextprotocol.io/extensions/overview#negotiation).

## Extension overview

| Extension | Identifier | Description |
| --- | --- | --- |
| [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview) | `io.modelcontextprotocol/ui` | Interactive HTML interfaces rendered inline in the conversation |
| [OAuth Client Credentials](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials) | `io.modelcontextprotocol/oauth-client-credentials` | Machine-to-machine auth without interactive user login |
| [Enterprise-Managed Authorization](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization) | `io.modelcontextprotocol/enterprise-managed-authorization` | Centralized access control via enterprise IdP |

| Client | [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview) | [OAuth Client Credentials](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials) | [Enterprise Auth](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization) |
| --- | --- | --- | --- |
| [Claude (web)](https://claude.ai/) |  |  |  |
| [Claude Desktop](https://claude.ai/download) |  |  |  |
| [VS Code GitHub Copilot](https://code.visualstudio.com/) |  |  |  |
| [Goose](https://block.github.io/goose/) |  |  |  |
| [Postman](https://postman.com/) |  |  |  |
| [MCPJam](https://www.mcpjam.com/) |  |  |  |
| [ChatGPT](https://chatgpt.com/) |  |  |  |

## Adding extension support to your client

If you’re building an MCP client and want to implement extension support:

1.   Review the extension specification (e.g., in the [ext-auth](https://github.com/modelcontextprotocol/ext-auth) or [ext-apps](https://github.com/modelcontextprotocol/ext-apps) repository)
2.   Declare support in the `extensions` field of your `initialize` capabilities
3.   Implement the extension’s protocol requirements
4.   Submit a pull request to update this matrix

See [Extensions Overview](https://modelcontextprotocol.io/extensions/overview#negotiation) for details on the capability negotiation mechanism.
