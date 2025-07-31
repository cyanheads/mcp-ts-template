#!/usr/bin/env node

/**
 * @fileoverview Main entry point for the MCP TypeScript Template application.
 * This script initializes the configuration, sets up the logger, starts the
 * MCP server (either via STDIO or HTTP transport), and handles graceful
 * shutdown on process signals or unhandled errors.
 *
 * The script uses an Immediately Invoked Function Expression (IIFE) with async/await
 * to manage the asynchronous nature of server startup and shutdown.
 *
 * Key operations:
 * 1. Import necessary modules and utilities.
 * 2. Define a `shutdown` function for graceful server termination.
 * 3. Define a `start` function to:
 *    - Initialize the logger with the configured log level.
 *    - Create a startup request context for logging and correlation.
 *    - Initialize and start the MCP server transport (stdio or http).
 *    - Set up global error handlers (uncaughtException, unhandledRejection)
 *      and signal handlers (SIGTERM, SIGINT) to trigger graceful shutdown.
 * 4. Execute the `start` function within an async IIFE.
 *
 * @module src/index
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import http from "http"; // Import http module
import { config, environment } from "./config/index.js";
import { initializeAndStartServer } from "./mcp-server/server.js";
import { requestContextService } from "./utils/index.js";
import { logger, McpLogLevel } from "./utils/internal/logger.js";

/**
 * Holds the main MCP server instance, primarily for STDIO transport.
 * @private
 */
let mcpStdioServer: McpServer | undefined;

/**
 * Holds the Node.js HTTP server instance if HTTP transport is used.
 * @private
 */
let actualHttpServer: http.Server | undefined;

/**
 * Gracefully shuts down the main MCP server and associated resources.
 * Called on process termination signals or critical unhandled errors.
 *
 * @param signal - The signal or event name that triggered the shutdown.
 * @returns A promise that resolves when shutdown is complete or an error occurs.
 * @private
 */
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
            logger.error("Error closing HTTP server.", {
              ...shutdownContext,
              error: err.message,
            });
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
    logger.error("Critical error during shutdown process.", {
      ...shutdownContext,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    });
    process.exit(1);
  }
};

/**
 * Initializes and starts the main MCP server application.
 * Orchestrates logger setup, server initialization, transport startup,
 * and global error/signal handling.
 *
 * @returns A promise that resolves when the server has started and handlers are registered,
 *   or rejects if a critical startup error occurs.
 * @private
 */
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
        `[Startup Warning] Invalid MCP_LOG_LEVEL "${initialLogLevelConfig}" found in configuration. ` +
          `Defaulting to log level "info". Valid levels are: ${validMcpLogLevels.join(", ")}.`,
      );
    }
  }
  await logger.initialize(validatedMcpLogLevel);
  logger.info(
    `Logger has been initialized by start(). Effective MCP logging level set to: ${validatedMcpLogLevel}.`,
  );

  const transportType = config.mcpTransportType;
  const startupContext = requestContextService.createRequestContext({
    operation: `ServerStartupSequence_${transportType}`,
    applicationName: config.mcpServerName,
    applicationVersion: config.mcpServerVersion,
    nodeEnvironment: environment,
  });

  logger.debug("Application configuration loaded successfully.", {
    ...startupContext,
    configSummary: {
      serverName: config.mcpServerName,
      serverVersion: config.mcpServerVersion,
      transport: config.mcpTransportType,
      logLevel: config.logLevel,
      env: config.environment,
      httpPort:
        config.mcpTransportType === "http" ? config.mcpHttpPort : undefined,
      httpHost:
        config.mcpTransportType === "http" ? config.mcpHttpHost : undefined,
    },
  });

  logger.info(
    `Starting ${config.mcpServerName} (Version: ${config.mcpServerVersion}, Transport: ${transportType}, Env: ${environment})...`,
    startupContext,
  );

  try {
    logger.debug(
      "Calling initializeAndStartServer to set up MCP transport...",
      startupContext,
    );

    const serverInstance = await initializeAndStartServer();

    if (transportType === "stdio" && serverInstance instanceof McpServer) {
      mcpStdioServer = serverInstance;
      logger.info(
        "STDIO McpServer instance stored globally for shutdown.",
        startupContext,
      );
    } else if (
      transportType === "http" &&
      serverInstance instanceof http.Server
    ) {
      actualHttpServer = serverInstance;
      logger.info(
        "HTTP transport initialized, http.Server instance stored globally for shutdown.",
        startupContext,
      );
    } else if (transportType === "http") {
      // This case should ideally not be reached if initializeAndStartServer correctly returns http.Server
      logger.warning(
        "HTTP transport initialized, but no http.Server instance was returned to index.ts. Shutdown might be incomplete.",
        startupContext,
      );
    }

    logger.info(
      `${config.mcpServerName} is now running and ready to accept connections via ${transportType} transport.`,
      {
        ...startupContext,
        serverStartTime: new Date().toISOString(),
      },
    );

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    process.on("uncaughtException", async (error: Error) => {
      const errorContext = {
        ...startupContext,
        triggerEvent: "uncaughtException",
        errorMessage: error.message,
        errorStack: error.stack,
      };
      logger.error(
        "FATAL: Uncaught exception detected. This indicates a bug or unexpected state. Initiating shutdown...",
        errorContext,
      );
      await shutdown("uncaughtException");
    });

    process.on(
      "unhandledRejection",
      async (reason: unknown, _promise: Promise<unknown>) => {
        const rejectionContext = {
          ...startupContext,
          triggerEvent: "unhandledRejection",
          rejectionReason:
            reason instanceof Error ? reason.message : String(reason),
          rejectionStack: reason instanceof Error ? reason.stack : undefined,
        };
        logger.error(
          "FATAL: Unhandled promise rejection detected. This indicates a bug or missing error handling in async code. Initiating shutdown...",
          rejectionContext,
        );
        await shutdown("unhandledRejection");
      },
    );
  } catch (error) {
    logger.error(
      "CRITICAL ERROR DURING STARTUP: The application could not start. Exiting.",
      {
        ...startupContext,
        finalErrorContext: "ApplicationStartupFailure",
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      },
    );
    process.exit(1);
  }
};

// Async IIFE to allow top-level await for the start function.
(async () => {
  try {
    await start();
  } catch (error) {
    // This catch is a final fallback. `start()` should handle its errors and exit.
    if (process.stdout.isTTY) {
      console.error(
        "[GLOBAL CATCH] An unexpected error occurred outside of the main start function's error handling:",
        error,
      );
    }
    process.exit(1);
  }
})();
