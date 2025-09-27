// path: scripts/devdocs.ts
/**
 * @fileoverview Generates a comprehensive development documentation prompt for AI analysis.
 * This script combines a repository file tree with 'repomix' output for specified files,
 * wraps it in a detailed prompt, and copies the result to the clipboard.
 *
 * To run: npm run devdocs -- [--include-rules] <file1> <file2> ...
 * Example: npm run devdocs -- src/
 */
import clipboardy from 'clipboardy';
import { execa } from 'execa';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// --- Configuration & Types ---

const CONFIG = {
  DOCS_DIR: 'docs',
  TREE_SCRIPT: path.join('scripts', 'tree.ts'),
  TREE_OUTPUT: 'tree.md',
  DEVDOCS_OUTPUT: 'devdocs.md',
  AGENT_RULE_FILES: ['clinerules.md', 'agents.md'],
  COMMAND_TIMEOUT_MS: 120000, // 2 minutes for external commands
  MAX_BUFFER_SIZE: 1024 * 1024 * 20, // 20 MB buffer for large outputs
} as const;

interface CliArgs {
  values: {
    'include-rules': boolean;
    help: boolean;
  };
  positionals: string[];
}

class DevDocsError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = 'DevDocsError';
  }
}

// --- Constants (Templates) ---

const PROMPT_TEMPLATE = `
You are a senior software architect. Your task is to analyze the provided codebase and generate a detailed plan for my developer to implement improvements.

Review this code base file by file, line by line, to fully understand our code base; you must identify all features, functions, utilities, and understand how they work with each other within the code base.

When formulating your plan, pay special attention to our core architectural principles:
- **Pragmatic SOLID**: Ensure changes group code that changes together, prefer composition, and keep interfaces focused.
- **Dependency Inversion**: All proposals must depend on abstractions, not concrete implementations. Identify and refactor any direct dependencies on concrete classes.
- **"The Logic Throws, The Handler Catches"**: Business logic should be pure and stateless, throwing typed errors on failure. Framework-level handlers are responsible for \`try-catch\` blocks.

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

const USAGE_INFO =
  'Usage: npm run devdocs -- [--include-rules] [-h|--help] <file1> [<file2> ...]';

// --- Utility Functions ---

/**
 * Structured JSON Logger for observability.
 */
const logger = {
  info: (message: string, data?: Record<string, unknown>) =>
    console.log(
      JSON.stringify({ level: 'info', message, ...data, source: 'devdocs' }),
    ),
  error: (message: string, error?: Error, data?: Record<string, unknown>) =>
    console.error(
      JSON.stringify({
        level: 'error',
        message,
        error_message: error?.message,
        // Include stack trace for unexpected errors
        error_stack: error?.stack,
        ...data,
        source: 'devdocs',
      }),
    ),
  warn: (message: string, data?: Record<string, unknown>) =>
    console.warn(
      JSON.stringify({ level: 'warn', message, ...data, source: 'devdocs' }),
    ),
};

/**
 * Traverses up the directory tree (asynchronously) to find the project root.
 * @param startPath The path to start searching from.
 * @returns The absolute path to the project root.
 */
const findProjectRoot = async (startPath: string): Promise<string> => {
  let currentPath = path.resolve(startPath);
  while (currentPath !== path.parse(currentPath).root) {
    const packageJsonPath = path.join(currentPath, 'package.json');
    try {
      await fs.access(packageJsonPath);
      return currentPath;
    } catch {
      // package.json not found, continue traversing up
    }
    currentPath = path.dirname(currentPath);
  }
  throw new DevDocsError(
    'Could not find project root (package.json not found).',
  );
};

/**
 * Executes a command using execa, handling potential errors.
 * @param command The command to run (e.g., 'npx').
 * @param args Arguments for the command.
 * @param captureOutput Whether to capture stdout (true) or inherit stdio (false).
 * @returns The trimmed stdout if captureOutput is true, otherwise void.
 */
const executeCommand = async (
  command: string,
  args: string[],
  captureOutput: boolean,
): Promise<string | void> => {
  try {
    // execa handles cross-platform execution (like npx on Windows) reliably.
    const stdio = captureOutput ? 'pipe' : 'inherit';
    const result = await execa(command, args, {
      stdio,
      timeout: CONFIG.COMMAND_TIMEOUT_MS,
      maxBuffer: CONFIG.MAX_BUFFER_SIZE,
    });

    if (captureOutput) {
      return (result.stdout ?? '').trim();
    }
  } catch (error) {
    const message = `Error executing command: "${command} ${args.join(' ')}"`;
    // execa provides detailed error information (stderr, exit code) if the command fails.
    throw new DevDocsError(message, error);
  }
};

/**
 * Checks if a file or directory exists (asynchronously).
 */
const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// --- Core Logic (Business Logic - Throws on Error) ---

/**
 * Runs the external tree script and reads its output.
 */
const generateFileTree = async (rootDir: string): Promise<string> => {
  logger.info('Generating file tree...');
  const treeScriptPath = path.resolve(rootDir, CONFIG.TREE_SCRIPT);
  const treeDocPath = path.resolve(
    rootDir,
    CONFIG.DOCS_DIR,
    CONFIG.TREE_OUTPUT,
  );

  if (!(await exists(treeScriptPath))) {
    throw new DevDocsError(
      `Tree generation script not found at: ${treeScriptPath}`,
    );
  }

  // Execute the script, inheriting stdio so its own logs are visible.
  await executeCommand('npx', ['tsx', treeScriptPath], false);

  logger.info(`File tree generated at ${path.relative(rootDir, treeDocPath)}`);

  try {
    return await fs.readFile(treeDocPath, 'utf-8');
  } catch (error) {
    throw new DevDocsError(
      `Failed to read generated tree file at ${treeDocPath}. Ensure the script creates it.`,
      error,
    );
  }
};

/**
 * Runs repomix on the specified file paths concurrently and concatenates the output.
 * @param filePaths An array of file or directory paths to analyze.
 * @param ignoredDeps A list of dependency names to ignore during analysis.
 */
const getRepomixOutputs = async (
  filePaths: string[],
  ignoredDeps: string[],
): Promise<string> => {
  // Run tasks in parallel
  const tasks = filePaths.map(async (filePath) => {
    // Check existence relative to CWD (where the script was invoked)
    if (!(await exists(filePath))) {
      logger.warn(`File or directory not found: "${filePath}". Skipping.`, {
        filePath,
      });
      return null;
    }

    logger.info(`Running repomix...`, { filePath });
    try {
      const repomixArgs = ['repomix', filePath, '-o', '-'];
      if (ignoredDeps.length > 0) {
        // According to repomix docs, --ignore accepts a comma-separated list
        repomixArgs.push('--ignore', ignoredDeps.join(','));
        logger.info(`Repomix will ignore: ${ignoredDeps.join(', ')}`, {
          filePath,
        });
      }

      // Use '-o -' to pipe repomix output to stdout and capture it.
      const output = await executeCommand('npx', repomixArgs, true);

      if (output && output.length > 0) {
        logger.info('Repomix analysis complete.', { filePath });
        return output;
      }

      logger.warn(`Repomix produced no output for ${filePath}. Skipping.`, {
        filePath,
      });
      return null;
    } catch (error) {
      // Log the error but allow other tasks to continue (resilience)
      logger.error(
        `Repomix failed for ${filePath}. Skipping.`,
        error instanceof Error ? error : undefined,
        { filePath },
      );
      return null;
    }
  });

  const allOutputs = await Promise.all(tasks);
  const successfulOutputs = allOutputs.filter(Boolean) as string[];

  if (successfulOutputs.length === 0) {
    // Fail fast if no output was generated at all
    throw new DevDocsError(
      'Repomix failed to generate output for all provided files.',
    );
  }

  if (successfulOutputs.length < filePaths.length) {
    logger.warn(
      'Partial results generated; some files failed or were skipped.',
    );
  }

  return successfulOutputs.join('\n\n---\n\n');
};

/**
 * Reads package.json and extracts dependency names from the 'resolutions' field.
 * @param rootDir The project root directory containing package.json.
 * @returns An array of dependency names to be ignored.
 */
const getIgnoredDependencies = async (rootDir: string): Promise<string[]> => {
  const packageJsonPath = path.join(rootDir, 'package.json');
  try {
    const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageJsonContent);

    if (
      packageJson &&
      typeof packageJson === 'object' &&
      'resolutions' in packageJson &&
      typeof packageJson.resolutions === 'object' &&
      packageJson.resolutions !== null
    ) {
      const resolutions = Object.keys(packageJson.resolutions);
      logger.info(`Found ${resolutions.length} dependencies in resolutions.`, {
        dependencies: resolutions,
      });
      return resolutions;
    }
  } catch (error) {
    // This is not a fatal error; the script can proceed without ignoring dependencies.
    logger.warn('Could not read or parse package.json for resolutions.', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  return [];
};

/**
 * Finds a file in a directory matching one of the names (case-insensitive, async).
 */
const findFileCaseInsensitive = async (
  dir: string,
  fileNames: readonly string[],
): Promise<string | null> => {
  try {
    const files = await fs.readdir(dir);
    const lowerCaseFileNames = new Set(fileNames.map((f) => f.toLowerCase()));

    for (const file of files) {
      if (lowerCaseFileNames.has(file.toLowerCase())) {
        const fullPath = path.join(dir, file);
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          return fullPath;
        }
      }
    }
  } catch (error) {
    // Handle directory read errors (e.g., permissions)
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn(
        `Could not read directory while searching for rules files: ${dir}`,
        { error: (error as Error).message },
      );
    }
  }
  return null;
};

/**
 * Locates and reads the content of the agent rules file.
 */
const getAgentRulesContent = async (
  rootDir: string,
): Promise<string | null> => {
  logger.info(
    `Searching for agent rules files: ${CONFIG.AGENT_RULE_FILES.join(', ')}...`,
  );
  const ruleFilePath = await findFileCaseInsensitive(
    rootDir,
    CONFIG.AGENT_RULE_FILES,
  );

  if (ruleFilePath) {
    logger.info(`Found agent rules file: ${ruleFilePath}`);
    try {
      return await fs.readFile(ruleFilePath, 'utf-8');
    } catch (error) {
      throw new DevDocsError(
        `Failed to read agent rules file: ${ruleFilePath}`,
        error,
      );
    }
  }

  logger.info('No agent rules file found.');
  return null;
};

/**
 * Combines all parts into the final devdocs content and writes it to disk.
 */
const createDevDocsFile = async (
  rootDir: string,
  treeContent: string,
  repomixContent: string,
  agentRulesContent: string | null,
): Promise<string> => {
  logger.info(`Creating ${CONFIG.DEVDOCS_OUTPUT}...`);
  const devDocsPath = path.resolve(
    rootDir,
    CONFIG.DOCS_DIR,
    CONFIG.DEVDOCS_OUTPUT,
  );
  const contentParts = [
    PROMPT_TEMPLATE,
    '# Full project repository tree',
    treeContent.trim(),
    '---',
  ];

  if (agentRulesContent) {
    contentParts.push('# Agent Rules', agentRulesContent.trim(), '---');
  }

  contentParts.push(FOCUS_PROMPT, repomixContent.trim(), REMINDER_FOOTER);

  const devdocsContent = contentParts.join('\n\n');

  try {
    // Ensure the docs directory exists
    await fs.mkdir(path.dirname(devDocsPath), { recursive: true });
    await fs.writeFile(devDocsPath, devdocsContent);

    logger.info(
      `${CONFIG.DEVDOCS_OUTPUT} created at ${path.relative(
        rootDir,
        devDocsPath,
      )}`,
    );
    return devdocsContent;
  } catch (error) {
    throw new DevDocsError(
      `Failed to write ${CONFIG.DEVDOCS_OUTPUT} to ${devDocsPath}`,
      error,
    );
  }
};

/**
 * Copies the generated content to the system clipboard.
 * This is a best-effort operation.
 */
const copyToClipboard = async (content: string): Promise<void> => {
  logger.info('Attempting to copy contents to clipboard...');
  try {
    await clipboardy.write(content);
    logger.info('Content copied to clipboard successfully.');
  } catch (error) {
    // If clipboard access fails (e.g., headless environment, missing utilities like xclip/wl-clipboard on Linux),
    // log a warning but do not fail the script.
    logger.warn(
      'Failed to copy content to clipboard. The file was generated successfully.',
      { error: error instanceof Error ? error.message : String(error) },
    );
  }
};

// --- Main Execution (The Handler - Catches Errors) ---

const parseCliArguments = (): CliArgs => {
  try {
    const { values, positionals } = parseArgs({
      options: {
        'include-rules': {
          type: 'boolean',
          default: false,
        },
        help: {
          type: 'boolean',
          short: 'h',
          default: false,
        },
      },
      allowPositionals: true,
      // Use strict: false to allow unknown arguments to potentially be treated as file paths,
      // mirroring the flexibility of the original script. Existence is validated later.
      strict: false,
    });

    return {
      // Type assertions are safe as defaults are provided
      values: {
        'include-rules': values['include-rules'] as boolean,
        help: values.help as boolean,
      },
      positionals,
    };
  } catch (error) {
    // This should ideally only happen if the configuration itself is invalid
    throw new DevDocsError('Failed to configure argument parser.', error);
  }
};

const main = async () => {
  const startTime = Date.now();
  const args = parseCliArguments();

  if (args.values.help) {
    console.log(USAGE_INFO);
    process.exit(0);
  }

  const filePaths = args.positionals;
  const includeRules = args.values['include-rules'];

  if (filePaths.length === 0) {
    logger.error('Error: Please provide at least one file path for repomix.');
    console.log(USAGE_INFO);
    process.exit(1);
  }

  // Determine the directory of the current script to start searching for the project root
  const scriptPath = fileURLToPath(import.meta.url);
  const scriptDir = path.dirname(scriptPath);
  const rootDir = await findProjectRoot(scriptDir);
  logger.info(`Project root found at: ${rootDir}`);

  const ignoredDeps = await getIgnoredDependencies(rootDir);

  // Run all independent data gathering tasks concurrently (Maximized Parallelism)
  const [treeContent, agentRulesContent, allRepomixOutputs] = await Promise.all(
    [
      generateFileTree(rootDir),
      includeRules ? getAgentRulesContent(rootDir) : Promise.resolve(null),
      getRepomixOutputs(filePaths, ignoredDeps),
    ],
  );

  // Combine and Write File
  const content = await createDevDocsFile(
    rootDir,
    treeContent,
    allRepomixOutputs,
    agentRulesContent,
  );

  // Copy to Clipboard (Best Effort)
  await copyToClipboard(content);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  logger.info(`All tasks completed successfully in ${duration}s.`);
};

// Top-level error handling
main().catch((error) => {
  console.error('\n[FATAL] Aborting devdocs script due to critical error.');
  if (error instanceof DevDocsError) {
    // Log the operational error and its cause if available
    logger.error(
      error.message,
      error.cause instanceof Error ? error.cause : undefined,
    );
  } else if (error instanceof Error) {
    // Log unexpected internal errors
    logger.error('Internal Script Error', error);
  } else {
    // Handle non-Error throws
    logger.error('An unknown error occurred', undefined, {
      error: String(error),
    });
  }
  process.exit(1);
});
