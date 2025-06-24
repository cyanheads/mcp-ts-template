# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a production-ready TypeScript template for building Model Context Protocol (MCP) servers and clients following the **MCP 2025-03-26 specification**. It provides a comprehensive foundation with built-in utilities, authentication, error handling, and service integrations.

**Key Stats:**

- 57 TypeScript source files
- 32 directories in src/
- Supports both stdio and HTTP (SSE) transports
- Built-in authentication (JWT/OAuth)
- Comprehensive error handling and logging
- Ready-to-use DuckDB and OpenRouter integrations

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
- `npm run depcheck` - Check for unused dependencies
- `npm run fetch-spec` - Fetch OpenAPI specification
- `npm run db:duckdb-example` - Run DuckDB example with debug logging

### Testing & Quality

**Important**: No specific test framework is configured. Before adding tests:

1. Check README or search codebase for testing approach
2. Ask user for preferred test framework if not found
3. Always run linting after code changes

## Project Architecture

### Core Components

**Entry Point (`src/index.ts`)**:

- Main application entry with graceful shutdown handling
- Initializes logger and configuration
- Starts appropriate transport (stdio/HTTP)
- Handles process signals and unhandled errors

**Configuration (`src/config/index.ts`)**:

- Environment variable validation with Zod schemas
- Project root detection and directory creation
- Comprehensive config object with defaults
- Supports development and production environments

**MCP Server (`src/mcp-server/`)**:

- `server.ts` - Core server initialization and transport selection
- `createMcpServerInstance()` - Factory for McpServer instances
- Per-session instances for HTTP, singleton for stdio
- Automatic tool and resource registration

**MCP Client (`src/mcp-client/`)**:

- Modular client implementation for connecting to external MCP servers
- `core/clientManager.ts` - Connection lifecycle management
- `client-config/configLoader.ts` - Configuration validation
- Support for both stdio and HTTP transports
- Connection caching and automatic reconnection

### Transport Layer

**Stdio Transport (`src/mcp-server/transports/stdioTransport.ts`)**:

- Single server instance communicating via stdin/stdout
- Simple process-based communication
- No authentication required

**HTTP Transport (`src/mcp-server/transports/httpTransport.ts`)**:

- Hono-based web server with Server-Sent Events
- Per-session MCP server instances
- CORS support and port retry logic
- Session management with in-memory store
- Rate limiting and security headers

**Authentication (`src/mcp-server/transports/auth/`)**:

- JWT mode: Self-contained tokens for development
- OAuth mode: External authorization server integration
- Middleware-based authentication
- Configurable auth strategies

### Utilities Framework (`src/utils/`)

**Error Handling (`src/utils/internal/errorHandler.ts`)**:

- Centralized `ErrorHandler` class with pattern-based classification
- Automatic error code determination
- Consistent logging and context tracking
- `tryCatch` helper for robust error handling
- Support for custom error mappings

**Logging (`src/utils/internal/logger.ts`)**:

- Winston-based structured logging
- File rotation and MCP notifications
- Context-aware logging with request correlation
- Multiple log levels and output formats

**Request Context (`src/utils/internal/requestContext.ts`)**:

- Request/operation tracking across the application
- Correlation ID generation and management
- Context inheritance and merging

**Security (`src/utils/security/`)**:

- Input sanitization and validation
- Rate limiting with configurable limits
- ID generation (UUIDs and prefixed IDs)
- Log redaction for sensitive data

**Parsing (`src/utils/parsing/`)**:

- Natural language date parsing with chrono-node
- Partial JSON parsing with error handling
- Think block extraction from LLM responses

**Metrics (`src/utils/metrics/`)**:

- Token counting with tiktoken
- Performance and usage tracking utilities

**Network (`src/utils/network/`)**:

- HTTP requests with timeout support
- Fetch utilities with error handling

### Services Layer (`src/services/`)

**DuckDB Service (`src/services/duck-db/`)**:

- Complete DuckDB integration with connection management
- Query execution, streaming, and transaction support
- Extension loading and prepared statements
- Type-safe query interfaces

**OpenRouter Provider (`src/services/llm-providers/openRouterProvider.ts`)**:

- LLM integration via OpenRouter API
- OpenAI SDK compatibility
- Configurable models and parameters

**Supabase Client (`src/services/supabase/supabaseClient.ts`)**:

- Supabase integration with authentication
- Database and storage access

### Type System (`src/types-global/`)

**Error Types (`src/types-global/errors.ts`)**:

- `BaseErrorCode` enum for standardized error classification
- `McpError` class extending native Error with additional context
- Type-safe error handling patterns

### Example Implementations

**Tools (`src/mcp-server/tools/`)**:

- `echoTool/` - Simple message formatting and repetition
- `catFactFetcher/` - Async API fetching example
- `imageTest/` - Image processing demonstration

**Resources (`src/mcp-server/resources/`)**:

- `echoResource/` - Basic resource implementation example

### Project Structure

```
src/
├── config/                    # Environment and configuration management
├── index.ts                   # Main application entry point
├── mcp-client/               # MCP client implementation
│   ├── client-config/        # Configuration loading and validation
│   ├── core/                 # Core client logic and caching
│   └── transports/           # Client transport implementations
├── mcp-server/               # MCP server implementation
│   ├── resources/            # MCP resources (data sources)
│   ├── server.ts            # Server initialization and setup
│   ├── tools/               # MCP tools (executable functions)
│   └── transports/          # Server transport implementations
├── services/                 # External service integrations
│   ├── duck-db/             # DuckDB database service
│   ├── llm-providers/       # LLM provider integrations
│   └── supabase/            # Supabase service integration
├── storage/                  # Data storage examples
├── types-global/             # Shared TypeScript type definitions
└── utils/                    # Utility functions and helpers
    ├── internal/             # Core utilities (logging, errors, context)
    ├── metrics/              # Performance and usage metrics
    ├── network/              # Network and HTTP utilities
    ├── parsing/              # Data parsing utilities
    └── security/             # Security and validation utilities
```

## Key Architectural Patterns

### Error Handling Strategy

1. **Centralized Processing**: All errors flow through `ErrorHandler`
2. **Pattern-Based Classification**: Automatic error code assignment
3. **Context Preservation**: Request context tracking throughout
4. **Structured Logging**: Consistent error logging with correlation IDs
5. **Safe Execution**: `tryCatch` wrapper for robust error handling

**Example Usage**:

```typescript
return ErrorHandler.tryCatch(
  async () => {
    // Your logic here
  },
  {
    operation: "operationName",
    context,
    errorCode: BaseErrorCode.VALIDATION_ERROR,
    critical: true,
  },
);
```

### Configuration Management

1. **Environment-Driven**: All config from environment variables
2. **Validation**: Zod schemas ensure type safety
3. **Defaults**: Sensible defaults for development
4. **Security**: Separate auth modes (JWT/OAuth)
5. **Directory Management**: Automatic directory creation with validation

### Transport Abstraction

1. **Pluggable Design**: Easy to add new transport types
2. **Per-Session State**: HTTP transport maintains session isolation
3. **Authentication**: Middleware-based auth for HTTP
4. **Error Handling**: Consistent error responses across transports

### Tool/Resource Development

1. **Schema-First**: Zod validation for all inputs
2. **Modular Structure**: Separate logic, registration, and exports
3. **Error Handling**: Integrated with centralized error system
4. **Documentation**: JSDoc comments throughout

## Core Architectural Principles

### 1. Logic Throws, Handlers Catch

**CRITICAL PATTERN**: This is the cornerstone of the error-handling strategy.

- **Core Logic (`logic.ts`)**: Contains pure business logic. Must throw structured `McpError` on failure. **Never** use `try...catch` blocks in logic files.
- **Handlers (`registration.ts`, Transports)**: Wrap all logic calls in `try...catch`. Only place where errors are caught and formatted into responses.

### 2. Structured, Traceable Operations

Every operation must be traceable through structured logging and context propagation.

- **`RequestContext`**: Create using `requestContextService.createRequestContext()` and pass through all function calls
- **`Logger`**: All logging through centralized `logger` with `RequestContext`

### 3. File Structure Patterns

**Tools Structure**: `src/mcp-server/tools/toolName/`

```
toolName/
├── index.ts          # Barrel file, exports only register function
├── logic.ts          # Core business logic, schemas, types
└── registration.ts   # MCP server registration and error handling
```

**Resources Structure**: `src/mcp-server/resources/resourceName/` (same pattern)

## Development Guidelines

### Mandatory Development Workflow

**For Tools** (follow `echoTool` as canonical example):

1. **Define Schema and Logic (`logic.ts`)**:

   ```typescript
   // 1. Export Zod schema with .describe() on all fields
   export const ToolInputSchema = z.object({...});

   // 2. Export TypeScript types
   export type ToolInput = z.infer<typeof ToolInputSchema>;
   export interface ToolResponse {...}

   // 3. Export core logic function
   export async function toolLogic(
     params: ToolInput,
     context: RequestContext
   ): Promise<ToolResponse> {
     // Pure business logic - throws on error
   }
   ```

2. **Register Tool and Handle Errors (`registration.ts`)**:

   ```typescript
   export const registerTool = async (server: McpServer): Promise<void> => {
     server.tool(toolName, description, schema.shape, async (params) => {
       const context = requestContextService.createRequestContext({...});

       try {
         const result = await toolLogic(params, context);
         return { content: [...], isError: false };
       } catch (error) {
         const handledError = ErrorHandler.handleError(error, {...});
         return { content: [...], isError: true };
       }
     });
   };
   ```

3. **Export from Barrel (`index.ts`)**:
   ```typescript
   export { registerTool } from "./registration.js";
   ```

### Environment Variables

**Core Configuration**:

- `MCP_TRANSPORT_TYPE` - "stdio" or "http" (default: stdio)
- `MCP_HTTP_PORT` - HTTP server port (default: 3010)
- `MCP_HTTP_HOST` - HTTP server host (default: 127.0.0.1)
- `MCP_LOG_LEVEL` - Logging level (default: debug)
- `NODE_ENV` - Environment (default: development)

**Authentication (HTTP Transport)**:

- `MCP_AUTH_SECRET_KEY` - JWT signing key (required for HTTP)
- `MCP_AUTH_MODE` - "jwt" or "oauth" (default: jwt)
- `OAUTH_ISSUER_URL` - OAuth issuer URL (for oauth mode)
- `OAUTH_AUDIENCE` - OAuth audience (for oauth mode)

**Service Integrations**:

- `OPENROUTER_API_KEY` - OpenRouter API key
- `LLM_DEFAULT_MODEL` - Default LLM model
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key

### Adding New Tools

1. **Create Tool Directory**: `src/mcp-server/tools/yourTool/`
2. **Implement Logic**: Create `logic.ts` with Zod schemas
3. **Add Registration**: Create `registration.ts` using SDK patterns
4. **Export Module**: Create `index.ts` barrel file
5. **Register in Server**: Add to `src/mcp-server/server.ts`

**File Structure**:

```
src/mcp-server/tools/yourTool/
├── index.ts          # Barrel exports
├── logic.ts          # Core implementation with schemas
└── registration.ts   # MCP server registration
```

### Adding New Resources

Same pattern as tools but in `src/mcp-server/resources/yourResource/`

### Error Handling Best Practices

1. **Use ErrorHandler.tryCatch**: For all async operations
2. **Provide Context**: Include operation name and relevant data
3. **Choose Appropriate Error Codes**: Use `BaseErrorCode` enum
4. **Log Appropriately**: Use structured logging with context
5. **Handle Gracefully**: Always provide meaningful error messages

### Security Considerations

1. **Input Validation**: Always use Zod schemas for external input
2. **Sanitization**: Use `sanitizeInputForLogging` for sensitive data
3. **Authentication**: Required for HTTP transport in production
4. **Rate Limiting**: Built-in rate limiting for HTTP endpoints
5. **CORS**: Configure allowed origins for HTTP transport

### Performance Optimization

1. **Connection Caching**: Client connections are cached automatically
2. **Session Management**: HTTP transport uses per-session servers
3. **Logging**: Structured logging with appropriate levels
4. **Error Handling**: Efficient error classification with patterns

## Testing Strategy

**Current State**: No testing framework is currently configured.

**Before Adding Tests**:

1. Check existing documentation for testing preferences
2. Search codebase for any existing test files
3. Confirm with user their preferred testing approach
4. Common options: Jest, Vitest, Node.js built-in test runner

**Recommended Test Structure**:

```
tests/
├── unit/              # Unit tests for utilities and services
├── integration/       # Integration tests for MCP operations
└── e2e/              # End-to-end tests for full workflows
```
