# MCP Elicitation: A Developer's Guide to the TypeScript SDK

This document provides a comprehensive, developer-focused guide to the Model Context Protocol (MCP) Elicitation feature, with best practices and examples based on the `@modelcontextprotocol/sdk`.

## 1. What is Elicitation?

**Elicitation** is a standardized mechanism that allows an MCP server to dynamically request additional, structured information from a user during a tool's execution. Instead of failing due to missing information or relying on unstructured follow-up, a tool can pause, ask for exactly what it needs, and then resume its work once the user provides the data.

This enables more effective, contextual, and robust human-in-the-loop workflows.

## 2. The Elicitation Workflow

The elicitation process is a multi-turn interaction between the client and a server-side tool.

1.  **Client Declares Capability**: A client wishing to support elicitation must declare this capability during initialization.
2.  **Tool Invocation**: The client calls a tool on the server as usual.
3.  **Server Requests Input**: Inside the tool's logic, if information is missing, the server sends an `elicitation/create` request back to the client. This request includes a message for the user and a schema defining the required data structure.
4.  **Client Handles Request**: The client receives the `elicitation/create` request. Its pre-configured handler for this method is triggered.
5.  **User Provides Input**: The client's handler prompts the user for the requested information, using the schema to validate the input.
6.  **Client Responds**: The client sends the collected data back to the server as the result of the `elicitation/create` request.
7.  **Tool Execution Continues**: The server-side tool receives the user's data and proceeds with its original task.

## 3. Client-Side Implementation

Implementing elicitation on the client involves two steps: declaring the capability and handling requests.

### Step 1: Declare the `elicitation` Capability

When initializing the `Client` instance, add `elicitation: {}` to its capabilities.

```typescript
// From: node_modules/@modelcontextprotocol/sdk/dist/esm/examples/client/simpleStreamableHttp.js

import { Client, ElicitRequestSchema } from '@modelcontextprotocol/sdk';
import { z } from 'zod';
import readline from 'node:readline/promises';

// Create a new client with elicitation capability
const client = new Client({
  capabilities: {
    elicitation: {},
  },
  // ... other client config
});
```

### Step 2: Handle Elicitation Requests

Use `client.setRequestHandler()` to define the logic that runs when the server needs input. This handler is responsible for interacting with the user.

The handler receives the server's request and must return a result that matches the `ElicitResultSchema`, indicating whether the user accepted and provided content, or rejected the request.

```typescript
// From: node_modules/@modelcontextprotocol/sdk/dist/esm/examples/client/simpleStreamableHttp.js

// Set up elicitation request handler with proper validation
client.setRequestHandler(ElicitRequestSchema, async (request) => {
  console.log('\n🔔 Elicitation Request Received:');
  console.log(`Message: ${request.params.message}`);

  // Example: Use readline to prompt the user in a console app
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const responseText = await rl.question('> ');

    // The client MUST return a valid ElicitResult
    return {
      action: 'accept',
      content: responseText, // Or structured data if the schema is complex
    };
  } catch (error) {
    console.error('Failed to get user input:', error);
    return {
      action: 'reject',
      message: 'User cancelled or failed to provide input.',
    };
  } finally {
    rl.close();
  }
});
```

## 4. Server-Side Implementation

On the server, you create tools that can trigger the elicitation flow.

### Best Practice: The `elicitInput` Method

The `@modelcontextprotocol/sdk` server provides an `elicitInput` method on the `Server` instance (or available via context in a tool's logic). This is the standard way for a tool to request information from the client.

```typescript
// From: node_modules/@modelcontextprotocol/sdk/dist/esm/server/index.js

class Server {
  // ...
  async elicitInput(params, options) {
    const result = await this.request(
        { method: "elicitation/create", params },
        ElicitResultSchema, // Expects a valid ElicitResult back from the client
        options
    );

    // ... validation logic ...
    return result.content;
  }
  // ...
}
```

### Example: A Tool That Uses Elicitation

The following example defines a `collect-user-info` tool. If the `infoType` isn't provided directly, it uses elicitation to ask the user for it.

```typescript
// From: node_modules/@modelcontextprotocol/sdk/dist/esm/examples/server/simpleStreamableHttp.js

import { Server } from '@modelcontextprotocol/sdk/server';
import { z } from 'zod';

const server = new Server({
  /* ... server config ... */
});

// Register a tool that demonstrates elicitation
server.tool(
  'collect-user-info',
  'A tool that collects user information through elicitation',
  {
    infoType: z
      .enum(['contact', 'preferences', 'feedback'])
      .describe('Type of information to collect'),
  },
  async (params, context) => {
    let { infoType } = params;

    // If infoType is missing, elicit it from the user.
    if (!infoType) {
      const elicitedInfoType = await context.elicitInput({
        message: 'What type of information do you want to provide?',
        schema: {
          type: 'string',
          enum: ['contact', 'preferences', 'feedback'],
        },
      });

      // Zod validation on the elicited response ensures type safety
      const validation = z
        .enum(['contact', 'preferences', 'feedback'])
        .safeParse(elicitedInfoType);
      if (!validation.success) {
        throw new Error(`Invalid infoType received: ${elicitedInfoType}`);
      }
      infoType = validation.data;
    }

    // Proceed with the collected infoType
    return {
      status: 'success',
      message: `Successfully collected info for type: ${infoType}`,
    };
  },
);
```

## 5. Security & Data Validation

-   **Schema Enforcement**: The server sends a JSON Schema with the elicitation request. This allows the client to perform immediate, client-side validation. The server also validates the returning data to ensure its integrity.
-   **User Trust**: Clients should always clearly display which server is requesting information and provide the user with clear options to accept, reject, or modify their response.
-   **Sensitive Information**: Elicitation **MUST NOT** be used to request sensitive information like passwords or private keys.

## 6. Key Takeaways & Source of Truth

-   The RPC method for requesting user input is `elicitation/create`.
-   Clients must declare the `elicitation` capability.
-   Clients must implement a handler for `ElicitRequestSchema` requests.
-   Server-side tools trigger elicitation by calling the `elicitInput` method, which is the preferred and standard approach.
-   For canonical, up-to-date examples, refer directly to the SDK source code:
    -   **Client Example**: `node_modules/@modelcontextprotocol/sdk/dist/esm/examples/client/simpleStreamableHttp.js`
    -   **Server Example**: `node_modules/@modelcontextprotocol/sdk/dist/esm/examples/server/simpleStreamableHttp.js`
