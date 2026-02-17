/**
 * @fileoverview Manages the lifecycle of the configured MCP transport.
 * @module src/mcp-server/transports/manager
 */
import type { ServerType } from '@hono/node-server';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { AppConfig as AppConfigType } from '../../config/index.js';
import { requestContextService } from '../../utils/index.js';
import type { logger as LoggerType } from '../../utils/index.js';
import { startHttpTransport, stopHttpTransport } from './http/httpTransport.js';
import type { TransportServer } from './ITransport.js';
import {
  startStdioTransport,
  stopStdioTransport,
} from './stdio/stdioTransport.js';

export class TransportManager {
  private serverInstance: TransportServer | null = null;

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

    this.logger.info(
      `Starting transport: ${this.config.mcpTransportType}`,
      context,
    );

    if (this.config.mcpTransportType === 'http') {
      // HTTP: pass factory so each request gets a fresh McpServer+transport pair
      // (SDK 1.26.0 security fix — GHSA-345p-7cg4-v4c7)
      this.serverInstance = await startHttpTransport(
        this.createMcpServer,
        context,
      );
    } else if (this.config.mcpTransportType === 'stdio') {
      // Stdio: single client, single connection — one server instance is correct
      const mcpServer = await this.createMcpServer();
      this.serverInstance = await startStdioTransport(mcpServer, context);
    } else {
      // This case should ideally not be reached due to config validation,
      // but it's a good safeguard.
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

    if (!this.serverInstance) {
      this.logger.warning(
        'Stop called but no active server instance found.',
        context,
      );
      return;
    }

    if (this.config.mcpTransportType === 'http') {
      await stopHttpTransport(this.serverInstance as ServerType, context);
    } else if (this.config.mcpTransportType === 'stdio') {
      await stopStdioTransport(this.serverInstance as McpServer, context);
    }
  }

  getServer(): TransportServer | null {
    return this.serverInstance;
  }
}
