/**
 * @fileoverview Bootstrap file for the agent CLI.
 * This script ensures that essential asynchronous services, like the logger,
 * are initialized before the main application logic is executed.
 * @module src/agent/cli/boot
 */

import { openRouterProvider } from "../../services/llm-providers/openRouterProvider.js";
import { logger } from "../../utils/index.js";

/**
 * Initializes services and starts the main application.
 */
async function bootstrap() {
  try {
    // 1. Initialize the logger first.
    await logger.initialize();

    // 2. Initialize the OpenRouter provider.
    openRouterProvider.initialize();

    // 3. Dynamically import the main application logic after all services are initialized.
    await import("./main.js");
  } catch (error) {
    const finalError =
      error instanceof Error
        ? error.message
        : "An unknown fatal error occurred during bootstrap.";
    console.error(`Fatal Bootstrap Error: ${finalError}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

bootstrap();
