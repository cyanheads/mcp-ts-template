import { exec } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// ANSI Color Codes
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
};

// --- Types ---
interface Check {
  name: string;
  flag: string;
  checkCommand: string;
  fixCommand?: string;
  tip?: string;
}

interface CommandResult {
  name: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  skipped: boolean;
}

// --- Check Definitions ---
const ALL_CHECKS: Check[] = [
  {
    name: 'ESLint',
    flag: '--no-lint',
    checkCommand: 'bunx eslint . --max-warnings 0',
    fixCommand: 'bunx eslint . --fix',
    tip: `Run without ${c.bold}--no-fix${c.dim} to automatically fix issues.`,
  },
  {
    name: 'TypeScript',
    flag: '--no-types',
    checkCommand: 'bunx tsc --noEmit',
    tip: 'Check TypeScript errors in your IDE or the console output.',
  },
  {
    name: 'Prettier',
    flag: '--no-format',
    checkCommand:
      'bunx prettier --check "**/*.{ts,tsx,js,jsx,json,md,html,css}"',
    fixCommand: 'bunx prettier --write "**/*.{ts,tsx,js,jsx,json,md,html,css}"',
    tip: `Run without ${c.bold}--no-fix${c.dim} to fix formatting.`,
  },
  {
    name: 'Dependencies',
    flag: '--no-deps',
    checkCommand: 'bun update --dry-run',
    tip: `Run ${c.bold}bun update${c.dim} to upgrade dependencies.`,
  },
];

// --- Core Logic ---
function parseArgs(args: string[]): {
  flags: Set<string>;
  noFix: boolean;
  isHuskyHook: boolean;
} {
  const flags = new Set<string>();
  let noFix = false;
  let isHuskyHook = false;
  for (const arg of args) {
    if (arg === '--no-fix') {
      noFix = true;
    } else if (arg === '--husky-hook') {
      isHuskyHook = true;
    } else {
      flags.add(arg);
    }
  }
  return { flags, noFix, isHuskyHook };
}

function execAsync(
  command: string,
  options: { cwd: string },
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    exec(command, options, (error, stdout, stderr) => {
      resolve({
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: error?.code ?? 0,
      });
    });
  });
}

async function checkDependencies(): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const { stdout, stderr, code } = await execAsync('bun update --dry-run', {
    cwd: rootDir,
  });

  if (code === 0) {
    // If the command exits with 0, it means no updates are available.
    return { exitCode: 0, stdout, stderr };
  } else {
    // A non-zero exit code means updates are available, which we treat as a "failure" for this check.
    return {
      exitCode: 1,
      stdout: stdout || 'Dependencies are not up to date.',
      stderr,
    };
  }
}

async function runCheck(
  check: Check,
  skipped: boolean,
  noFix: boolean,
): Promise<CommandResult> {
  const { name, checkCommand, fixCommand } = check;
  const baseResult = {
    name,
    exitCode: 0,
    stdout: '',
    stderr: '',
    duration: 0,
    skipped: false,
  };

  if (skipped) {
    console.log(
      `${c.bold}${c.yellow}🔶 Skipping ${name}...${c.reset}${c.dim} (due to ${check.flag})${c.reset}\n`,
    );
    return Promise.resolve({ ...baseResult, skipped: true });
  }

  const useFixCommand = !noFix && !!fixCommand;
  const command = useFixCommand ? fixCommand : checkCommand;
  const mode = useFixCommand ? 'Fixing' : 'Checking';

  console.log(
    `${c.bold}${c.blue}🔷 ${mode} ${c.yellow}${name}${c.blue}...${c.reset}${c.dim}`,
  );
  console.log(`   $ ${command}${c.reset}\n`);

  const startTime = Date.now();
  let result: {
    exitCode: number;
    stdout: string;
    stderr: string;
  };

  if (name === 'Dependencies') {
    result = await checkDependencies();
  } else {
    const { stdout, stderr, code } = await execAsync(command, { cwd: rootDir });
    result = { exitCode: code ?? 1, stdout, stderr };
  }

  const duration = Date.now() - startTime;

  if (result.exitCode === 0) {
    console.log(
      `${c.bold}${c.green}✅ ${c.yellow}${name}${c.green} ${mode} finished successfully in ${duration}ms.${c.reset}\n`,
    );
  } else {
    console.log(
      `${c.bold}${c.red}❌ ${c.yellow}${name}${c.red} ${mode} failed with exit code ${result.exitCode} in ${duration}ms.${c.reset}\n`,
    );
  }

  return {
    ...baseResult,
    exitCode: result.exitCode,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
    duration,
  };
}

function printSummary(results: CommandResult[], noFix: boolean): boolean {
  console.log(`\n${c.bold}📊 Checkup Summary:${c.reset}`);
  console.log('-------------------------------------------');

  let overallSuccess = true;
  const failedChecks: Check[] = [];

  // Use a Set to only show unique check names in the summary
  const processedChecks = new Set<string>();

  results.forEach((result) => {
    if (processedChecks.has(result.name)) {
      return;
    }
    processedChecks.add(result.name);

    let status: string;
    if (result.skipped) {
      status = `${c.yellow}⚪ SKIPPED${c.reset}`;
    } else if (result.exitCode === 0) {
      status = `${c.green}✅ PASSED${c.reset}`;
    } else {
      status = `${c.red}❌ FAILED${c.reset}`;
      overallSuccess = false;
      const foundCheck = ALL_CHECKS.find((check) => check.name === result.name);
      if (foundCheck) failedChecks.push(foundCheck);
    }

    const durationStr = `${c.dim}(${result.duration}ms)${c.reset}`;
    console.log(
      `${c.bold}${result.name.padEnd(15)}${c.reset} ${status} ${durationStr}`,
    );

    if (result.exitCode !== 0) {
      if (result.stdout)
        console.log(c.dim + result.stdout.replace(/^/gm, '   ') + c.reset);
      if (result.stderr)
        console.log(c.red + result.stderr.replace(/^/gm, '   ') + c.reset);
      console.log('');
    }
  });

  console.log('-------------------------------------------');

  if (!overallSuccess && noFix) {
    console.log(`\n${c.bold}${c.magenta}💡 Tips for fixing issues:${c.reset}`);
    failedChecks.forEach((check) => {
      if (check.tip) {
        console.log(
          `   - ${c.bold}${check.name}:${c.reset} ${c.dim}${check.tip}${c.reset}`,
        );
      }
    });
  } else if (!overallSuccess && !noFix) {
    console.log(
      `\n${c.yellow}Some issues were fixed automatically, but others require manual intervention.${c.reset}`,
    );
  }

  return overallSuccess;
}

async function main() {
  const { flags, noFix, isHuskyHook } = parseArgs(process.argv.slice(2));
  const modeMessage = isHuskyHook
    ? `${c.magenta}(Husky Pre-commit Hook)${c.reset}`
    : noFix
      ? `${c.dim}(Read-only mode)${c.reset}`
      : `${c.magenta}(Auto-fixing mode)${c.reset}`;

  console.log(
    `${c.bold}🚀 Kicking off comprehensive checks... ${modeMessage}${c.reset}\n`,
  );

  let stagedFilesBefore: string[] = [];
  if (isHuskyHook) {
    try {
      console.log(
        `${c.bold}${c.magenta}🔍 Husky hook: Capturing staged files...${c.reset}`,
      );
      const { stdout } = await execAsync('git diff --name-only --cached', {
        cwd: rootDir,
      });
      stagedFilesBefore = stdout.split('\n').filter(Boolean);
      if (stagedFilesBefore.length > 0) {
        console.log(
          `${c.dim}   Staged files: ${stagedFilesBefore.join(', ')}${c.reset}\n`,
        );
      } else {
        console.log(`${c.dim}   No files staged.${c.reset}\n`);
      }
    } catch (_error) {
      console.error(
        `${c.red}Error capturing staged files: Shell command failed`,
      );
      process.exit(1);
    }
  }

  // Remove duplicate checks
  const uniqueChecks = ALL_CHECKS.filter(
    (check, index, self) =>
      index === self.findIndex((c) => c.name === check.name),
  );

  const checksToRun = uniqueChecks.map((check) =>
    runCheck(check, flags.has(check.flag), noFix),
  );

  const results = await Promise.all(checksToRun);

  const overallSuccess = printSummary(results, noFix);

  if (isHuskyHook && overallSuccess) {
    try {
      console.log(
        `\n${c.bold}${c.magenta}✨ Husky hook: Checking for auto-formatted staged files...${c.reset}`,
      );
      const { stdout: gitStatus } = await execAsync('git status --porcelain', {
        cwd: rootDir,
      });
      const modifiedFiles = gitStatus
        .split('\n')
        .filter((line) => line.startsWith(' M'))
        .map((line) => line.substring(3));

      const filesToReStage = stagedFilesBefore.filter((file) =>
        modifiedFiles.includes(file),
      );

      if (filesToReStage.length > 0) {
        console.log(
          `${c.yellow}   Re-staging ${filesToReStage.length} files modified by a fixer...${c.reset}`,
        );
        for (const file of filesToReStage) {
          console.log(`${c.dim}     $ git add ${file}${c.reset}`);
          await execAsync(`git add ${file}`, { cwd: rootDir });
        }
        console.log(`${c.green}   ✓ Successfully re-staged files.${c.reset}`);
      } else {
        console.log(`${c.green}   ✓ No staged files were modified.${c.reset}`);
      }
    } catch (error) {
      console.error(
        `${c.red}Error re-staging files: Shell command failed`,
        error,
      );
      process.exit(1);
    }
  }

  if (overallSuccess) {
    console.log(
      `\n${c.bold}${c.green}🎉 All checks passed! Ship it!${c.reset}`,
    );
    process.exit(0);
  } else {
    console.log(
      `\n${c.bold}${c.red}🛑 Found issues. Please review the output above.${c.reset}`,
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    `${c.red}\nAn unexpected error occurred in the check script:${c.reset}`,
    error,
  );
  process.exit(1);
});
