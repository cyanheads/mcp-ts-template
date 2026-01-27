# MCP Apps: Interactive UIs in AI Conversations

MCP Apps is the first official MCP extension ([SEP-1865](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/1865)), launched January 26, 2026. It enables MCP servers to deliver rich, interactive interfaces — dashboards, forms, visualizations, workflows — directly within the conversation via sandboxed HTML iframes with bidirectional JSON-RPC communication.

The specification unifies patterns from the community-driven [MCP-UI](https://github.com/nichochar/mcp-ui) project and [OpenAI's Apps SDK](https://openai.com/index/introducing-the-apps-sdk/) into a single vendor-neutral standard. Supported by Claude, ChatGPT, VS Code Insiders, and Goose.

## Why MCP Apps Exists

MCP's existing primitives — **tools**, **resources**, **prompts** — return data but can't present it interactively. A database query returning hundreds of rows forces tedious back-and-forth: "sort by revenue," "filter to last week," "show row 47." Each interaction requires another prompt and model inference.

MCP Apps introduces **UI Resources**: HTML documents with bundled JavaScript that render inline in the conversation. Users interact directly — clicking, filtering, selecting — while the model sees structured context updates. The conversation becomes an application runtime.

## Architecture

MCP Apps follows a resource-first design where UI components are pre-declared, not dynamically generated.

### Lifecycle

1. Server registers a **UI Resource** with `ui://` URI scheme and `text/html;profile=mcp-app` MIME type
2. Tool references the UI via `_meta.ui.resourceUri`
3. On tool invocation, host fetches the HTML resource and renders it in a sandboxed iframe
4. App and host communicate bidirectionally via JSON-RPC over `postMessage`

### Communication Protocol

Uses MCP's existing JSON-RPC base protocol — no custom message format. Standard `@modelcontextprotocol/sdk` works, and future MCP features automatically apply to apps.

| Message | Direction | Purpose |
|---|---|---|
| `ui/initialize` | Host → App | Initialize communication, pass capabilities |
| `tools/call` | App → Host | Request tool execution |
| `ui/message` | App → Host | Send message to conversation |
| `ui/notifications/tool-result` | Host → App | Push tool results to app |
| `ui/notifications/context-update` | App → Host | Update model context |

### Capability Negotiation

Extension identifier: `io.modelcontextprotocol/ui`. Servers should provide text-only fallbacks for hosts that don't support the extension.

## Implementation

Two components: server-side tool/resource registration and client-side App class.

**Package:** [`@modelcontextprotocol/ext-apps`](https://www.npmjs.com/package/@modelcontextprotocol/ext-apps)

### Server-Side Registration

Helpers from `@modelcontextprotocol/ext-apps/server`:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool, registerAppResource, RESOURCE_MIME_TYPE }
  from "@modelcontextprotocol/ext-apps/server";

const server = new McpServer({ name: "My Server", version: "1.0.0" });
const resourceUri = "ui://get-time/mcp-app.html";

// Register tool linked to UI resource
registerAppTool(server, "get-time", {
  title: "Get Time",
  description: "Returns server time with interactive display",
  inputSchema: {},
  _meta: { ui: { resourceUri } }
}, async () => ({
  content: [{ type: "text", text: new Date().toISOString() }]
}));

// Register the UI resource itself
registerAppResource(server, resourceUri, resourceUri,
  { mimeType: RESOURCE_MIME_TYPE },
  async () => ({
    contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: htmlContent }]
  })
);
```

### Client-Side App Class

The `App` class abstracts `postMessage` communication:

```typescript
import { App } from "@modelcontextprotocol/ext-apps";

const app = new App({ name: "Time Widget", version: "1.0.0" });

// Handle tool results pushed from host
app.ontoolresult = (result) => {
  const time = result.content?.find(c => c.type === "text")?.text;
  document.getElementById("time")!.textContent = time ?? "";
};

// Call server tools from UI
document.getElementById("refresh")!.onclick = async () => {
  const result = await app.callServerTool({ name: "get-time", arguments: {} });
  // Handle result...
};

await app.connect(); // Establish postMessage channel
```

### React Integration

Hooks from `@modelcontextprotocol/ext-apps/react`:

```typescript
import { useApp, useToolResult } from "@modelcontextprotocol/ext-apps/react";

function TimeWidget() {
  const app = useApp({ name: "Time Widget", version: "1.0.0" });
  const result = useToolResult();
  // ...
}
```

### Framework Support

Official templates for React, Vue, Svelte, Preact, Solid, and vanilla JavaScript in the [ext-apps repository](https://github.com/modelcontextprotocol/ext-apps).

## Security Model

Four layers enforce isolation for third-party UI code running inside an AI assistant:

| Layer | Mechanism |
|---|---|
| **Iframe sandboxing** | Cannot access parent DOM, cookies, localStorage, or navigate the parent page. Only `allow-scripts` and `allow-same-origin` granted by default. |
| **Pre-declared templates** | UI resources declared upfront, enabling host review and prefetch before rendering. |
| **Auditable messages** | All UI-to-host communication flows through loggable JSON-RPC. Complete audit trails of tool calls, context updates, and link requests. |
| **User consent** | Hosts can require explicit approval before executing UI-initiated tool calls. |

### CSP Configuration

Apps can declare required external domains:

```typescript
_meta: {
  ui: {
    permissions: ["microphone"],
    csp: {
      connect_domains: ["api.example.com"],
      resource_domains: ["cdn.example.com"],
      frame_domains: ["embed.example.com"]
    }
  }
}
```

Initial content is limited to `text/html` — HTML's security model is well-understood. External URLs, Remote DOM, and native widgets are deferred to future iterations.

## Relationship to OpenAI Apps SDK

MCP Apps and OpenAI's Apps SDK (launched November 2025) address the same problem with similar architecture. Key differences:

| Aspect | MCP Apps | OpenAI Apps SDK |
|---|---|---|
| MIME type | `text/html;profile=mcp-app` | `text/html+skybridge` |
| Bridge API | `@modelcontextprotocol/ext-apps` `App` class | `window.openai` |
| State persistence | Not yet specified | Widget state persistence, modal support |
| Standard | Vendor-neutral (Agentic AI Foundation) | ChatGPT-specific |

The [`@mcp-ui/client`](https://www.npmjs.com/package/@mcp-ui/client) adapter helps target both systems during transition.

## Governance

MCP was donated to the **Agentic AI Foundation** under the Linux Foundation in December 2025, co-founded by Anthropic, Block, and OpenAI. Platinum members include AWS, Google, Microsoft, and Cloudflare. As of late 2025, MCP had 97 million monthly SDK downloads and 10,000+ active servers.

## References

- [MCP Apps Announcement (Jan 26, 2026)](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/)
- [ext-apps Repository](https://github.com/modelcontextprotocol/ext-apps)
- [Draft Specification](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/draft/apps.mdx)
- [MCP Apps Official Docs](https://modelcontextprotocol.io/docs/extensions/apps)
- [Agentic AI Foundation Announcement](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation)
