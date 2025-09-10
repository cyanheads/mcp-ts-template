/**
 * @fileoverview Main entry point for the MCP (Model Context Protocol) server.
 * This file orchestrates the server's lifecycle:
 * 1. Initializes the core `McpServer` instance (from `@modelcontextprotocol/sdk`) with its identity and capabilities.
 * 2. Registers available resources and tools, making them discoverable and usable by clients.
 * 3. Selects and starts the appropriate communication transport (stdio or Streamable HTTP)
 *    based on configuration.
 * 4. Handles top-level error management during startup.
 *
 * MCP Specification References:
 * - Lifecycle: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/basic/lifecycle.mdx
 * - Overview (Capabilities): https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/basic/index.mdx
 * - Transports: https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/basic/transports.mdx
 * @module src/mcp-server/server
 */
import { ServerType } from '@hono/node-server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import http from 'http';
import { ZodObject, ZodRawShape } from 'zod';

import { config } from '../config/index.js';
import { JsonRpcErrorCode } from '../types-global/errors.js';
import { ErrorHandler, logger, requestContextService } from '../utils/index.js';
import { echoResourceDefinition } from './resources/definitions/echo.resource.js';
import { registerResource } from './resources/utils/resourceHandlerFactory.js';
import { catFactTool } from './tools/definitions/template-cat-fact.tool.js';
import { echoTool } from './tools/definitions/template-echo-message.tool.js';
import { imageTestTool } from './tools/definitions/template-image-test.tool.js';
import { ToolDefinition } from './tools/utils/toolDefinition.js';
import { createMcpToolHandler } from './tools/utils/toolHandlerFactory.js';
import { TransportManager } from './transports/core/transportTypes.js';
import { startHttpTransport } from './transports/http/index.js';
import { startStdioTransport } from './transports/stdio/index.js';

/**
 * A type-safe helper function to register a single tool definition.
 * It creates a handler and registers the tool with the server,
 * ensuring that the generic types for the handler and the tool definition match.
 *
 * @param server The McpServer instance.
 * @param tool The ToolDefinition object to register.
 */
/**
 * Derives a human-readable title from a tool's programmatic name.
 * e.g., 'get_cat_fact' becomes 'Get Cat Fact'.
 * @param name The tool name.
 * @returns A formatted title string.
 */
function deriveTitleFromName(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

async function registerTool<
  TInputSchema extends ZodObject<ZodRawShape>,
  TOutputSchema extends ZodObject<ZodRawShape>,
>(
  server: McpServer,
  tool: ToolDefinition<TInputSchema, TOutputSchema>,
): Promise<void> {
  const registrationContext = requestContextService.createRequestContext({
    operation: 'RegisterTool',
    toolName: tool.name,
  });

  logger.debug(`Registering tool: '${tool.name}'`, registrationContext);

  await ErrorHandler.tryCatch(
    () => {
      const handler = createMcpToolHandler({
        toolName: tool.name,
        logic: tool.logic,
        ...(tool.responseFormatter && {
          responseFormatter: tool.responseFormatter,
        }),
      });

      // Title precedence should respect author intent first, then annotations, then a derived fallback
      // matching SDK guidance (title → annotations.title → name).
      const title =
        tool.title ?? tool.annotations?.title ?? deriveTitleFromName(tool.name);

      server.registerTool(
        tool.name,
        {
          title,
          description: tool.description,
          // Zod: pass the object shape so the SDK can convert to JSON Schema
          inputSchema: tool.inputSchema.shape,
          outputSchema: tool.outputSchema.shape,
          ...(tool.annotations && { annotations: tool.annotations }),
        },
        handler,
      );

      logger.notice(
        `Tool '${tool.name}' registered successfully.`,
        registrationContext,
      );
    },
    {
      operation: `RegisteringTool_${tool.name}`,
      context: registrationContext,
      errorCode: JsonRpcErrorCode.InitializationFailed,
      critical: true,
    },
  );
}

/**
 * Creates and configures a new instance of the `McpServer`.
 *
 * @returns A promise resolving with the configured `McpServer` instance.
 * @throws {McpError} If any resource or tool registration fails.
 * @private
 */
export async function createMcpServerInstance(): Promise<McpServer> {
  const context = requestContextService.createRequestContext({
    operation: 'createMcpServerInstance',
  });
  logger.info('Initializing MCP server instance', context);

  requestContextService.configure({
    appName: config.mcpServerName,
    appVersion: config.mcpServerVersion,
    environment: config.environment,
  });

  const server = new McpServer(
    {
      name: config.mcpServerName,
      version: config.mcpServerVersion,
      description: config.mcpServerDescription,
    },
    {
      capabilities: {
        logging: {},
        resources: { listChanged: true },
        tools: { listChanged: true },
      },
    },
  );

  try {
    logger.debug('Registering resources and tools...', context);
    // Register resources
    await registerResource(server, echoResourceDefinition);

    // Register all tools
    await registerTool(server, echoTool);
    await registerTool(server, catFactTool);
    await registerTool(server, imageTestTool);

    logger.info('Resources and tools registered successfully', context);
  } catch (err) {
    logger.error('Failed to register resources/tools', {
      ...context,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    throw err;
  }

  return server;
}

/**
 * Selects, sets up, and starts the appropriate MCP transport layer based on configuration.
 *
 * @returns Resolves with `McpServer` for 'stdio' or `http.Server` for 'http'.
 * @throws {Error} If transport type is unsupported or setup fails.
 * @private
 */
async function startTransport(): Promise<
  | { server: ServerType; transportManager: TransportManager }
  | { server: McpServer; transportManager: undefined }
> {
  const transportType = config.mcpTransportType;
  const context = requestContextService.createRequestContext({
    operation: 'startTransport',
    transport: transportType,
  });
  logger.info(`Starting transport: ${transportType}`, context);

  if (transportType === 'http') {
    const { server, transportManager } = await startHttpTransport(
      createMcpServerInstance,
      context,
    );
    return { server, transportManager };
  }

  if (transportType === 'stdio') {
    const server = await createMcpServerInstance();
    await startStdioTransport(server, context);
    return { server, transportManager: undefined };
  }

  logger.crit(
    `Unsupported transport type configured: ${transportType as string}`,
    context,
  );
  throw new Error(
    `Unsupported transport type: ${transportType as string}. Must be 'stdio' or 'http'.`,
  );
}

/**
 * Main application entry point. Initializes and starts the MCP server.
 */
export async function initializeAndStartServer(): Promise<
  | { server: ServerType; transportManager: TransportManager }
  | { server: McpServer; transportManager: undefined }
> {
  const context = requestContextService.createRequestContext({
    operation: 'initializeAndStartServer',
  });
  logger.info('MCP Server initialization sequence started.', context);
  try {
    const result = await startTransport();
    logger.info(
      'MCP Server initialization sequence completed successfully.',
      context,
    );
    if (
      'transportManager' in result &&
      result.transportManager &&
      result.server instanceof http.Server
    ) {
      return {
        server: result.server as ServerType,
        transportManager: result.transportManager,
      };
    }
    return {
      server: result.server as McpServer,
      transportManager: undefined,
    };
  } catch (err) {
    logger.crit('Critical error during MCP server initialization.', {
      ...context,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    ErrorHandler.handleError(err, {
      ...context,
      operation: 'initializeAndStartServer_Catch',
      critical: true,
    });
    logger.info(
      'Exiting process due to critical initialization error.',
      context,
    );
    process.exit(1);
  }
}
