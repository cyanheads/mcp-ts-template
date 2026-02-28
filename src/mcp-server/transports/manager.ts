/**
 * @fileoverview Manages the lifecycle of the configured MCP transport.
 * @module src/mcp-server/transports/manager
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AppConfig as AppConfigType } from '@/config/index.js';
import {
  startHttpTransport,
  stopHttpTransport,
} from '@/mcp-server/transports/http/httpTransport.js';
import type { TransportServer } from '@/mcp-server/transports/ITransport.js';
import {
  startStdioTransport,
  stopStdioTransport,
} from '@/mcp-server/transports/stdio/stdioTransport.js';
import type { logger as LoggerType } from '@/utils/internal/logger.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

export class TransportManager {
  private serverInstance: TransportServer | null = null;
  private shutdown: ((context: RequestContext) => Promise<void>) | null = null;

  constructor(
    private config: AppConfigType,
    private logger: typeof LoggerType,
    private createMcpServer: () => Promise<McpServer>,
  ) {}

  async start(): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: 'TransportManager.start',
      transport: this.config.mcpTransportType,
    });

    this.logger.info(`Starting transport: ${this.config.mcpTransportType}`, context);

    if (this.config.mcpTransportType === 'http') {
      // HTTP: pass factory so each request gets a fresh McpServer+transport pair
      // (SDK 1.26.0 security fix — GHSA-345p-7cg4-v4c7)
      const server = await startHttpTransport(this.createMcpServer, context);
      this.serverInstance = server;
      this.shutdown = (ctx) => stopHttpTransport(server, ctx);
    } else if (this.config.mcpTransportType === 'stdio') {
      // Stdio: single client, single connection — one server instance is correct
      const mcpServer = await this.createMcpServer();
      this.serverInstance = await startStdioTransport(mcpServer, context);
      this.shutdown = (ctx) => stopStdioTransport(mcpServer, ctx);
    } else {
      const transportType = String(this.config.mcpTransportType);
      const error = new Error(`Unsupported transport type: ${transportType}`);
      this.logger.crit(error.message, context);
      throw error;
    }
  }

  async stop(signal: string): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: 'TransportManager.stop',
      signal,
    });

    if (!this.shutdown) {
      this.logger.warning('Stop called but no active server instance found.', context);
      return;
    }

    await this.shutdown(context);
    this.serverInstance = null;
    this.shutdown = null;
  }

  getServer(): TransportServer | null {
    return this.serverInstance;
  }
}
