# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Run

- `npm run build` - Build TypeScript and make executable
- `npm run rebuild` - Clean build (removes node_modules, logs, dist)
- `npm start` - Run the built server (stdio transport)
- `npm run start:stdio` - Run server with stdio transport and debug logging
- `npm run start:http` - Run server with HTTP transport and debug logging

### Development Tools

- `npm run format` - Format code with Prettier
- `npm run docs:generate` - Generate TypeDoc documentation
- `npm run tree` - Generate project structure tree
- `npm run inspector` - Launch MCP inspector for debugging

## Project Architecture

This is a TypeScript template for building Model Context Protocol (MCP) servers and clients following the MCP 2025-03-26 specification.

### Project Structure

```
mcp-ts-template
├── .github
│   └── workflows
│       └── publish.yml
├── docs
│   ├── api-references
│   │   ├── jsdoc-standard-tags.md
│   │   └── typedoc-reference.md
│   └── tree.md
├── scripts
│   ├── clean.ts
│   ├── fetch-openapi-spec.ts
│   ├── make-executable.ts
│   └── tree.ts
├── src
│   ├── config
│   │   └── index.ts
│   ├── mcp-client
│   │   ├── client-config
│   │   │   ├── configLoader.ts
│   │   │   ├── mcp-config.json
│   │   │   └── mcp-config.json.example
│   │   ├── core
│   │   │   ├── clientCache.ts
│   │   │   ├── clientConnectionLogic.ts
│   │   │   └── clientManager.ts
│   │   ├── transports
│   │   │   ├── httpClientTransport.ts
│   │   │   ├── index.ts
│   │   │   ├── stdioClientTransport.ts
│   │   │   └── transportFactory.ts
│   │   └── index.ts
│   ├── mcp-server
│   │   ├── resources
│   │   │   └── echoResource
│   │   │       ├── echoResourceLogic.ts
│   │   │       ├── index.ts
│   │   │       └── registration.ts
│   │   ├── tools
│   │   │   ├── catFactFetcher
│   │   │   │   ├── catFactFetcherLogic.ts
│   │   │   │   ├── catFactFetcherRegistration.ts
│   │   │   │   └── index.ts
│   │   │   ├── echoTool
│   │   │   │   ├── echoToolLogic.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── registration.ts
│   │   ├── transports
│   │   │   ├── authentication
│   │   │   │   └── authMiddleware.ts
│   │   │   ├── httpTransport.ts
│   │   │   └── stdioTransport.ts
│   │   └── server.ts
│   ├── services
│   │   ├── llm-providers
│   │   │   ├── openRouter
│   │   │   │   ├── index.ts
│   │   │   │   └── openRouterProvider.ts
│   │   │   ├── index.ts
│   │   │   └── llmFactory.ts
│   │   └── index.ts
│   ├── types-global
│   │   └── errors.ts
│   ├── utils
│   │   ├── internal
│   │   │   ├── errorHandler.ts
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
│   │   │   └── requestContext.ts
│   │   ├── metrics
│   │   │   ├── index.ts
│   │   │   └── tokenCounter.ts
│   │   ├── network
│   │   │   ├── fetchWithTimeout.ts
│   │   │   └── index.ts
│   │   ├── parsing
│   │   │   ├── dateParser.ts
│   │   │   ├── index.ts
│   │   │   └── jsonParser.ts
│   │   ├── security
│   │   │   ├── idGenerator.ts
│   │   │   ├── index.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── sanitization.ts
│   │   └── index.ts
│   └── index.ts
├── .clinerules
├── .dockerignore
├── .gitignore
├── CHANGELOG.md
├── CLAUDE.md
├── Dockerfile
├── LICENSE
├── mcp.json
├── package-lock.json
├── package.json
├── README.md
├── repomix.config.json
├── smithery.yaml
├── tsconfig.json
├── tsconfig.typedoc.json
├── tsdoc.json
└── typedoc.json
```

_Note: This tree excludes files and directories matched by .gitignore and default patterns._

### Key Architectural Patterns

**Server Architecture (`src/mcp-server/`)**:

- `server.ts` - Main server initialization and transport selection
- `createMcpServerInstance()` - Factory for McpServer instances (per-session for HTTP, singleton for stdio)
- Tools and resources are registered via dedicated registration functions
- Supports both stdio and HTTP (SSE) transports with JWT authentication for HTTP
- The `src/config/` directory and the root `src/index.ts` file are primarily related to the MCP server's overall configuration and entry point.

**Client Architecture (`src/mcp-client/`)**:

- Modular design with separate transport, config, and connection management
- `clientManager.ts` - Manages client lifecycle and connections
- `configLoader.ts` - Handles `mcp-config.json` validation with Zod schemas
- Supports connecting to external MCP servers via stdio or HTTP
- The `mcp-client` functionality is entirely self-contained within the `src/mcp-client` directory, though it does utilize shared utilities from `src/utils/`.

**Transport Layer**:

- stdio: Single server instance, connects via standard input/output
- HTTP: Per-session server instances, uses Server-Sent Events with CORS and JWT auth

**Utilities (`src/utils/`)**:

- Centralized error handling with pattern-based classification
- Request context tracking for correlation across operations
- Security utilities (sanitization, rate limiting, ID generation)
- Structured logging with file rotation and MCP notifications

### Configuration

**Environment Variables** (see README for full list):

- `MCP_TRANSPORT_TYPE` - "stdio" or "http" (default: stdio)
- `MCP_HTTP_PORT` - HTTP server port (default: 3010)
- `MCP_AUTH_SECRET_KEY` - Required for HTTP transport (JWT signing)
- `MCP_LOG_LEVEL` - Logging level (default: debug)

**Client Configuration**:

- `src/mcp-client/client-config/mcp-config.json` - Defines external server connections
- Falls back to `.example` file if main config missing

### Adding Tools/Resources

1. Create directory under `src/mcp-server/tools/yourTool/` or `src/mcp-server/resources/yourResource/`
2. Implement logic with Zod schemas in `logic.ts`
3. Create registration function in `registration.ts` using SDK patterns
4. Export from `index.ts` and call registration in `src/mcp-server/server.ts`
5. Use `ErrorHandler.tryCatch` for robust error handling

### Error Handling

- All errors go through `ErrorHandler` in `src/utils/internal/errorHandler.ts`
- Pattern-based error classification and consistent formatting
- Request context tracking via `requestContextService`
- Structured logging with correlation IDs

### Type Safety

- Strong TypeScript with strict mode enabled
- Zod validation for runtime data validation
- Global type definitions in `src/types-global/`
- MCP SDK types for protocol compliance
