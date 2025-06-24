/**
 * @fileoverview CLI entry point for running the AI agent.
 * This script parses command-line arguments to configure and instantiate
 * the Agent, then starts its execution loop with a given prompt.
 * @module src/agent/cli/main
 */

import { Agent } from "../agent-core/agent.js";
import { logger } from "../../utils/index.js";

async function main() {
  // A more robust CLI would use a library like yargs or commander
  // to parse arguments, but for this example, we'll use process.argv.
  const args = process.argv.slice(2);
  const agentId = "cli-agent-001";
  const prompt = args.join(" ");

  if (!prompt) {
    console.error("Error: Please provide a prompt as an argument.");
    console.error("Usage: node dist/agent/cli/main.js <your prompt here>");
    process.exit(1);
  }

  try {
    const agent = new Agent({ agentId });

    console.log("\n--- User Prompt ---");
    console.log(prompt);
    console.log("\n--- LLM Response ---");

    await agent.run(prompt, (chunk) => {
      process.stdout.write(chunk);
    });

    console.log("\n--------------------");

    logger.info("Agent run completed successfully.");
  } catch (error) {
    // The agent's internal error handling should catch most things,
    // but this is a final safeguard.
    const finalError =
      error instanceof Error
        ? error.message
        : "An unknown fatal error occurred.";
    console.error(`Fatal Error: ${finalError}`);
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
