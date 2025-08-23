#!/usr/bin/env node
/**
 * @fileoverview A detailed linting script that provides clear feedback on the process.
 * This script uses execa to run eslint, capturing and displaying the output.
 * @module scripts/lint
 */

import { execa } from "execa";
import chalk from "chalk";

async function runLint() {
  console.log(chalk.blue.bold("Starting comprehensive linting process..."));
  console.log(chalk.yellow("Running ESLint on the entire project."));

  try {
    const startTime = Date.now();
    const { exitCode } = await execa("eslint", ["."], {
      stdio: "inherit",
    });

    const duration = (Date.now() - startTime) / 1000;

    if (exitCode === 0) {
      console.log(
        chalk.green.bold(
          `\n✅ Linting complete in ${duration.toFixed(2)}s. No issues found.`,
        ),
      );
    } else {
      console.error(
        chalk.red.bold(
          `\n❌ Linting failed in ${duration.toFixed(2)}s. Please review the errors above.`,
        ),
      );
      // The output is already inherited, so no need to print stdout/stderr here.
    }

    process.exit(exitCode);
  } catch (error) {
    console.error(
      chalk.red.bold(
        "\nAn unexpected error occurred during the linting process:",
      ),
    );
    if (error instanceof Error) {
      console.error(chalk.red(error.message));
    } else {
      console.error(chalk.red(String(error)));
    }
    process.exit(1);
  }
}

runLint();
