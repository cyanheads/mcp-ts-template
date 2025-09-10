/**
 * @fileoverview Generates a comprehensive development documentation prompt for AI analysis.
 * This script combines a repository file tree with 'repomix' output for specified files,
 * wraps it in a detailed prompt, and copies the result to the clipboard.
 *
 * To run: bun run devdocs -- <file1> <file2> ...
 * Example: bun run devdocs -- src/
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
import minimist from 'minimist';
import * as path from 'path';
import { fileURLToPath } from 'url';

// --- Constants ---

const PROMPT_TEMPLATE = `
You are a senior software architect. Your task is to analyze the provided codebase and generate a detailed plan for my developer to implement improvements.

Review this code base file by file, line by line, to fully understand our code base; you must identify all features, functions, utilities, and understand how they work with each other within the code base.

Identify any issues, gaps, inconsistencies, etc.
Additionally identify potential enhancements, including architectural changes, refactoring, etc.

Identify the modern 2025, best-practice approaches for what we're trying to accomplish; preferring the latest stable versions of libraries and frameworks.

Skip adding unit/integration tests - that is handled externally.

After you have properly reviewed the code base and mapped out the necessary changes, write out a detailed implementation plan to be shared with my developer on exactly what to change in our current code base to implement these improvements, new features, and optimizations.
`.trim();

const FOCUS_PROMPT =
  '# I want to focus in on the following section of our code base. Map out the changes in detail. Remember to include all relevant files and their paths, use our existing code style (i.e. file headers, etc.), and adhere to architectural best practices while properly integrating the changes into our current code base.';

const REMINDER_FOOTER = `
---
**Reminder:**
Based on your analysis, write out detailed instructions for a developer to implement the changes in our current code base. For each proposed change, specify the file path and include code snippets when necessary, focusing on a detailed and concise explanation of *why* the change is being made. The plan should be structured to be easily followed and implemented.

Please remember:
- Adhere to our programming principles found within the existing code reviewed above.
- Ensure all new code has JSDoc comments and follows our structured logging standards.
- Remember to use any included services for internal services like logging, error handling, request context, and external API calls.
- Before completing the task, run 'bun devcheck' (lint, type check, etc.) to maintain code consistency.
`.trim();

// --- Utility Functions ---

const log = (message: string) => console.log(`[devdocs] ${message}`);

const findProjectRoot = (startPath: string): string => {
  let currentPath = startPath;
  while (currentPath !== path.parse(currentPath).root) {
    if (fs.existsSync(path.join(currentPath, 'package.json'))) {
      return currentPath;
    }
    currentPath = path.dirname(currentPath);
  }
  throw new Error('Could not find project root (package.json not found).');
};

const runCommand = (command: string, inheritStdio = true): string | void => {
  try {
    const options = {
      stdio: inheritStdio ? ('inherit' as const) : ('pipe' as const),
      encoding: 'utf-8' as const,
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
  log('Copying contents to clipboard...');
  let copyCommand: string;
  const platform = process.platform;

  if (platform === 'darwin') {
    copyCommand = `pbcopy < "${filePath}"`;
  } else if (platform === 'win32') {
    copyCommand = `clip < "${filePath}"`;
  } else {
    copyCommand = `xclip -selection clipboard < "${filePath}"`;
  }

  runCommand(copyCommand);
  log('devdocs.md content copied to clipboard.');
};

// --- Core Logic ---

const generateFileTree = (rootDir: string): string => {
  log('Generating file tree...');
  const treeScriptPath = path.resolve(rootDir, 'scripts', 'tree.ts');
  const treeDocPath = path.resolve(rootDir, 'docs', 'tree.md');
  runCommand(`bunx tsx "${treeScriptPath}"`);
  log(`File tree generated at ${path.relative(rootDir, treeDocPath)}`);
  return fs.readFileSync(treeDocPath, 'utf-8');
};

const getRepomixOutputs = (filePaths: string[]): string => {
  const allOutputs = filePaths
    .map((filePath) => {
      if (!fs.existsSync(filePath)) {
        log(
          `Error: File or directory not found: "${filePath}". It may be a mistyped flag. Please use '--' for flags (e.g., --include-rules). Skipping.`,
        );
        return null;
      }
      log(`Running repomix on ${filePath}...`);
      // Use '-o -' to pipe repomix output to stdout
      const output = runCommand(`bunx repomix "${filePath}" -o -`, false);
      if (output) {
        log('Repomix analysis complete.');
        return output;
      }
      log(`Warning: Repomix produced no output for ${filePath}. Skipping.`);
      return null;
    })
    .filter(Boolean);

  return allOutputs.join('\n\n---\n\n');
};

const findFileCaseInsensitive = (
  dir: string,
  fileNames: string[],
): string | null => {
  const files = fs.readdirSync(dir);
  const lowerCaseFileNames = fileNames.map((f) => f.toLowerCase());
  for (const file of files) {
    if (lowerCaseFileNames.includes(file.toLowerCase())) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isFile()) {
        return fullPath;
      }
    }
  }
  return null;
};

const getAgentRulesContent = (rootDir: string): string | null => {
  log('Searching for clinerules.md or agents.md...');
  const ruleFilePath = findFileCaseInsensitive(rootDir, [
    'clinerules.md',
    'agents.md',
  ]);
  if (ruleFilePath) {
    log(`Found agent rules file: ${ruleFilePath}`);
    return fs.readFileSync(ruleFilePath, 'utf-8');
  }
  log('No agent rules file found.');
  return null;
};

const createDevDocsFile = (
  rootDir: string,
  treeContent: string,
  repomixContent: string,
  agentRulesContent: string | null,
): string => {
  log('Creating devdocs.md...');
  const devDocsPath = path.resolve(rootDir, 'docs', 'devdocs.md');
  const contentParts = [
    PROMPT_TEMPLATE,
    '# Full project repository tree',
    treeContent,
    '---',
  ];

  if (agentRulesContent) {
    contentParts.push('# Agent Rules', agentRulesContent, '---');
  }

  contentParts.push(FOCUS_PROMPT, repomixContent, REMINDER_FOOTER);

  const devdocsContent = contentParts.join('\n\n');

  fs.writeFileSync(devDocsPath, devdocsContent);
  log(`devdocs.md created at ${path.relative(rootDir, devDocsPath)}`);
  return devDocsPath;
};

// --- Main Execution ---

const main = () => {
  const args = minimist(process.argv.slice(2), {
    boolean: ['include-rules'],
  });
  const filePaths = args._;
  const includeRules = args['include-rules'];

  if (filePaths.length === 0) {
    log('Error: Please provide at least one file path for repomix.');
    log('Usage: bun devdocs [--include-rules] <file1> [<file2> ...]');
    process.exit(1);
  }

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const rootDir = findProjectRoot(__dirname);
    log(`Project root found at: ${rootDir}`);

    let agentRulesContent: string | null = null;
    if (includeRules) {
      agentRulesContent = getAgentRulesContent(rootDir);
    }

    const treeContent = generateFileTree(rootDir);
    const allRepomixOutputs = getRepomixOutputs(filePaths);

    if (!allRepomixOutputs) {
      log('Error: Repomix failed to generate output for all provided files.');
      process.exit(1);
    }

    const devDocsPath = createDevDocsFile(
      rootDir,
      treeContent,
      allRepomixOutputs,
      agentRulesContent,
    );
    copyToClipboard(devDocsPath);

    log('All tasks completed successfully.');
  } catch (error) {
    console.error('\nAn unexpected error occurred. Aborting.', error);
    process.exit(1);
  }
};

main();
