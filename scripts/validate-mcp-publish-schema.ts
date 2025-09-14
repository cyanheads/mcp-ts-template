/**
 * @fileoverview This script automates the process of preparing and publishing an MCP server
 * to the MCP Registry. It performs the following steps in order:
 *
 * 1.  **Sync Metadata**: Reads `package.json` to get the `version` and `mcpName`,
 *     then updates `server.json` with these values.
 * 2.  **Validate Schema**: Validates the updated `server.json` against the official
 *     MCP server schema from the static CDN.
 * 3.  **Auto-Commit**: Automatically commits the updated `server.json` with a
 *     conventional commit message, only if there are changes.
 * 4.  **Authenticate**: Initiates `mcp-publisher login github` and waits for the user
 *     to complete the browser-based authentication.
 * 5.  **Publish**: Runs `mcp-publisher publish` to upload the server package to the registry.
 *
 * It supports flags like `--validate-only` and `--no-commit` for flexible control.
 * @module scripts/validate-mcp-publish-schema
 */

import { execSync } from 'child_process';
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

function runCommand(command: string, stepName: string) {
  console.log(`\n--- 🚀 Starting Step: ${stepName} ---`);
  console.log(`> ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`--- ✅ Finished Step: ${stepName} ---`);
  } catch (_error) {
    console.error(`\n--- ❌ Step Failed: ${stepName} ---`);
    console.error(`Command "${command}" failed.`);
    process.exit(1);
  }
}

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
    if (Array.isArray(server.packages)) {
      server.packages.forEach((p: { version?: string }) => {
        p.version = version;
      });
      console.log(`Updated version for ${server.packages.length} package(s).`);
    }

    await fs.writeFile(SERVER_JSON_PATH, JSON.stringify(server, null, 2));
    console.log(`Synced server.json to version "${version}".`);
    console.log(`--- ✅ Finished Step: ${stepName} ---`);
    return version;
  } catch (error) {
    console.error(`\n--- ❌ Step Failed: ${stepName} ---`, error);
    process.exit(1);
  }
}

function autoCommitChanges(version: string) {
  const stepName = 'Auto-commit server.json';
  console.log(`\n--- 🚀 Starting Step: ${stepName} ---`);
  try {
    const status = execSync('git status --porcelain server.json')
      .toString()
      .trim();
    if (!status) {
      console.log('No changes to commit in server.json. Skipping.');
      console.log(`--- ✅ Finished Step: ${stepName} (No-op) ---`);
      return;
    }

    execSync('git add server.json');
    const commitMessage = `chore(release): bump server.json to v${version}`;
    const commitCommand = `git commit --no-verify -m "${commitMessage}"`;
    console.log(`> ${commitCommand}`);
    execSync(commitCommand);
    console.log('Successfully committed version bump for server.json.');
    console.log(`--- ✅ Finished Step: ${stepName} ---`);
  } catch (_error) {
    console.warn(`\n--- ⚠️ Step Skipped: ${stepName} ---`);
    console.warn('Failed to auto-commit. Please commit changes manually.');
  }
}

async function validateServerJson() {
  const stepName = 'Validate server.json Schema';
  console.log(`\n--- 🚀 Starting Step: ${stepName} ---`);
  try {
    const { data: schema } = await axios.get(MCP_SCHEMA_URL);
    const serverJson = JSON.parse(await fs.readFile(SERVER_JSON_PATH, 'utf-8'));
    const ajv = new Ajv({ strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    if (!validate(serverJson)) {
      console.error('Validation failed:', validate.errors);
      throw new Error('server.json does not conform to the MCP schema.');
    }
    console.log('Validation successful!');
    console.log(`--- ✅ Finished Step: ${stepName} ---`);
  } catch (error) {
    console.error(`\n--- ❌ Step Failed: ${stepName} ---`, error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const syncOnly = args.includes('--sync-only');
  const validateOnly = args.includes('--validate-only');
  const noCommit = args.includes('--no-commit');
  const publishOnly = args.includes('--publish-only');

  console.log('🚀 Starting MCP Server Publish Workflow...');

  if (publishOnly) {
    console.log(
      '\n⚪ --publish-only flag detected. Skipping local file changes.',
    );
    runCommand('mcp-publisher login github', 'Authenticate with GitHub');
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
    console.log(
      '\n✅ --validate-only flag detected. Halting after validation.',
    );
    return;
  }

  if (!noCommit) {
    autoCommitChanges(newVersion);
  } else {
    console.log('\n⚪ --no-commit flag detected. Skipping auto-commit.');
  }

  runCommand('mcp-publisher login github', 'Authenticate with GitHub');
  runCommand('mcp-publisher publish', 'Publish to MCP Registry');

  console.log(
    '\n🎉🎉🎉 Workflow Complete! Your server has been successfully published. 🎉🎉🎉',
  );
}

// --- Execute ---
main();
