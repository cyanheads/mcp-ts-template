import { exec } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const BLUE = '\x1b[34m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';

type CommandResult = {
  name: string;
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

function runCommand(
  name: string,
  command: string,
  cwd: string,
): Promise<CommandResult> {
  console.log(
    `${BOLD}${BLUE}🔷 Running ${YELLOW}${name}${BLUE}...${RESET}${DIM}`,
  );
  console.log(`   $ ${command}${RESET}\n`);

  return new Promise((resolve) => {
    const startTime = Date.now();
    exec(command, { cwd }, (error, stdout, stderr) => {
      const duration = Date.now() - startTime;
      const exitCode = error ? (error.code ?? 1) : 0;

      if (exitCode === 0) {
        console.log(
          `${BOLD}${GREEN}✅ ${YELLOW}${name}${GREEN} finished successfully in ${duration}ms.${RESET}\n`,
        );
      } else {
        console.log(
          `${BOLD}${RED}❌ ${YELLOW}${name}${RED} failed with exit code ${exitCode} in ${duration}ms.${RESET}\n`,
        );
      }

      resolve({
        name,
        command,
        exitCode,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

async function main() {
  console.log(`${BOLD}🚀 Kicking off comprehensive checks...${RESET}\n`);

  const commands = [
    // {
    //   name: 'Prettier Formatting',
    //   command: 'bunx prettier --write "**/*.{ts,tsx,js,jsx,json,md,html,css}"',
    // },
    { name: 'ESLint', command: 'bunx eslint .' },
    { name: 'TypeScript Type Check', command: 'bunx tsc --noEmit' },
  ];

  const results = await Promise.all(
    commands.map((c) => runCommand(c.name, c.command, rootDir)),
  );

  console.log(`\n${BOLD}📊 Checkup Summary:${RESET}`);
  console.log('----------------------');

  let overallSuccess = true;
  results.forEach((result) => {
    const status =
      result.exitCode === 0
        ? `${GREEN}✅ PASSED${RESET}`
        : `${RED}❌ FAILED${RESET}`;
    console.log(`${BOLD}${result.name}${RESET}: ${status}`);

    if (result.exitCode !== 0) {
      overallSuccess = false;
      if (result.stdout) {
        console.log(result.stdout);
      }
      if (result.stderr) {
        console.log(`${RED}${result.stderr}${RESET}`);
      }
      console.log('');
    }
  });

  console.log('----------------------');

  if (overallSuccess) {
    console.log(`${BOLD}${GREEN}🎉 All checks passed! Ship it!${RESET}`);
    process.exit(0);
  } else {
    console.log(
      `${BOLD}${RED}🛑 Found issues. Please review the output above.${RESET}`,
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\nAn unexpected error occurred in the check script:', error);
  process.exit(1);
});
