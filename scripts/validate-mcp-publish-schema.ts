/**
 * @fileoverview This script automates the process of preparing and publishing an MCP server
 * to the MCP Registry. It performs the following steps in order:
 *
 * 1.  **Sync Metadata**: Reads `package.json` to get the `version` and `mcpName`,
 *     then updates `server.json` with these values.
 * 2.  **Validate Schema**: Validates the updated `server.json` against the official
 *     MCP server schema from the static CDN.
 * 3.  **Auto-Commit**: Automatically commits the updated `server.json` with a
 *     conventional commit message.
 * 4.  **Authenticate**: Initiates `mcp-publisher login github` and automatically detects
 *     when the login is complete by polling the authentication status.
 * 5.  **Publish**: Runs `mcp-publisher publish` to upload the server package to the registry.
 *
 * The script is designed to be robust, exiting immediately with a non-zero exit code
 * if any step fails, preventing a partial or incorrect publish.
 *
 * ---
 *
 * It supports the following flags to control its behavior:
 * - `--sync-only`: Only syncs metadata from `package.json` to `server.json` and stops.
 * - `--validate-only`: Syncs metadata, validates `server.json`, and then stops.
 * - `--no-commit`: Skips the automatic git commit step.
 * - `--publish-only`: Skips local file changes/validation and proceeds directly to login and publish.
 * @module scripts/validate-mcp-publish-schema
 */

import { exec, execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import axios from 'axios';

// --- Constants ---
const PACKAGE_JSON_PATH = path.resolve(process.cwd(), 'package.json');
const SERVER_JSON_PATH = path.resolve(process.cwd(), 'server.json');
const MCP_SCHEMA_URL =
  'https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json';

// --- Helper Functions ---

/**
 * Executes a shell command synchronously and inherits stdio. Exits the process on failure.
 * @param command - The command to execute.
 * @param stepName - A descriptive name for the step for logging purposes.
 */
function runCommand(command: string, stepName: string) {
  console.log(`\n--- 🚀 Starting Step: ${stepName} ---`);
  console.log(`> ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`--- ✅ Finished Step: ${stepName} ---`);
  } catch (_error) {
    console.error(`\n--- ❌ Step Failed: ${stepName} ---`);
    console.error(`Command "${command}" failed. See output above for details.`);
    process.exit(1);
  }
}

/**
 * Executes a shell command quietly and returns a boolean indicating success.
 * @param command - The command to execute.
 * @returns A promise resolving to true if successful, false otherwise.
 */
function checkCommand(command: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(command, (error) => {
      resolve(!error);
    });
  });
}

/**
 * Updates `server.json` with metadata from `package.json`, including the top-level
 * version and all package versions. Returns the new version.
 * @returns The version string from package.json.
 */
async function syncMetadata(): Promise<string> {
  const stepName = 'Sync Metadata from package.json';
  console.log(`\n--- 🚀 Starting Step: ${stepName} ---`);
  try {
    const pkgContent = await fs.readFile(PACKAGE_JSON_PATH, 'utf-8');
    const serverContent = await fs.readFile(SERVER_JSON_PATH, 'utf-8');

    const pkg = JSON.parse(pkgContent);
    const server = JSON.parse(serverContent);

    const { version, mcpName } = pkg;
    if (!version || !mcpName) {
      throw new Error(
        '`version` and/or `mcpName` are missing from package.json.',
      );
    }

    server.version = version;
    server.mcpName = mcpName;

    // Also update the version for all packages within the server definition
    if (Array.isArray(server.packages)) {
      server.packages.forEach((pkg: { version?: string }) => {
        pkg.version = version;
      });
      console.log(
        `Updated version for ${server.packages.length} package(s) in server.json.`,
      );
    }

    await fs.writeFile(SERVER_JSON_PATH, JSON.stringify(server, null, 2));

    console.log(
      `Successfully updated server.json to version "${version}" and mcpName "${mcpName}".`,
    );
    console.log(`--- ✅ Finished Step: ${stepName} ---`);
    return version;
  } catch (error) {
    console.error(`\n--- ❌ Step Failed: ${stepName} ---`);
    console.error('Could not sync metadata:', error);
    process.exit(1);
  }
}

/**
 * Commits the updated server.json with a conventional commit message.
 * @param version - The new version number to include in the commit message.
 */
function autoCommitChanges(version: string) {
  const stepName = 'Auto-commit server.json';
  console.log(`\n--- 🚀 Starting Step: ${stepName} ---`);
  try {
    console.log('> git add server.json');
    execSync('git add server.json');

    const commitMessage = `chore(release): bump server.json to v${version}`;
    const commitCommand = `git commit --no-verify -m "${commitMessage}"`;
    console.log(`> ${commitCommand}`);
    execSync(commitCommand);

    console.log('Successfully committed version bump for server.json.');
    console.log(`--- ✅ Finished Step: ${stepName} ---`);
  } catch (_error) {
    console.warn(`\n--- ⚠️ Step Skipped: ${stepName} ---`);
    console.warn(
      'Failed to auto-commit server.json. Please commit the changes manually.',
    );
  }
}

/**
 * Validates `server.json` against the official MCP schema.
 */
async function validateServerJson() {
  const stepName = 'Validate server.json Schema';
  console.log(`\n--- 🚀 Starting Step: ${stepName} ---`);
  try {
    console.log(`Fetching schema from ${MCP_SCHEMA_URL}...`);
    const { data: schema } = await axios.get(MCP_SCHEMA_URL);

    console.log('Reading updated server.json...');
    const serverJson = JSON.parse(await fs.readFile(SERVER_JSON_PATH, 'utf-8'));

    const ajv = new Ajv({ strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const valid = validate(serverJson);

    if (valid) {
      console.log('Validation successful!');
      console.log(`--- ✅ Finished Step: ${stepName} ---`);
    } else {
      console.error('Validation failed. See errors below:');
      console.error(validate.errors);
      throw new Error('server.json does not conform to the MCP schema.');
    }
  } catch (error) {
    console.error(`\n--- ❌ Step Failed: ${stepName} ---`);
    console.error('An error occurred during validation:', error);
    process.exit(1);
  }
}

/**
 * Prompts for GitHub login and polls until authentication is successful.
 */
async function waitForLogin(timeout = 120000, pollInterval = 5000) {
  const stepName = 'Authenticate with GitHub';
  console.log(`\n--- 🚀 Starting Step: ${stepName} ---`);

  // Initiate login
  runCommand('mcp-publisher login github', 'Initiate GitHub Login');

  console.log(
    '\n🚨 ACTION REQUIRED: Please complete the GitHub login in your browser.',
  );
  process.stdout.write('Waiting for authentication to complete...');

  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const loggedIn = await checkCommand('mcp-publisher whoami');
    if (loggedIn) {
      process.stdout.write(' ✅\n');
      console.log('Authentication successful!');
      console.log(`--- ✅ Finished Step: ${stepName} ---`);
      return;
    }
    process.stdout.write('.');
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  process.stdout.write(' ❌\n');
  console.error(`\n--- ❌ Step Failed: ${stepName} ---`);
  console.error('Login polling timed out after 2 minutes.');
  process.exit(1);
}

/**
 * Main execution function that orchestrates the publishing workflow.
 */
async function main() {
  const args = process.argv.slice(2);
  const syncOnly = args.includes('--sync-only');
  const validateOnly = args.includes('--validate-only');
  const noCommit = args.includes('--no-commit');
  const publishOnly = args.includes('--publish-only');

  console.log('🚀 Starting MCP Server Publish Workflow...');

  if (publishOnly) {
    console.log('\n⚪ --publish-only flag detected. Skipping local file changes.');
    await waitForLogin();
    runCommand('mcp-publisher publish', 'Publish to MCP Registry');
    console.log('\n🎉🎉🎉 Publish Complete! 🎉🎉🎉');
    return;
  }

  const newVersion = await syncMetadata();

  if (syncOnly) {
    console.log('\n✅ --sync-only flag detected. Halting after metadata sync.');
    return;
  }

  await validateServerJson();

  if (validateOnly) {
    console.log('\n✅ --validate-only flag detected. Halting after validation.');
    return;
  }

  if (!noCommit) {
    autoCommitChanges(newVersion);
  } else {
    console.log('\n⚪ --no-commit flag detected. Skipping auto-commit.');
  }

  await waitForLogin();

  runCommand('mcp-publisher publish', 'Publish to MCP Registry');

  console.log(
    '\n🎉🎉🎉 Workflow Complete! Your server has been successfully published. 🎉🎉🎉',
  );
}

// --- Execute ---
main();
