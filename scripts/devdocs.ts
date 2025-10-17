/**
 * @fileoverview Generates a comprehensive development documentation prompt for AI analysis.
 * This script combines a repository file tree with 'repomix' output for specified files,
 * wraps it in a detailed prompt, and copies the result to the clipboard.
 * @module scripts/devdocs
 * @description
 *   Analyzes your codebase and generates AI-ready documentation prompts.
 *   Supports git integration, exclude patterns, dry-run mode, and detailed statistics.
 *
 * @example
 * // Run all checks with statistics:
 * // npm run devdocs -- --stats src/
 *
 * // Analyze only changed files:
 * // npm run devdocs -- --git-diff --include-rules
 *
 * // Preview without generating:
 * // npm run devdocs -- --dry-run src/
 *
 * // Exclude test files:
 * // npm run devdocs -- --exclude "*.test.ts" --exclude "*.spec.ts" src/
 */
import clipboardy from 'clipboardy';
import { execa } from 'execa';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// =============================================================================
// Embedded Dependencies
// =============================================================================

// picocolors (https://github.com/alexeyraspopov/picocolors) - MIT License
// Embedded so the script runs without needing 'npm/bun install'.
const isColorSupported = process.stdout.isTTY && process.env.TERM !== 'dumb';

const createColor =
  (open: string, close: string, re: RegExp, reset: string) =>
  (str: string | number) =>
    isColorSupported
      ? open + ('' + str).replace(re, open + reset + open) + close
      : '' + str;

const c = {
  bold: (s: string | number) =>
    createColor('\x1b[1m', '\x1b[22m', /\\x1b\[22m/g, '\x1b[1m')(s),
  dim: (s: string | number) =>
    createColor('\x1b[2m', '\x1b[22m', /\\x1b\[22m/g, '\x1b[2m')(s),
  red: (s: string | number) =>
    createColor('\x1b[31m', '\x1b[39m', /\\x1b\[39m/g, '\x1b[31m')(s),
  green: (s: string | number) =>
    createColor('\x1b[32m', '\x1b[39m', /\\x1b\[39m/g, '\x1b[32m')(s),
  yellow: (s: string | number) =>
    createColor('\x1b[33m', '\x1b[39m', /\\x1b\[39m/g, '\x1b[33m')(s),
  blue: (s: string | number) =>
    createColor('\x1b[34m', '\x1b[39m', /\\x1b\[39m/g, '\x1b[34m')(s),
  magenta: (s: string | number) =>
    createColor('\x1b[35m', '\x1b[39m', /\\x1b\[39m/g, '\x1b[35m')(s),
  cyan: (s: string | number) =>
    createColor('\x1b[36m', '\x1b[39m', /\\x1b\[39m/g, '\x1b[36m')(s),
};

// =============================================================================
// Types & Interfaces
// =============================================================================

interface CliArgs {
  values: {
    'include-rules': boolean;
    'dry-run': boolean;
    stats: boolean;
    'git-diff': boolean;
    'git-staged': boolean;
    validate: boolean;
    exclude: string[];
    config: string | undefined;
    help: boolean;
  };
  positionals: string[];
}

interface DevDocsConfig {
  excludePatterns?: string[];
  includePaths?: string[];
  includeRules?: boolean;
  ignoredDependencies?: string[];
  maxOutputSizeMB?: number;
}

interface Statistics {
  filesAnalyzed: number;
  totalLines: number;
  totalSize: number;
  estimatedTokens: number;
  duration: number;
  skippedFiles: number;
  warnings: string[];
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

// =============================================================================
// Configuration
// =============================================================================

const CONFIG = {
  DOCS_DIR: 'docs',
  TREE_SCRIPT: path.join('scripts', 'tree.ts'),
  TREE_OUTPUT: 'tree.md',
  DEVDOCS_OUTPUT: 'devdocs.md',
  AGENT_RULE_FILES: ['clinerules.md', 'agents.md'],
  COMMAND_TIMEOUT_MS: 120000,
  MAX_BUFFER_SIZE: 1024 * 1024 * 20,
  MAX_OUTPUT_SIZE_MB: 15,
  APPROX_CHARS_PER_TOKEN: 4,
  CONFIG_FILE_NAMES: ['.devdocsrc', '.devdocsrc.json'],
} as const;

// =============================================================================
// Templates
// =============================================================================

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

const USAGE_INFO = `
${c.bold('Usage:')} npm run devdocs -- [options] <file1> [<file2> ...]

${c.bold('Options:')}
  --include-rules      Include agent rules files (clinerules.md, agents.md)
  --dry-run           Preview what will be analyzed without generating output
  --stats             Show detailed statistics about analyzed files
  --git-diff          Only analyze files changed in git working directory
  --git-staged        Only analyze files staged in git
  --exclude <pattern> Exclude files matching pattern (can be used multiple times)
  --config <path>     Path to custom config file
  --validate          Validate required tools before running
  -h, --help          Show this help message

${c.bold('Examples:')}
  ${c.dim('# Basic usage with statistics')}
  npm run devdocs -- --stats src/

  ${c.dim('# Analyze only changed files')}
  npm run devdocs -- --git-diff --include-rules

  ${c.dim('# Preview without generating')}
  npm run devdocs -- --dry-run src/

  ${c.dim('# Exclude test files')}
  npm run devdocs -- --exclude "*.test.ts" --exclude "*.spec.ts" src/

  ${c.dim('# Use custom config')}
  npm run devdocs -- --config .devdocsrc.json src/

${c.bold('Config File (.devdocsrc or .devdocsrc.json):')}
  {
    "excludePatterns": ["*.test.ts", "*.spec.ts", "__tests__/**"],
    "includePaths": ["src/", "lib/"],
    "includeRules": true,
    "ignoredDependencies": ["lodash", "moment"],
    "maxOutputSizeMB": 15
  }
`.trim();

// =============================================================================
// UI & Logging
// =============================================================================

const UI = {
  log: console.log,

  printHeader() {
    UI.log(
      `\n${c.bold(c.cyan('📚 DevDocs: Generating AI-ready codebase documentation...'))}`,
    );
  },

  printStep(step: string, detail?: string) {
    const detailStr = detail ? c.dim(` ${detail}`) : '';
    UI.log(`${c.bold(c.blue('▸'))} ${step}${detailStr}`);
  },

  printSuccess(message: string) {
    UI.log(`${c.bold(c.green('✓'))} ${message}`);
  },

  printWarning(message: string) {
    UI.log(`${c.bold(c.yellow('⚠'))} ${message}`);
  },

  printError(message: string, error?: Error) {
    UI.log(`${c.bold(c.red('✗'))} ${message}`);
    if (error?.message) {
      UI.log(c.red(`  ${error.message}`));
    }
  },

  printInfo(message: string) {
    UI.log(`${c.dim('ℹ')} ${c.dim(message)}`);
  },

  printCommand(cmd: string[]) {
    let cmdStr = cmd.join(' ');
    if (cmdStr.length > 100) {
      cmdStr = cmdStr.substring(0, 97) + '...';
    }
    UI.log(c.dim(`  $ ${cmdStr}`));
  },

  printSeparator() {
    UI.log(c.dim('─'.repeat(60)));
  },

  printStatistics(stats: Statistics) {
    UI.log(`\n${c.bold(c.cyan('📊 Generation Statistics:'))}`);
    UI.printSeparator();
    UI.log(`${c.bold('Files analyzed:'.padEnd(25))} ${stats.filesAnalyzed}`);
    UI.log(`${c.bold('Files skipped:'.padEnd(25))} ${stats.skippedFiles}`);
    UI.log(
      `${c.bold('Total lines:'.padEnd(25))} ${stats.totalLines.toLocaleString()}`,
    );
    UI.log(
      `${c.bold('Total size:'.padEnd(25))} ${formatBytes(stats.totalSize)}`,
    );
    UI.log(
      `${c.bold('Estimated tokens:'.padEnd(25))} ~${stats.estimatedTokens.toLocaleString()}`,
    );
    UI.log(`${c.bold('Duration:'.padEnd(25))} ${stats.duration.toFixed(2)}s`);

    if (stats.warnings.length > 0) {
      UI.log(`\n${c.bold(c.yellow('⚠ Warnings:'))}`);
      stats.warnings.forEach((warning) => UI.log(`  • ${c.dim(warning)}`));
    }

    UI.printSeparator();
  },

  printDryRunHeader() {
    UI.log(`\n${c.bold(c.cyan('🔍 Dry Run - Preview of Analysis:'))}`);
    UI.printSeparator();
  },

  printDryRunFile(
    status: 'include' | 'exclude' | 'missing' | 'directory',
    filePath: string,
  ) {
    const icons = {
      include: c.green('✓'),
      exclude: c.yellow('⊘'),
      missing: c.red('✗'),
      directory: c.blue('📁'),
    };
    const labels = {
      include: 'Include',
      exclude: 'Excluded',
      missing: 'Not found',
      directory: 'Directory',
    };
    UI.log(
      `${icons[status]} ${c.bold(labels[status].padEnd(10))} ${c.dim(filePath)}`,
    );
  },

  printDryRunSummary(total: number, excluded: number) {
    UI.printSeparator();
    UI.log(`${c.bold('Files to analyze:'.padEnd(25))} ${total}`);
    UI.log(`${c.bold('Files to exclude:'.padEnd(25))} ${excluded}`);
    UI.printSeparator();
  },

  printFooter(success: boolean, outputPath?: string) {
    if (success && outputPath) {
      UI.log(
        `\n${c.bold(c.green('🎉 Documentation generated successfully!'))}`,
      );
      UI.log(`   ${c.dim('Location:')} ${c.cyan(outputPath)}`);
      UI.log(`   ${c.dim('Copied to clipboard')}`);
    } else if (!success) {
      UI.log(
        `\n${c.bold(c.red('🛑 Documentation generation failed. Review errors above.'))}`,
      );
    }
  },

  printFatalError(error: unknown) {
    UI.log(`\n${c.bold(c.red('🛑 Fatal Error:'))}`);
    if (error instanceof DevDocsError) {
      UI.log(c.red(`   ${error.message}`));
      if (error.cause instanceof Error) {
        UI.log(c.dim(`   ${error.cause.message}`));
      }
    } else if (error instanceof Error) {
      UI.log(c.red(`   ${error.message}`));
      if (error.stack) {
        UI.log(c.dim(error.stack.split('\n').slice(1).join('\n')));
      }
    } else {
      UI.log(c.red(`   ${String(error)}`));
    }
  },
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Formats bytes to human-readable size.
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * Estimates token count from text content.
 */
const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / CONFIG.APPROX_CHARS_PER_TOKEN);
};

/**
 * Checks if a file or directory exists.
 */
const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

/**
 * Matches file path against glob-like patterns.
 *
 * @param filePath - The file path to test against patterns
 * @param patterns - Array of glob-like patterns (supports * and ** wildcards)
 * @returns true if the file path matches any pattern
 *
 * @security
 * This function properly escapes all regex special characters before converting
 * glob patterns to regex, preventing regex injection and ReDoS attacks from
 * user-provided patterns (CLI args or config files).
 *
 * @example
 * matchesPattern('src/test.ts', ['*.ts']) // true
 * matchesPattern('src/utils/helper.ts', ['**\/util*\/**']) // true
 * matchesPattern('test.ts', ['test.ts']) // true (exact match)
 */
const matchesPattern = (filePath: string, patterns: string[]): boolean => {
  if (patterns.length === 0) return false;

  for (const pattern of patterns) {
    // Security: Properly escape regex chars while preserving glob wildcards
    // This prevents regex injection from user-provided patterns
    const regexPattern = pattern
      // Step 1: Temporarily mark glob patterns with placeholders
      .replace(/\*\*/g, '\x00DOUBLESTAR\x00')
      .replace(/\*/g, '\x00STAR\x00')
      // Step 2: Escape all regex special chars (except the placeholders)
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      // Step 3: Convert glob * to regex [^/]* (matches any characters except /)
      .replace(/\x00STAR\x00/g, '[^/]*')
      // Step 4: Handle **/ pattern specially - matches zero or more path segments
      .replace(/\x00DOUBLESTAR\x00\//g, '(?:.*/)?')
      // Step 5: Handle /** pattern at end
      .replace(/\/\x00DOUBLESTAR\x00$/g, '/.*')
      // Step 6: Handle remaining ** (not preceded/followed by /)
      .replace(/\x00DOUBLESTAR\x00/g, '.*');

    const regex = new RegExp(`^${regexPattern}$`);

    if (regex.test(filePath) || filePath.includes(pattern)) {
      return true;
    }
  }
  return false;
};

/**
 * Traverses up the directory tree to find the project root.
 */
const findProjectRoot = async (startPath: string): Promise<string> => {
  let currentPath = path.resolve(startPath);
  while (currentPath !== path.parse(currentPath).root) {
    const packageJsonPath = path.join(currentPath, 'package.json');
    try {
      await fs.access(packageJsonPath);
      return currentPath;
    } catch {
      currentPath = path.dirname(currentPath);
    }
  }
  throw new DevDocsError(
    'Could not find project root (package.json not found).',
  );
};

/**
 * Executes a command using execa, handling potential errors.
 */
const executeCommand = async (
  command: string,
  args: string[],
  captureOutput: boolean,
): Promise<string | void> => {
  try {
    const stdio = captureOutput ? 'pipe' : 'inherit';
    const result = await execa(command, args, {
      stdio,
      timeout: CONFIG.COMMAND_TIMEOUT_MS,
      maxBuffer: CONFIG.MAX_BUFFER_SIZE,
    });

    if (captureOutput) {
      return (result.stdout ?? '').trim();
    }
  } catch (error: unknown) {
    const message = `Error executing command: "${command} ${args.join(' ')}"`;
    throw new DevDocsError(message, error);
  }
};

// =============================================================================
// Core Logic
// =============================================================================

/**
 * Validates that required external tools are available.
 */
const validateRequiredTools = async (): Promise<void> => {
  UI.printStep('Validating required tools...');
  const requiredTools = [
    { command: 'npx', args: ['--version'], name: 'npx' },
    { command: 'npx', args: ['repomix', '--version'], name: 'repomix' },
  ];

  for (const tool of requiredTools) {
    try {
      await executeCommand(tool.command, tool.args, true);
      UI.printSuccess(`${tool.name} is available`);
    } catch (error: unknown) {
      throw new DevDocsError(
        `Required tool "${tool.name}" is not available. Please install it first.`,
        error,
      );
    }
  }
};

/**
 * Gets list of changed files from git.
 */
const getGitChangedFiles = async (
  staged: boolean = false,
): Promise<string[]> => {
  UI.printStep(`Getting ${staged ? 'staged' : 'changed'} files from git...`);
  try {
    const args = staged
      ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR']
      : ['diff', '--name-only', 'HEAD'];
    const output = (await executeCommand('git', args, true)) as string;

    if (!output) {
      UI.printWarning(`No ${staged ? 'staged' : 'changed'} files found in git`);
      return [];
    }

    const files = output.split('\n').filter(Boolean);
    UI.printSuccess(
      `Found ${files.length} ${staged ? 'staged' : 'changed'} file(s)`,
    );
    return files;
  } catch (error: unknown) {
    throw new DevDocsError(
      'Failed to get git changes. Ensure git is available and you are in a git repository.',
      error,
    );
  }
};

/**
 * Loads configuration from file.
 */
const loadConfigFile = async (
  rootDir: string,
  configPath?: string,
): Promise<DevDocsConfig | null> => {
  const searchPaths = configPath
    ? [path.resolve(configPath)]
    : CONFIG.CONFIG_FILE_NAMES.map((name) => path.join(rootDir, name));

  for (const configFilePath of searchPaths) {
    if (await exists(configFilePath)) {
      UI.printInfo(
        `Loading config from: ${path.relative(rootDir, configFilePath)}`,
      );
      try {
        const content = await fs.readFile(configFilePath, 'utf-8');
        const config = JSON.parse(content) as DevDocsConfig;
        return config;
      } catch (error: unknown) {
        throw new DevDocsError(
          `Failed to parse config file: ${configFilePath}`,
          error,
        );
      }
    }
  }

  if (configPath) {
    throw new DevDocsError(`Config file not found: ${configPath}`);
  }

  return null;
};

/**
 * Runs the external tree script and reads its output.
 */
const generateFileTree = async (rootDir: string): Promise<string> => {
  UI.printStep('Generating file tree...');
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

  await executeCommand('npx', ['tsx', treeScriptPath], false);

  UI.printSuccess(`File tree generated`);

  try {
    return await fs.readFile(treeDocPath, 'utf-8');
  } catch (error: unknown) {
    throw new DevDocsError(
      `Failed to read generated tree file at ${treeDocPath}`,
      error,
    );
  }
};

/**
 * Analyzes a file for statistics.
 */
const analyzeFile = async (
  filePath: string,
): Promise<{ lines: number; size: number } | null> => {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) return null;

    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').length;
    return { lines, size: stats.size };
  } catch {
    return null;
  }
};

/**
 * Runs repomix on the specified file paths and concatenates output.
 */
const getRepomixOutputs = async (
  filePaths: string[],
  ignoredDeps: string[],
  excludePatterns: string[],
  stats: Statistics,
): Promise<string> => {
  UI.printStep(`Running repomix on ${filePaths.length} path(s)...`);

  const tasks = filePaths.map(async (filePath, index) => {
    if (!(await exists(filePath))) {
      UI.printWarning(`File not found: "${filePath}". Skipping.`);
      stats.skippedFiles++;
      return null;
    }

    if (matchesPattern(filePath, excludePatterns)) {
      UI.printInfo(`Excluding file: ${filePath}`);
      stats.skippedFiles++;
      return null;
    }

    UI.printInfo(`[${index + 1}/${filePaths.length}] Analyzing ${filePath}...`);

    try {
      const repomixArgs = ['repomix', filePath, '-o', '-'];
      if (ignoredDeps.length > 0) {
        repomixArgs.push('--ignore', ignoredDeps.join(','));
      }
      if (excludePatterns.length > 0) {
        repomixArgs.push('--ignore', excludePatterns.join(','));
      }

      const output = await executeCommand('npx', repomixArgs, true);

      if (output && output.length > 0) {
        const fileStats = await analyzeFile(filePath);
        if (fileStats) {
          stats.filesAnalyzed++;
          stats.totalLines += fileStats.lines;
          stats.totalSize += fileStats.size;
        }

        return output;
      }

      UI.printWarning(`Repomix produced no output for ${filePath}. Skipping.`);
      stats.skippedFiles++;
      return null;
    } catch (_error) {
      UI.printWarning(`Repomix failed for ${filePath}. Skipping.`);
      stats.skippedFiles++;
      stats.warnings.push(`Failed to analyze: ${filePath}`);
      return null;
    }
  });

  const allOutputs = await Promise.all(tasks);
  const successfulOutputs = allOutputs.filter(Boolean) as string[];

  if (successfulOutputs.length === 0) {
    throw new DevDocsError(
      'Repomix failed to generate output for all provided files.',
    );
  }

  if (successfulOutputs.length < filePaths.length) {
    UI.printWarning('Some files failed or were skipped');
  } else {
    UI.printSuccess('All files analyzed successfully');
  }

  return successfulOutputs.join('\n\n---\n\n');
};

/**
 * Reads package.json and extracts dependency names.
 */
const getIgnoredDependencies = async (
  rootDir: string,
  configDeps?: string[],
): Promise<string[]> => {
  const deps = new Set<string>(configDeps ?? []);
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
      resolutions.forEach((dep) => deps.add(dep));
    }
  } catch (_error) {
    UI.printWarning('Could not read package.json for resolutions');
  }

  const result = Array.from(deps);
  if (result.length > 0) {
    UI.printInfo(`Ignoring ${result.length} dependencies`);
  }
  return result;
};

/**
 * Finds a file in a directory matching one of the names (case-insensitive).
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
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      UI.printWarning(`Could not read directory: ${dir}`);
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
  UI.printStep('Searching for agent rules files...');
  const ruleFilePath = await findFileCaseInsensitive(
    rootDir,
    CONFIG.AGENT_RULE_FILES,
  );

  if (ruleFilePath) {
    UI.printSuccess(`Found agent rules: ${path.basename(ruleFilePath)}`);
    try {
      return await fs.readFile(ruleFilePath, 'utf-8');
    } catch (error: unknown) {
      throw new DevDocsError(
        `Failed to read agent rules file: ${ruleFilePath}`,
        error,
      );
    }
  }

  UI.printInfo('No agent rules file found');
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
  stats: Statistics,
  maxOutputSizeMB: number,
): Promise<string> => {
  UI.printStep('Creating devdocs.md...');
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

  stats.estimatedTokens = estimateTokens(devdocsContent);
  const sizeInMB = devdocsContent.length / (1024 * 1024);

  if (sizeInMB > maxOutputSizeMB) {
    const warning = `Output size (${sizeInMB.toFixed(2)} MB) exceeds recommended maximum (${maxOutputSizeMB} MB)`;
    UI.printWarning(warning);
    stats.warnings.push(warning);
  }

  try {
    await fs.mkdir(path.dirname(devDocsPath), { recursive: true });
    await fs.writeFile(devDocsPath, devdocsContent);

    UI.printSuccess(
      `Documentation written to ${path.relative(rootDir, devDocsPath)}`,
    );
    return devdocsContent;
  } catch (error: unknown) {
    throw new DevDocsError(`Failed to write ${CONFIG.DEVDOCS_OUTPUT}`, error);
  }
};

/**
 * Copies the generated content to the system clipboard.
 */
const copyToClipboard = async (content: string): Promise<void> => {
  UI.printStep('Copying to clipboard...');
  try {
    await clipboardy.write(content);
    UI.printSuccess('Copied to clipboard');
  } catch (_error) {
    UI.printWarning(
      'Failed to copy to clipboard (file was generated successfully)',
    );
  }
};

/**
 * Performs a dry run to preview what will be analyzed.
 */
const performDryRun = async (
  filePaths: string[],
  excludePatterns: string[],
): Promise<void> => {
  UI.printDryRunHeader();

  let totalFiles = 0;
  let excludedFiles = 0;

  for (const filePath of filePaths) {
    if (!(await exists(filePath))) {
      UI.printDryRunFile('missing', filePath);
      continue;
    }

    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      UI.printDryRunFile('directory', filePath);
    } else if (matchesPattern(filePath, excludePatterns)) {
      UI.printDryRunFile('exclude', filePath);
      excludedFiles++;
    } else {
      UI.printDryRunFile('include', filePath);
      totalFiles++;
    }
  }

  UI.printDryRunSummary(totalFiles, excludedFiles);
};

// =============================================================================
// Main Execution
// =============================================================================

const parseCliArguments = (): CliArgs => {
  try {
    const { values, positionals } = parseArgs({
      options: {
        'include-rules': { type: 'boolean', default: false },
        'dry-run': { type: 'boolean', default: false },
        stats: { type: 'boolean', default: false },
        'git-diff': { type: 'boolean', default: false },
        'git-staged': { type: 'boolean', default: false },
        validate: { type: 'boolean', default: false },
        exclude: { type: 'string', multiple: true, default: [] },
        config: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
      allowPositionals: true,
      strict: false,
    });

    return {
      values: {
        'include-rules': values['include-rules'] as boolean,
        'dry-run': values['dry-run'] as boolean,
        stats: values.stats as boolean,
        'git-diff': values['git-diff'] as boolean,
        'git-staged': values['git-staged'] as boolean,
        validate: values.validate as boolean,
        exclude: (values.exclude as string[]) ?? [],
        config: values.config as string | undefined,
        help: values.help as boolean,
      },
      positionals,
    };
  } catch (error: unknown) {
    throw new DevDocsError('Failed to parse arguments', error);
  }
};

const main = async () => {
  const startTime = Date.now();
  const args = parseCliArguments();

  if (args.values.help) {
    console.log(USAGE_INFO);
    process.exit(0);
  }

  UI.printHeader();

  // Initialize statistics
  const stats: Statistics = {
    filesAnalyzed: 0,
    totalLines: 0,
    totalSize: 0,
    estimatedTokens: 0,
    duration: 0,
    skippedFiles: 0,
    warnings: [],
  };

  // Find project root
  const scriptPath = fileURLToPath(import.meta.url);
  const scriptDir = path.dirname(scriptPath);
  const rootDir = await findProjectRoot(scriptDir);
  UI.printSuccess(`Project root: ${rootDir}`);

  // Load configuration
  const config = await loadConfigFile(rootDir, args.values.config);

  // Merge CLI args with config
  const excludePatterns = [
    ...(config?.excludePatterns ?? []),
    ...args.values.exclude,
  ];
  const includeRules =
    args.values['include-rules'] || config?.includeRules || false;
  const maxOutputSizeMB = config?.maxOutputSizeMB ?? CONFIG.MAX_OUTPUT_SIZE_MB;

  // Determine file paths
  let filePaths = args.positionals;

  if (args.values['git-diff'] || args.values['git-staged']) {
    const gitFiles = await getGitChangedFiles(args.values['git-staged']);
    filePaths = gitFiles.length > 0 ? gitFiles : filePaths;
  }

  if (config?.includePaths && filePaths.length === 0) {
    filePaths = config.includePaths;
  }

  if (filePaths.length === 0) {
    UI.printError('No file paths provided');
    console.log('\n' + USAGE_INFO);
    process.exit(1);
  }

  // Validate tools if requested
  if (args.values.validate) {
    await validateRequiredTools();
  }

  // Dry run mode
  if (args.values['dry-run']) {
    await performDryRun(filePaths, excludePatterns);
    process.exit(0);
  }

  // Get ignored dependencies
  const ignoredDeps = await getIgnoredDependencies(
    rootDir,
    config?.ignoredDependencies,
  );

  // Run all tasks concurrently
  UI.log('');
  const [treeContent, agentRulesContent, allRepomixOutputs] = await Promise.all(
    [
      generateFileTree(rootDir),
      includeRules ? getAgentRulesContent(rootDir) : Promise.resolve(null),
      getRepomixOutputs(filePaths, ignoredDeps, excludePatterns, stats),
    ],
  );

  // Create file
  const content = await createDevDocsFile(
    rootDir,
    treeContent,
    allRepomixOutputs,
    agentRulesContent,
    stats,
    maxOutputSizeMB,
  );

  // Copy to clipboard
  await copyToClipboard(content);

  // Update duration
  stats.duration = (Date.now() - startTime) / 1000;

  // Print statistics if requested
  if (args.values.stats) {
    UI.printStatistics(stats);
  }

  // Print footer
  const outputPath = path.relative(
    rootDir,
    path.join(rootDir, CONFIG.DOCS_DIR, CONFIG.DEVDOCS_OUTPUT),
  );
  UI.printFooter(true, outputPath);
};

// Entry point
main().catch((error) => {
  UI.printFatalError(error);
  process.exit(1);
});
