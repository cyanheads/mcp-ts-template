Title: Authorization Extensions - Model Context Protocol

URL Source: https://modelcontextprotocol.io/extensions/auth/overview

Markdown Content:
# Authorization Extensions - Model Context Protocol

[Skip to main content](https://modelcontextprotocol.io/extensions/auth/overview#content-area)

[Model Context Protocol home page![Image 1: light logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/light.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=a5ac61ce77858fb1ddaf6de761c39499)![Image 2: dark logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/dark.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=1227cb7feb8344f9f6288c6b5b0a6d80)](https://modelcontextprotocol.io/)

Search...

⌘K

*   [Blog](https://blog.modelcontextprotocol.io/)
*   [GitHub](https://github.com/modelcontextprotocol)

Search...

Navigation

Authorization Extensions

Authorization Extensions

[Documentation](https://modelcontextprotocol.io/docs/getting-started/intro)[Extensions](https://modelcontextprotocol.io/extensions/overview)[Specification](https://modelcontextprotocol.io/specification/2025-11-25)[Registry](https://modelcontextprotocol.io/registry/about)[SEPs](https://modelcontextprotocol.io/seps)[Community](https://modelcontextprotocol.io/community/contributing)

*   [Extensions Overview](https://modelcontextprotocol.io/extensions/overview)

*   [Extension Support Matrix](https://modelcontextprotocol.io/extensions/client-matrix)

##### MCP Apps

*   [MCP Apps](https://modelcontextprotocol.io/extensions/apps/overview)
*   [Build an MCP App](https://modelcontextprotocol.io/extensions/apps/build)

##### Authorization Extensions

*   [Authorization Extensions](https://modelcontextprotocol.io/extensions/auth/overview)
*   [OAuth Client Credentials](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials)
*   [Enterprise-Managed Authorization](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization)

On this page

*   [Why authorization extensions?](https://modelcontextprotocol.io/extensions/auth/overview#why-authorization-extensions)
*   [Available extensions](https://modelcontextprotocol.io/extensions/auth/overview#available-extensions)
*   [Choosing the right extension](https://modelcontextprotocol.io/extensions/auth/overview#choosing-the-right-extension)
*   [Client support](https://modelcontextprotocol.io/extensions/auth/overview#client-support)
*   [Specification](https://modelcontextprotocol.io/extensions/auth/overview#specification)

Authorization Extensions

# Authorization Extensions

Copy page

Supplementary authorization mechanisms for the Model Context Protocol

Copy page

The [ext-auth repository](https://github.com/modelcontextprotocol/ext-auth) contains official MCP extensions that add authorization capabilities beyond the core MCP specification. These extensions address specific real-world scenarios where the standard OAuth 2.0 authorization code flow isn’t the right fit.

## modelcontextprotocol/ext-auth

Source code, specifications, and reference implementations for MCP authorization extensions.

## [​](https://modelcontextprotocol.io/extensions/auth/overview#why-authorization-extensions)

Why authorization extensions?

The core MCP specification includes a robust [authorization framework](https://modelcontextprotocol.io/specification/latest/basic/authorization) built on OAuth 2.0. That framework handles the common case well: a user interactively grants an MCP client permission to access a server on their behalf.But not every MCP deployment fits this pattern:
*   **Machine-to-machine integrations** don’t have a human in the loop. Background services, CI pipelines, and automated workflows need to authenticate without interactive user consent flows.
*   **Enterprise environments** often have centralized identity providers (IdPs) that enforce policy across all applications. Requiring employees to authorize each MCP server individually creates friction and bypasses existing security controls.

The ext-auth extensions address these gaps.
## [​](https://modelcontextprotocol.io/extensions/auth/overview#available-extensions)

Available extensions

## OAuth Client Credentials

Machine-to-machine authentication using the OAuth 2.0 client credentials flow. No user interaction required.

## Enterprise-Managed Authorization

Centralized access control via enterprise identity providers. Employees access MCP servers through their organization’s IdP.

## [​](https://modelcontextprotocol.io/extensions/auth/overview#choosing-the-right-extension)

Choosing the right extension

| Scenario | Recommended extension |
| --- | --- |
| Background service or daemon accessing an MCP server | [OAuth Client Credentials](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials) |
| CI/CD pipeline calling MCP tools | [OAuth Client Credentials](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials) |
| Server-to-server API integration | [OAuth Client Credentials](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials) |
| Enterprise employees accessing MCP servers at work | [Enterprise-Managed Authorization](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization) |
| Organization-wide MCP access policy enforcement | [Enterprise-Managed Authorization](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization) |
| Standard interactive user authorization | Core MCP spec (no extension needed) |

## [​](https://modelcontextprotocol.io/extensions/auth/overview#client-support)

Client support

Authorization extension support varies by client. See the [client matrix](https://modelcontextprotocol.io/extensions/client-matrix) for a full breakdown. Both extensions require explicit support from the MCP client — they are never active by default.
## [​](https://modelcontextprotocol.io/extensions/auth/overview#specification)

Specification

Both extensions are specified in the [ext-auth repository](https://github.com/modelcontextprotocol/ext-auth/tree/main/specification/draft). They use the standard MCP [extension negotiation](https://modelcontextprotocol.io/extensions/overview#negotiation) mechanism: clients and servers declare support in the `extensions` field of their capabilities during initialization.

Was this page helpful?

Yes No

[Build an MCP App](https://modelcontextprotocol.io/extensions/apps/build)[OAuth Client Credentials](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials)

⌘I

[github](https://github.com/modelcontextprotocol)
