#!/usr/bin/env node

/**
 * @fileoverview Generates a visual tree representation of the project's directory structure.
 * @module scripts/tree
 *   Respects .gitignore patterns and common exclusions (e.g., node_modules).
 *   Saves the tree to a markdown file (default: docs/tree.md).
 *   Supports custom output path and depth limitation.
 *   Ensures all file operations are within the project root for security.
 *
 * @example
 * // Generate tree with default settings:
 * // npm run tree
 *
 * @example
 * // Specify custom output path and depth:
 * // ts-node --esm scripts/tree.ts ./documentation/structure.md --depth=3
 */

import fs from "fs/promises";
import ignore from "ignore"; // Import the 'ignore' library
import path from "path";

// Get the type of the instance returned by ignore()
type Ignore = ReturnType<typeof ignore>;

const projectRoot = process.cwd();
let outputPathArg = "docs/tree.md"; // Default output path
let maxDepthArg = Infinity;

const args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(`
Generate Tree - Project directory structure visualization tool

Usage:
  ts-node --esm scripts/tree.ts [output-path] [--depth=<number>] [--help]

Options:
  output-path      Custom file path for the tree output (relative to project root, default: docs/tree.md)
  --depth=<number> Maximum directory depth to display (default: unlimited)
  --help           Show this help message
`);
  process.exit(0);
}

args.forEach((arg) => {
  if (arg.startsWith("--depth=")) {
    const depthValue = parseInt(arg.split("=")[1], 10);
    if (!isNaN(depthValue) && depthValue >= 0) {
      maxDepthArg = depthValue;
    } else {
      console.warn(`Invalid depth value: "${arg}". Using unlimited depth.`);
    }
  } else if (!arg.startsWith("--")) {
    outputPathArg = arg;
  }
});

const DEFAULT_IGNORE_PATTERNS: string[] = [
  ".git",
  "node_modules",
  ".DS_Store",
  "dist",
  "build",
  "logs",
];

/**
 * Loads and parses patterns from the .gitignore file at the project root,
 * and combines them with default ignore patterns.
 * @returns A promise resolving to an Ignore instance from the 'ignore' library.
 */
async function loadIgnoreHandler(): Promise<Ignore> {
  const ig = ignore();
  ig.add(DEFAULT_IGNORE_PATTERNS); // Add default patterns first

  const gitignorePath = path.join(projectRoot, ".gitignore");
  try {
    // Security: Ensure we read only from within the project root
    if (!path.resolve(gitignorePath).startsWith(projectRoot + path.sep)) {
      console.warn(
        "Warning: Attempted to read .gitignore outside project root. Using default ignore patterns only.",
      );
      return ig;
    }
    const gitignoreContent = await fs.readFile(gitignorePath, "utf-8");
    ig.add(gitignoreContent); // Add patterns from .gitignore file
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      console.warn(
        "Info: No .gitignore file found at project root. Using default ignore patterns only.",
      );
    } else {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error reading .gitignore: ${errorMessage}`);
    }
  }
  return ig;
}

/**
 * Checks if a given path should be ignored.
 * @param entryPath - The absolute path to the file or directory entry.
 * @param ig - An Ignore instance from the 'ignore' library.
 * @returns True if the path should be ignored, false otherwise.
 */
function isIgnored(entryPath: string, ig: Ignore): boolean {
  const relativePath = path.relative(projectRoot, entryPath);
  // The 'ignore' library expects POSIX-style paths (with /) even on Windows
  const posixRelativePath = relativePath.split(path.sep).join(path.posix.sep);
  return ig.ignores(posixRelativePath);
}

/**
 * Recursively generates a string representation of the directory tree.
 * @param dir - The absolute path of the directory to traverse.
 * @param ig - An Ignore instance.
 * @param prefix - String prefix for formatting the tree lines.
 * @param currentDepth - Current depth of traversal.
 * @returns A promise resolving to the tree string.
 */
async function generateTree(
  dir: string,
  ig: Ignore,
  prefix = "",
  currentDepth = 0,
): Promise<string> {
  const resolvedDir = path.resolve(dir);
  if (
    !resolvedDir.startsWith(projectRoot + path.sep) &&
    resolvedDir !== projectRoot
  ) {
    console.warn(
      `Security: Skipping directory outside project root: ${resolvedDir}`,
    );
    return "";
  }

  if (currentDepth > maxDepthArg) {
    return "";
  }

  let entries;
  try {
    entries = await fs.readdir(resolvedDir, { withFileTypes: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error reading directory ${resolvedDir}: ${errorMessage}`);
    return "";
  }

  let output = "";
  const filteredEntries = entries
    .filter((entry) => !isIgnored(path.join(resolvedDir, entry.name), ig))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  for (let i = 0; i < filteredEntries.length; i++) {
    const entry = filteredEntries[i];
    const isLastEntry = i === filteredEntries.length - 1;
    const connector = isLastEntry ? "└── " : "├── ";
    const newPrefix = prefix + (isLastEntry ? "    " : "│   ");

    output += prefix + connector + entry.name + "\n";

    if (entry.isDirectory()) {
      output += await generateTree(
        path.join(resolvedDir, entry.name),
        ig,
        newPrefix,
        currentDepth + 1,
      );
    }
  }
  return output;
}

/**
 * Main function to orchestrate loading ignore patterns, generating the tree,
 * and writing it to the specified output file.
 */
const writeTreeToFile = async (): Promise<void> => {
  try {
    const projectName = path.basename(projectRoot);
    const ignoreHandler = await loadIgnoreHandler(); // Get the Ignore instance
    const resolvedOutputFile = path.resolve(projectRoot, outputPathArg);

    // Security Validation for Output Path
    if (!resolvedOutputFile.startsWith(projectRoot + path.sep)) {
      console.error(
        `Error: Output path "${outputPathArg}" resolves outside the project directory: ${resolvedOutputFile}. Aborting.`,
      );
      process.exit(1);
    }
    const resolvedOutputDir = path.dirname(resolvedOutputFile);
    if (
      !resolvedOutputDir.startsWith(projectRoot + path.sep) &&
      resolvedOutputDir !== projectRoot
    ) {
      console.error(
        `Error: Output directory "${resolvedOutputDir}" is outside the project directory. Aborting.`,
      );
      process.exit(1);
    }

    console.log(`Generating directory tree for project: ${projectName}`);
    console.log(`Output will be saved to: ${resolvedOutputFile}`);
    if (maxDepthArg !== Infinity) {
      console.log(`Maximum depth set to: ${maxDepthArg}`);
    }

    const newGeneratedTreeContent = await generateTree(
      projectRoot,
      ignoreHandler,
      "",
      0,
    ); // Pass the Ignore instance

    let existingRawTreeContent: string | null = null;
    try {
      const currentFileContent = await fs.readFile(resolvedOutputFile, "utf-8");

      // Escape projectName for use in regex
      const escapedProjectName = projectName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

      // Regex to find the tree block:
      // Matches ``` (optional language specifier) \n
      // then projectName \n
      // then captures the content (non-greedy)
      // until it finds \n``` at the end of a line in the code block
      const treeBlockRegex = new RegExp(
        `^\\s*\`\`\`(?:[^\\n]*)\\n${escapedProjectName}\\n([\\s\\S]*?)\\n\`\`\`\\s*$`,
        "m",
      );

      const match = currentFileContent.match(treeBlockRegex);
      if (match && typeof match[1] === "string") {
        existingRawTreeContent = match[1];
      }
    } catch (error: unknown) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code !== "ENOENT"
      ) {
        // ENOENT (file not found) is expected if the file hasn't been created yet.
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.warn(
          `Warning: Could not read existing output file ("${resolvedOutputFile}") for comparison: ${errorMessage}`,
        );
      }
      // If file doesn't exist or is unreadable, existingRawTreeContent remains null,
      // which will trigger a write operation.
    }

    // Normalize line endings for comparison (Git might change LF to CRLF on Windows)
    const normalize = (str: string | null) =>
      str?.replace(/\r\n/g, "\n") ?? null;

    if (
      normalize(existingRawTreeContent) === normalize(newGeneratedTreeContent)
    ) {
      console.log(
        `Directory structure is unchanged. Output file not updated: ${resolvedOutputFile}`,
      );
    } else {
      // Content has changed, or file is new/unreadable; proceed to write.
      // Ensure the output directory exists. fs.mkdir with recursive:true will create it if it doesn't exist,
      // and will not throw an error if it already exists.
      await fs.mkdir(resolvedOutputDir, { recursive: true });

      const timestamp = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");
      const fileHeader = `# ${projectName} - Directory Structure\n\nGenerated on: ${timestamp}\n`;
      const depthInfo =
        maxDepthArg !== Infinity
          ? `\n_Depth limited to ${maxDepthArg} levels_\n\n`
          : "\n";
      // Use the newly generated tree content for the output
      const treeBlock = `\`\`\`\n${projectName}\n${newGeneratedTreeContent}\`\`\`\n`;
      const fileFooter = `\n_Note: This tree excludes files and directories matched by .gitignore and default patterns._\n`;
      const finalContent = fileHeader + depthInfo + treeBlock + fileFooter;

      await fs.writeFile(resolvedOutputFile, finalContent);
      console.log(
        `Successfully generated and updated tree structure in: ${resolvedOutputFile}`,
      );
    }
  } catch (error) {
    console.error(
      `Error generating tree: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  }
};

writeTreeToFile();
