Title: Specification - Model Context Protocol

URL Source: https://modelcontextprotocol.io/specification/2025-11-25

Markdown Content:
# Specification - Model Context Protocol

[Skip to main content](https://modelcontextprotocol.io/specification/2025-11-25#content-area)

[Model Context Protocol home page![Image 1: light logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/light.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=a5ac61ce77858fb1ddaf6de761c39499)![Image 2: dark logo](https://mintcdn.com/mcp/2BMHnlNW5OqOohXZ/logo/dark.svg?fit=max&auto=format&n=2BMHnlNW5OqOohXZ&q=85&s=1227cb7feb8344f9f6288c6b5b0a6d80)](https://modelcontextprotocol.io/)

Version 2025-11-25 (latest)

Search...

⌘K

*   [Blog](https://blog.modelcontextprotocol.io/)
*   [GitHub](https://github.com/modelcontextprotocol)

Search...

Navigation

Specification

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

*   [Overview](https://modelcontextprotocol.io/specification/2025-11-25#overview)
*   [Key Details](https://modelcontextprotocol.io/specification/2025-11-25#key-details)
*   [Base Protocol](https://modelcontextprotocol.io/specification/2025-11-25#base-protocol)
*   [Features](https://modelcontextprotocol.io/specification/2025-11-25#features)
*   [Additional Utilities](https://modelcontextprotocol.io/specification/2025-11-25#additional-utilities)
*   [Security and Trust & Safety](https://modelcontextprotocol.io/specification/2025-11-25#security-and-trust-%26-safety)
*   [Key Principles](https://modelcontextprotocol.io/specification/2025-11-25#key-principles)
*   [Implementation Guidelines](https://modelcontextprotocol.io/specification/2025-11-25#implementation-guidelines)
*   [Learn More](https://modelcontextprotocol.io/specification/2025-11-25#learn-more)

# Specification

Copy page

Copy page

[Model Context Protocol](https://modelcontextprotocol.io/) (MCP) is an open protocol that enables seamless integration between LLM applications and external data sources and tools. Whether you’re building an AI-powered IDE, enhancing a chat interface, or creating custom AI workflows, MCP provides a standardized way to connect LLMs with the context they need.This specification defines the authoritative protocol requirements, based on the TypeScript schema in [schema.ts](https://github.com/modelcontextprotocol/specification/blob/main/schema/2025-11-25/schema.ts).For implementation guides and examples, visit [modelcontextprotocol.io](https://modelcontextprotocol.io/).The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “NOT RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in [BCP 14](https://datatracker.ietf.org/doc/html/bcp14) [[RFC2119](https://datatracker.ietf.org/doc/html/rfc2119)] [[RFC8174](https://datatracker.ietf.org/doc/html/rfc8174)] when, and only when, they appear in all capitals, as shown here.
## [​](https://modelcontextprotocol.io/specification/2025-11-25#overview)

Overview

MCP provides a standardized way for applications to:
*   Share contextual information with language models
*   Expose tools and capabilities to AI systems
*   Build composable integrations and workflows

The protocol uses [JSON-RPC](https://www.jsonrpc.org/) 2.0 messages to establish communication between:
*   **Hosts**: LLM applications that initiate connections
*   **Clients**: Connectors within the host application
*   **Servers**: Services that provide context and capabilities

MCP takes some inspiration from the [Language Server Protocol](https://microsoft.github.io/language-server-protocol/), which standardizes how to add support for programming languages across a whole ecosystem of development tools. In a similar way, MCP standardizes how to integrate additional context and tools into the ecosystem of AI applications.
## [​](https://modelcontextprotocol.io/specification/2025-11-25#key-details)

Key Details

### [​](https://modelcontextprotocol.io/specification/2025-11-25#base-protocol)

Base Protocol

*   [JSON-RPC](https://www.jsonrpc.org/) message format
*   Stateful connections
*   Server and client capability negotiation

### [​](https://modelcontextprotocol.io/specification/2025-11-25#features)

Features

Servers offer any of the following features to clients:
*   **Resources**: Context and data, for the user or the AI model to use
*   **Prompts**: Templated messages and workflows for users
*   **Tools**: Functions for the AI model to execute

Clients may offer the following features to servers:
*   **Sampling**: Server-initiated agentic behaviors and recursive LLM interactions
*   **Roots**: Server-initiated inquiries into URI or filesystem boundaries to operate in
*   **Elicitation**: Server-initiated requests for additional information from users

### [​](https://modelcontextprotocol.io/specification/2025-11-25#additional-utilities)

Additional Utilities

*   Configuration
*   Progress tracking
*   Cancellation
*   Error reporting
*   Logging

## [​](https://modelcontextprotocol.io/specification/2025-11-25#security-and-trust-&-safety)

Security and Trust & Safety

The Model Context Protocol enables powerful capabilities through arbitrary data access and code execution paths. With this power comes important security and trust considerations that all implementors must carefully address.
### [​](https://modelcontextprotocol.io/specification/2025-11-25#key-principles)

Key Principles

1.   **User Consent and Control**
    *   Users must explicitly consent to and understand all data access and operations
    *   Users must retain control over what data is shared and what actions are taken
    *   Implementors should provide clear UIs for reviewing and authorizing activities

2.   **Data Privacy**
    *   Hosts must obtain explicit user consent before exposing user data to servers
    *   Hosts must not transmit resource data elsewhere without user consent
    *   User data should be protected with appropriate access controls

3.   **Tool Safety**
    *   Tools represent arbitrary code execution and must be treated with appropriate caution.
        *   In particular, descriptions of tool behavior such as annotations should be considered untrusted, unless obtained from a trusted server.

    *   Hosts must obtain explicit user consent before invoking any tool
    *   Users should understand what each tool does before authorizing its use

4.   **LLM Sampling Controls**
    *   Users must explicitly approve any LLM sampling requests
    *   Users should control:
        *   Whether sampling occurs at all
        *   The actual prompt that will be sent
        *   What results the server can see

    *   The protocol intentionally limits server visibility into prompts

### [​](https://modelcontextprotocol.io/specification/2025-11-25#implementation-guidelines)

Implementation Guidelines

While MCP itself cannot enforce these security principles at the protocol level, implementors **SHOULD**:
1.   Build robust consent and authorization flows into their applications
2.   Provide clear documentation of security implications
3.   Implement appropriate access controls and data protections
4.   Follow security best practices in their integrations
5.   Consider privacy implications in their feature designs

## [​](https://modelcontextprotocol.io/specification/2025-11-25#learn-more)

Learn More

Explore the detailed specification for each protocol component:

## Architecture

## Base Protocol

## Server Features

## Client Features

## Contributing

Was this page helpful?

Yes No

[Key Changes](https://modelcontextprotocol.io/specification/2025-11-25/changelog)

⌘I

[github](https://github.com/modelcontextprotocol)
