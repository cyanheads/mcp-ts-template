Title: Enterprise-Managed Authorization - Model Context Protocol

URL Source: https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization

Markdown Content:
# Enterprise-Managed Authorization - Model Context Protocol

[Skip to main content](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#content-area)

[Model Context Protocol home page![Image 1: light logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/light.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=a5ac61ce77858fb1ddaf6de761c39499)![Image 2: dark logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/dark.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=1227cb7feb8344f9f6288c6b5b0a6d80)](https://modelcontextprotocol.io/)

Search...

⌘K

*   [Blog](https://blog.modelcontextprotocol.io/)
*   [GitHub](https://github.com/modelcontextprotocol)

Search...

Navigation

Authorization Extensions

Enterprise-Managed Authorization

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

*   [What it is](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#what-it-is)
*   [When to use it](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#when-to-use-it)
*   [How it works](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#how-it-works)
*   [Implementation guide](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#implementation-guide)
*   [For MCP clients](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#for-mcp-clients)
*   [For MCP servers](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#for-mcp-servers)
*   [For MCP Authorization Servers](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#for-mcp-authorization-servers)
*   [Client support](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#client-support)
*   [Related resources](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#related-resources)

Authorization Extensions

# Enterprise-Managed Authorization

Copy page

Centralized access control for MCP in enterprise environments via identity providers

Copy page

The Enterprise-Managed Authorization extension (`io.modelcontextprotocol/enterprise-managed-authorization`) enables organizations to control MCP server access centrally through their existing identity provider (IdP). Instead of each employee authorizing each MCP server individually, the organization’s IT or security team manages access policies in one place.

## Specification

Full technical specification for the Enterprise-Managed Authorization extension.

## [​](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#what-it-is)

What it is

In a standard MCP deployment, each user independently authorizes an MCP client to access each MCP server. For consumer applications, this user-driven model is ideal — it gives individuals control over what accesses their data.In enterprise environments, this model creates friction and security gaps:
*   Employees shouldn’t need to understand the authorization details of every MCP server their organization uses
*   Security teams can’t enforce consistent access policies if each user authorizes independently
*   Onboarding new employees requires them to manually authorize dozens of services
*   Offboarding requires revoking access across every service individually

Enterprise-Managed Authorization solves this by introducing the organization’s IdP as the authoritative decision-maker. The IdP (such as Okta, Azure AD, or a corporate SSO system) controls which MCP servers employees can access, and under what conditions. Employees authenticate with their corporate identity — the same credentials they use for email, Slack, and other work tools — and the IdP grants or denies MCP server access based on organizational policy.
## [​](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#when-to-use-it)

When to use it

Use Enterprise-Managed Authorization when:
*   **Deploying MCP in a corporate environment** where IT manages access to all business applications
*   **Enforcing organizational access policies** — you need to ensure only authorized employees access specific MCP servers
*   **Centralizing access control** — you want to add or revoke access to MCP servers from a single admin console
*   **Meeting compliance requirements** — your organization needs an auditable authorization trail for all MCP server access
*   **Simplifying employee experience** — employees should access MCP tools with their existing corporate SSO credentials, without per-service authorization flows

## [​](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#how-it-works)

How it works

The extension establishes a delegated authorization flow where the enterprise IdP acts as an intermediary between the MCP client and the MCP server. The MCP Client requests a special type of token from the enterprise IdP called an Identity Assertion JWT Authorization Grant, or ID-JAG. The MCP Client then exchanges the ID-JAG for an access token from the MCP server’s Authorization Server:Key aspects of the flow:
1.   **Centralized policy**: The enterprise IdP maintains a registry of approved MCP servers and the access policies for each. Administrators configure these in their existing identity management tools.
2.   **Single sign-on**: Employees authenticate with their corporate credentials once. The IdP issues tokens that grant access to approved MCP servers without additional per-server authorization prompts.
3.   **Policy enforcement**: The IdP evaluates access policies (group membership, role assignments, conditional access rules) before issuing tokens. Employees who lack authorization receive an appropriate error — the MCP client never receives a token for unauthorized servers.
4.   **Centralized revocation**: Revoking an employee’s access to MCP servers happens at the IdP level, taking effect immediately across all MCP clients. No per-client, per-server revocation needed.

## [​](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#implementation-guide)

Implementation guide

### [​](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#for-mcp-clients)

For MCP clients

To support Enterprise-Managed Authorization, your client must:
1.   **Declare support** in the `initialize` request:

```
{
  "capabilities": {
    "extensions": {
      "io.modelcontextprotocol/enterprise-managed-authorization": {}
    }
  }
}
```

1.   **Support SSO** — users should authenticate to the MCP Client using the enterprise IdP. Save the Identity Assertion (either an OpenID ID Token or SAML assertion) issued during login for later use.
2.   **Handle ID-JAGs** — when the server indicates that enterprise-managed auth is required, request an ID-JAG token from the enterprise IdP’s authorization endpoint using the previously obtained Identity Assertion. Exchange this ID-JAG for an access token from the MCP Authorization Server. Do not redirect the user to the MCP Authorization Server’s authorization endpoint.
3.   **Support organization configuration** — allow administrators to configure the enterprise IdP’s endpoints, typically via organization-level settings rather than per-user settings.
4.   **Respect token scopes** — tokens issued by enterprise IdPs may have scope restrictions that differ from standard MCP authorization. Handle scope errors gracefully.

### [​](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#for-mcp-servers)

For MCP servers

To require enterprise-managed authorization:
1.   **Declare the extension** in your server’s authorization metadata, indicating that clients must use the enterprise-managed flow.
2.   **Integrate with IdP admin APIs** (optional) — publish your server’s resource descriptor so enterprise administrators can configure access policies in their IdP admin console.

### [​](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#for-mcp-authorization-servers)

For MCP Authorization Servers

1.   **Validate ID-JAGs** issued by the enterprise IdP. This typically means validating JWT signatures against the IdP’s JWKS endpoint and checking the token’s audience, issuer, and expiration.
2.   **Map IdP claims to permissions** — ID-JAG tokens carry claims (scope and resource information) that your server uses to determine who the employee is and what the employee can access. Define your authorization logic based on these claims.
3.   **Handle Account Linking** - ID-JAG tokens will always contain a subject claim and may additionally contain an email claim that can be used to

## [​](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#client-support)

Client support

Support for this extension varies by client. Extensions are opt-in and never active by default.

Check the [client matrix](https://modelcontextprotocol.io/extensions/client-matrix) for current implementation status across MCP clients. Enterprise-Managed Authorization typically requires client-level support from the organization’s IT team in addition to the MCP client application.
## [​](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization#related-resources)

Related resources

## ext-auth repository

Source code and reference implementations

## Full specification

Technical specification with normative requirements

## SEP-990

Original proposal: Enable Enterprise IdP Policy Controls

## MCP Authorization

Core MCP authorization specification

Was this page helpful?

Yes No

[OAuth Client Credentials](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials)

⌘I

[github](https://github.com/modelcontextprotocol)
