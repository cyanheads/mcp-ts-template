# MCP Elicitation Feature: Standards Summary

This document summarizes the standards and specifications for the Model Context Protocol (MCP) Elicitation feature, based on research conducted on 2025-09-26.

## 1. Core Purpose and Definition

**Elicitation** is a standardized mechanism introduced in the **2025-06-18 MCP specification** that allows a server to dynamically request additional, structured information from a user when it's needed to complete a task.

- **Goal**: To enable more effective, contextual, and interactive human-in-the-loop workflows.
- **Function**: Instead of relying on unstructured text, servers can declare the exact variables and data types (e.g., dates, numbers, strings) they require.

---

## 2. Technical Workflow

The elicitation process is a multi-turn interaction:

1.  **Initial Request**: A client sends a standard tool request to the server.
2.  **Elicitation Request**: If information is missing or ambiguous, the server responds with an `elicitationRequest`, specifying the needed inputs.
3.  **User Input Collection**: The client prompts the user for the requested information, often using appropriate UI controls (e.g., a date picker for a date).
4.  **Continuation**: The client sends a `continueElicitation` request back to the server, containing the structured data provided by the user.
5.  **Completion**: With the required information now available, the server proceeds with the task and returns the final result.

---

## 3. Client Capability Declaration

To engage in this workflow, a client **must** declare its support for the feature during the initialization handshake.

```json
"capabilities": {
  "elicitation": {}
}
```

---

## 4. Security and Trust Standards

The specification places a strong emphasis on user safety and control:

-   **Servers MUST NOT** use elicitation to request sensitive information.
-   **Clients SHOULD**:
    -   Clearly display which server is requesting the information.
    -   Allow users to review and modify their responses before submission.
    -   Provide clear options to decline the request or cancel the workflow.

---

## 5. Data Validation and Structure

Elicitation enhances data integrity by allowing servers to define schemas for the requested inputs. This enables the client to perform immediate, client-side validation, ensuring that the data sent to the server is correctly typed and formatted.

---

## 6. Protocol Status

Elicitation is a new and significant feature in the MCP landscape. The specification notes that its design may evolve in future versions as it is adopted more widely. It reflects a shift towards AI-first architectures where protocols need to be more dynamic and conversational.

### Key Sources:
- [MCP Specification: Elicitation](https://modelcontextprotocol.io/specification/draft/client/elicitation)
- [Unlocking Human-Like AI with MCP Elicitation](https://www.singlestore.com/blog/unlocking-human-like-interactions-with-model-context-protocol-elicitation/)
- [Introducing MCP elicitation: Request user input at runtime](https://workos.com/blog/mcp-elicitation)
