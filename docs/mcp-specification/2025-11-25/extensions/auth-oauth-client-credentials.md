Title: OAuth Client Credentials - Model Context Protocol

URL Source: https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials

Markdown Content:
# OAuth Client Credentials - Model Context Protocol

[Skip to main content](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#content-area)

[Model Context Protocol home page![Image 1: light logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/light.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=a5ac61ce77858fb1ddaf6de761c39499)![Image 2: dark logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/dark.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=1227cb7feb8344f9f6288c6b5b0a6d80)](https://modelcontextprotocol.io/)

Search...

⌘K

*   [Blog](https://blog.modelcontextprotocol.io/)
*   [GitHub](https://github.com/modelcontextprotocol)

Search...

Navigation

Authorization Extensions

OAuth Client Credentials

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

*   [What it is](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#what-it-is)
*   [When to use it](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#when-to-use-it)
*   [How it works](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#how-it-works)
*   [JWT Bearer Assertions (recommended)](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#jwt-bearer-assertions-recommended)
*   [Client Secrets](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#client-secrets)
*   [Implementation guide](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#implementation-guide)
*   [For MCP clients](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#for-mcp-clients)
*   [For MCP servers](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#for-mcp-servers)
*   [SDK examples](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#sdk-examples)
*   [Using a client secret](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#using-a-client-secret)
*   [Using a JWT private key](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#using-a-jwt-private-key)
*   [Client support](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#client-support)
*   [Related resources](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#related-resources)

Authorization Extensions

# OAuth Client Credentials

Copy page

Machine-to-machine authentication for MCP using the OAuth 2.0 client credentials flow

Copy page

The OAuth Client Credentials extension (`io.modelcontextprotocol/oauth-client-credentials`) adds support for the [OAuth 2.0 client credentials flow](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4) to MCP. This enables automated systems to connect to MCP servers without interactive user authorization.

## Specification

Full technical specification for the OAuth Client Credentials extension.

## [​](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#what-it-is)

What it is

The standard MCP authorization flow requires a user to interactively approve access — a browser opens, the user logs in, and grants permission. That works well for humans, but breaks down when there’s no user present.The OAuth Client Credentials extension solves this by letting a client authenticate using application-level credentials (a client ID and secret, or a signed JWT assertion) rather than delegated user credentials. The client proves its identity directly to the authorization server, which issues an access token without requiring a browser redirect or user interaction.
## [​](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#when-to-use-it)

When to use it

Use OAuth Client Credentials when:
*   **Background services** need to call MCP tools on a schedule or in response to events, without a user present
*   **CI/CD pipelines** invoke MCP servers as part of automated build, test, or deployment workflows
*   **Server-to-server integrations** connect two backend systems where there’s no end user involved
*   **Daemon processes** or long-running workers need persistent access to MCP resources

If your integration has a human user who should explicitly authorize access, use the standard MCP authorization flow instead.
## [​](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#how-it-works)

How it works

The extension supports two credential formats:
### [​](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#jwt-bearer-assertions-recommended)

JWT Bearer Assertions (recommended)

Defined in [RFC 7523](https://datatracker.ietf.org/doc/html/rfc7523), JWT Bearer Assertions let the client sign a token with its private key and present it as proof of identity. The authorization server validates the signature using the client’s registered public key.The JWT assertion typically includes:
*   `iss`: Client ID (the issuer)
*   `sub`: Client ID (subject being authenticated)
*   `aud`: Authorization server token endpoint URL
*   `exp`: Expiration time
*   `iat`: Issued-at time

### [​](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#client-secrets)

Client Secrets

For simpler deployments, the extension also supports the standard client credentials flow using a `client_id` and `client_secret`. The client sends its credentials directly to the authorization server’s token endpoint and receives an access token in return.

Client secrets are **long-lived credentials** that grant access without user interaction. If a secret is leaked, an attacker can silently authenticate as your application until the secret is rotated. To reduce risk:
*   Store secrets in a secrets manager, never in source code or environment files checked into version control.
*   Rotate secrets on a regular schedule and immediately after any suspected compromise.
*   Scope credentials to the minimum permissions required.
*   Prefer JWT assertions when possible — they are short-lived and do not require transmitting the signing key.

## [​](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#implementation-guide)

Implementation guide

### [​](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#for-mcp-clients)

For MCP clients

To use the OAuth Client Credentials extension, your client must:

1

[](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#)

Declare support

Include the extension in the `initialize` request capabilities:

```
{
  "capabilities": {
    "extensions": {
      "io.modelcontextprotocol/oauth-client-credentials": {}
    }
  }
}
```

2

[](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#)

Obtain an access token

Request a token from the authorization server using the client credentials grant before connecting to the MCP server.

3

[](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#)

Include the token

Pass the token in the `Authorization` header of HTTP requests to the MCP server:

```
Authorization: Bearer <access_token>
```

4

[](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#)

Handle token refresh

Client credentials tokens typically have shorter lifetimes than user-delegated tokens. Implement token refresh logic to obtain a new token before expiry.

### [​](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#for-mcp-servers)

For MCP servers

To accept client credentials tokens, your server must:

1

[](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#)

Validate the token

On each request, verify the JWT signature and claims against your authorization server’s public keys (usually via a JWKS endpoint).

2

[](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#)

Check scopes

Ensure the token includes the required scopes for the requested operation.

3

[](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#)

Advertise support

Optionally (but recommended for discoverability), include the extension in the `initialize` response:

```
{
  "capabilities": {
    "extensions": {
      "io.modelcontextprotocol/oauth-client-credentials": {}
    }
  }
}
```

## [​](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#sdk-examples)

SDK examples

The official MCP SDKs provide built-in support for client credentials authentication. Both handle token acquisition and refresh automatically.

1

[](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#)

Install the SDK

*   TypeScript 
*   Python 

```
npm install @modelcontextprotocol/client
```

```
pip install mcp
```

2

[](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#)

Create a provider and connect

Choose the credential format that matches your setup:
#### [​](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#using-a-client-secret)

Using a client secret

*   TypeScript 
*   Python 

```
import {
  Client,
  ClientCredentialsProvider,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

const provider = new ClientCredentialsProvider({
  clientId: "my-service",
  clientSecret: "s3cr3t",
});

const client = new Client(
  { name: "my-service", version: "1.0.0" },
  { capabilities: {} },
);

const transport = new StreamableHTTPClientTransport(
  new URL("https://mcp.example.com/mcp"),
  { authProvider: provider },
);

await client.connect(transport);

// Use the client
const tools = await client.listTools();
console.log(
  "Available tools:",
  tools.tools.map((t) => t.name),
);

await transport.close();
```

```
from mcp.client.auth.extensions.client_credentials import (
    ClientCredentialsOAuthProvider,
)
from mcp.client.streamable_http import streamablehttp_client
from mcp import ClientSession

provider = ClientCredentialsOAuthProvider(
    server_url="https://mcp.example.com/mcp",
    client_id="my-service",
    client_secret="s3cr3t",
    scopes="read write",
)

async with streamablehttp_client(
    "https://mcp.example.com/mcp",
    auth_provider=provider,
) as (read_stream, write_stream, _):
    async with ClientSession(read_stream, write_stream) as session:
        await session.initialize()

        # Use the client
        tools = await session.list_tools()
        print("Available tools:", [t.name for t in tools.tools])
```

#### [​](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#using-a-jwt-private-key)

Using a JWT private key

*   TypeScript 
*   Python 

```
import {
  Client,
  PrivateKeyJwtProvider,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";

const provider = new PrivateKeyJwtProvider({
  clientId: "my-service",
  privateKey: process.env.CLIENT_PRIVATE_KEY_PEM,
  algorithm: "RS256",
});

const client = new Client(
  { name: "my-service", version: "1.0.0" },
  { capabilities: {} },
);

const transport = new StreamableHTTPClientTransport(
  new URL("https://mcp.example.com/mcp"),
  { authProvider: provider },
);

await client.connect(transport);

// Use the client
const tools = await client.listTools();
console.log(
  "Available tools:",
  tools.tools.map((t) => t.name),
);

await transport.close();
```

```
from mcp.client.auth.extensions.client_credentials import (
    PrivateKeyJWTOAuthProvider,
    SignedJWTParameters,
)
from mcp.client.streamable_http import streamablehttp_client
from mcp import ClientSession

# Create a signed JWT assertion provider from key parameters
jwt_params = SignedJWTParameters(
    issuer="my-service",
    subject="my-service",
    signing_key=open("private_key.pem").read(),
    signing_algorithm="RS256",
    lifetime_seconds=300,
)

provider = PrivateKeyJWTOAuthProvider(
    server_url="https://mcp.example.com/mcp",
    client_id="my-service",
    assertion_provider=jwt_params.create_assertion_provider(),
    scopes="read write",
)

async with streamablehttp_client(
    "https://mcp.example.com/mcp",
    auth_provider=provider,
) as (read_stream, write_stream, _):
    async with ClientSession(read_stream, write_stream) as session:
        await session.initialize()

        # Use the client
        tools = await session.list_tools()
        print("Available tools:", [t.name for t in tools.tools])
```

## [​](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#client-support)

Client support

Support for this extension varies by client. Extensions are opt-in and never active by default.

Check the [client matrix](https://modelcontextprotocol.io/extensions/client-matrix) for current implementation status across MCP clients.
## [​](https://modelcontextprotocol.io/extensions/auth/oauth-client-credentials#related-resources)

Related resources

## ext-auth repository

Source code and reference implementations

## Full specification

Technical specification with normative requirements

## RFC 6749 — Client Credentials Grant

The underlying OAuth 2.0 specification

## RFC 7523 — JWT Bearer Assertions

JWT assertion format specification

Was this page helpful?

Yes No

[Authorization Extensions](https://modelcontextprotocol.io/extensions/auth/overview)[Enterprise-Managed Authorization](https://modelcontextprotocol.io/extensions/auth/enterprise-managed-authorization)

⌘I

[github](https://github.com/modelcontextprotocol)
