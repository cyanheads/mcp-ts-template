#!/usr/bin/env node
/**
 * @fileoverview Main entry point for the MCP TypeScript Template application.
 * This script initializes the configuration, sets up the logger, starts the
 * MCP server (either via STDIO or HTTP transport), and handles graceful
 * shutdown on process signals or unhandled errors.
 * @module src/index
 */

// IMPORTANT: This line MUST be the first import to ensure OpenTelemetry is
// initialized before any other modules are loaded.
import { shutdownOpenTelemetry } from "./utils/telemetry/instrumentation.js";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import http from "http";
import { config, environment } from "./config/index.js";
import { initializeAndStartServer } from "./mcp-server/server.js";
import { requestContextService } from "./utils/index.js";
import { logger, McpLogLevel } from "./utils/internal/logger.js";

let mcpStdioServer: McpServer | undefined;
let actualHttpServer: http.Server | undefined;

const shutdown = async (signal: string): Promise<void> => {
  const shutdownContext = requestContextService.createRequestContext({
    operation: "ServerShutdown",
    triggerEvent: signal,
  });

  logger.info(
    `Received ${signal}. Initiating graceful shutdown...`,
    shutdownContext,
  );

  try {
    // Shutdown OpenTelemetry first to ensure buffered telemetry is sent
    await shutdownOpenTelemetry();

    let closePromise: Promise<void> = Promise.resolve();
    const transportType = config.mcpTransportType;

    if (transportType === "stdio" && mcpStdioServer) {
      logger.info(
        "Attempting to close main MCP server (STDIO)...",
        shutdownContext,
      );
      closePromise = mcpStdioServer.close();
    } else if (transportType === "http" && actualHttpServer) {
      logger.info("Attempting to close HTTP server...", shutdownContext);
      closePromise = new Promise((resolve, reject) => {
        actualHttpServer!.close((err) => {
          if (err) {
            logger.error("Error closing HTTP server.", err, shutdownContext);
            return reject(err);
          }
          logger.info("HTTP server closed successfully.", shutdownContext);
          resolve();
        });
      });
    }

    await closePromise;
    logger.info(
      "Graceful shutdown completed successfully. Exiting.",
      shutdownContext,
    );
    process.exit(0);
  } catch (error) {
    logger.error(
      "Critical error during shutdown process.",
      error as Error,
      shutdownContext,
    );
    process.exit(1);
  }
};

const start = async (): Promise<void> => {
  const validMcpLogLevels: McpLogLevel[] = [
    "debug",
    "info",
    "notice",
    "warning",
    "error",
    "crit",
    "alert",
    "emerg",
  ];
  const initialLogLevelConfig = config.logLevel;

  let validatedMcpLogLevel: McpLogLevel = "info";
  if (validMcpLogLevels.includes(initialLogLevelConfig as McpLogLevel)) {
    validatedMcpLogLevel = initialLogLevelConfig as McpLogLevel;
  } else {
    if (process.stdout.isTTY) {
      console.warn(
        `[Startup Warning] Invalid MCP_LOG_LEVEL "${initialLogLevelConfig}". Defaulting to "info".`,
      );
    }
  }

  await logger.initialize(validatedMcpLogLevel);

  const transportType = config.mcpTransportType;
  const startupContext = requestContextService.createRequestContext({
    operation: `ServerStartupSequence_${transportType}`,
    applicationName: config.mcpServerName,
    applicationVersion: config.mcpServerVersion,
    nodeEnvironment: environment,
  });

  logger.info(
    `Starting ${config.mcpServerName} (Version: ${config.mcpServerVersion}, Transport: ${transportType}, Env: ${environment})...`,
    startupContext,
  );

  try {
    const serverInstance = await initializeAndStartServer();

    if (transportType === "stdio" && serverInstance instanceof McpServer) {
      mcpStdioServer = serverInstance;
    } else if (
      transportType === "http" &&
      serverInstance instanceof http.Server
    ) {
      actualHttpServer = serverInstance;
    }

    logger.info(
      `${config.mcpServerName} is now running and ready.`,
      startupContext,
    );

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("uncaughtException", (error: Error) => {
      logger.fatal(
        "FATAL: Uncaught exception detected.",
        error,
        startupContext,
      );
      shutdown("uncaughtException");
    });
    process.on("unhandledRejection", (reason: unknown) => {
      logger.fatal(
        "FATAL: Unhandled promise rejection detected.",
        reason as Error,
        startupContext,
      );
      shutdown("unhandledRejection");
    });
  } catch (error) {
    logger.fatal(
      "CRITICAL ERROR DURING STARTUP.",
      error as Error,
      startupContext,
    );
    await shutdownOpenTelemetry(); // Attempt to flush any startup-related traces
    process.exit(1);
  }
};

(async () => {
  try {
    await start();
  } catch (error) {
    if (process.stdout.isTTY) {
      console.error("[GLOBAL CATCH] A fatal, unhandled error occurred:", error);
    }
    process.exit(1);
  }
})();
