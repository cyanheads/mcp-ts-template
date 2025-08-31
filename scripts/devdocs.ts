/**
 * @fileoverview Generates a comprehensive development documentation prompt for AI analysis.
 * This script combines a repository file tree with 'repomix' output for specified files,
 * wraps it in a detailed prompt, and copies the result to the clipboard.
 *
 * To run: npm run devdocs -- <file1> <file2> ...
 * Example: npm run devdocs -- src/
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// --- Constants ---

const PROMPT_TEMPLATE = `
You are a senior software architect. Your task is to analyze the provided codebase and generate a detailed plan for a developer to implement improvements.

**1. Comprehensive Analysis:**
- Thoroughly review the entire codebase provided below, file by file.
- Identify all existing features, functions, and utilities to build a complete understanding.
- Pinpoint any issues, such as bugs, gaps in logic, or inconsistencies.

**2. Proposed Enhancements:**
- Suggest potential enhancements, including architectural changes, refactoring opportunities, and performance optimizations.
- Recommend modern 2025, best-practice approaches, preferring the latest stable versions of libraries and frameworks.
- **Important:** Do not include suggestions for adding unit or integration tests, as this is handled separately.

**3. Detailed Implementation Plan:**
Based on your analysis, write out detailed instructions for a developer to implement the changes in our current code base. For each proposed change, specify the file path and include code snippets where necessary, focusing on a detailed and concise explanation of *why* the change is being made. The plan should be structured to be easily followed and implemented.
`.trim();

const FOCUS_PROMPT =
  "# I want to focus in on the following section of our code base. Map out the changes in detail. Remember to include all relevant files and their paths, use our existing code style (i.e. file headers, etc.), and adhere to architectural best practices while properly integrating the changes into our current code base.";

const REMINDER_FOOTER = `
---
**Reminder:**
Based on your analysis, write out detailed instructions for a developer to implement the changes in our current code base. For each proposed change, specify the file path and include code snippets where necessary, focusing on a detailed and concise explanation of *why* the change is being made. The plan should be structured to be easily followed and implemented.

Please remember:
- Adhere to our programming principles, especially the "Logic Throws, Handler Catches" rule.
- Ensure all new code has JSDoc comments and follows our structured logging standards.
- Remember to use our singleton services for tasks like storage, logging, error handling, request context, and external API calls.
- Before completing the task, run 'npm run format' to maintain code consistency.
`.trim();

// --- Utility Functions ---

const log = (message: string) => console.log(`[devdocs] ${message}`);

const findProjectRoot = (startPath: string): string => {
  let currentPath = startPath;
  while (currentPath !== path.parse(currentPath).root) {
    if (fs.existsSync(path.join(currentPath, "package.json"))) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }
  throw new Error("Could not find project root (package.json not found).");
};

const runCommand = (command: string, inheritStdio = true): string | void => {
  try {
    const options = {
      stdio: inheritStdio ? ("inherit" as const) : ("pipe" as const),
      encoding: "utf-8" as const,
    };
    const result = execSync(command, options);
    if (!inheritStdio) {
      return result?.toString().trim();
    }
  } catch (error) {
    console.error(`Error executing command: "${command}"`, error);
    throw error;
  }
};

const copyToClipboard = (filePath: string) => {
  log("Copying contents to clipboard...");
  let copyCommand: string;
  const platform = process.platform;

  if (platform === "darwin") {
    copyCommand = `pbcopy < "${filePath}"`;
  } else if (platform === "win32") {
    copyCommand = `clip < "${filePath}"`;
  } else {
    copyCommand = `xclip -selection clipboard < "${filePath}"`;
  }

  runCommand(copyCommand);
  log("devdocs.md content copied to clipboard.");
};

// --- Core Logic ---

const generateFileTree = (rootDir: string): string => {
  log("Generating file tree...");
  const treeScriptPath = path.resolve(rootDir, "scripts", "tree.ts");
  const treeDocPath = path.resolve(rootDir, "docs", "tree.md");
  runCommand(`npx tsx "${treeScriptPath}"`);
  log(`File tree generated at ${path.relative(rootDir, treeDocPath)}`);
  return fs.readFileSync(treeDocPath, "utf-8");
};

const getRepomixOutputs = (filePaths: string[]): string => {
  const allOutputs = filePaths
    .map((filePath) => {
      log(`Running repomix on ${filePath}...`);
      // Use '-o -' to pipe repomix output to stdout
      const output = runCommand(`npx repomix "${filePath}" -o -`, false);
      if (output) {
        log("Repomix analysis complete.");
        return output;
      }
      log(`Warning: Repomix produced no output for ${filePath}. Skipping.`);
      return null;
    })
    .filter(Boolean);

  return allOutputs.join("\n\n---\n\n");
};

const createDevDocsFile = (
  rootDir: string,
  treeContent: string,
  repomixContent: string,
): string => {
  log("Creating devdocs.md...");
  const devDocsPath = path.resolve(rootDir, "docs", "devdocs.md");
  const devdocsContent = [
    PROMPT_TEMPLATE,
    "# Full project repository tree",
    treeContent,
    "---",
    FOCUS_PROMPT,
    repomixContent,
    REMINDER_FOOTER,
  ].join("\n\n");

  fs.writeFileSync(devDocsPath, devdocsContent);
  log(`devdocs.md created at ${path.relative(rootDir, devDocsPath)}`);
  return devDocsPath;
};

// --- Main Execution ---

const main = () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const filePaths = process.argv.slice(2);
  if (filePaths.length === 0) {
    log("Error: Please provide at least one file path for repomix.");
    process.exit(1);
  }

  try {
    const rootDir = findProjectRoot(__dirname);
    log(`Project root found at: ${rootDir}`);

    const treeContent = generateFileTree(rootDir);
    const allRepomixOutputs = getRepomixOutputs(filePaths);

    if (!allRepomixOutputs) {
      log("Error: Repomix failed to generate output for all provided files.");
      process.exit(1);
    }

    const devDocsPath = createDevDocsFile(
      rootDir,
      treeContent,
      allRepomixOutputs,
    );
    copyToClipboard(devDocsPath);

    log("All tasks completed successfully.");
  } catch (error) {
    console.error("\nAn unexpected error occurred. Aborting.", error);
    process.exit(1);
  }
};

main();
