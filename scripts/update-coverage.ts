#!/usr/bin/env bun
/**
 * @fileoverview Update Coverage Script
 * @module scripts/update-coverage
 *
 * Runs test coverage, parses results, and optionally commits the JSON summary to git.
 * Only `coverage-final.json` is committed — HTML reports and other artifacts are gitignored.
 *
 * Usage:
 *   bun run scripts/update-coverage.ts           # Dry run (no commit)
 *   bun run scripts/update-coverage.ts --commit  # Run and commit changes
 *   bun run scripts/update-coverage.ts --help    # Show usage
 *
 * Exit codes:
 *   0 — Changes committed (--commit) or dry-run with changes detected
 *   1 — Error (test failure, git failure, missing file)
 *   2 — No changes detected (coverage already up to date)
 */

import { $ } from 'bun';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CoverageFileEntry {
  /** Statement map — keys are IDs, values are hit counts */
  s?: Record<string, number>;
  /** Function map — keys are IDs, values are hit counts */
  f?: Record<string, number>;
  /** Branch map — keys are IDs, values are arrays of hit counts per branch arm */
  b?: Record<string, number[]>;
  /** Line map — keys are line numbers, values are hit counts */
  l?: Record<string, number>;
}

interface CoverageMetric {
  covered: number;
  total: number;
  pct: string;
}

interface CoverageStats {
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
  lines: CoverageMetric;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ROOT_DIR = resolve(import.meta.dirname ?? process.cwd(), '..');
const COVERAGE_DIR = join(ROOT_DIR, 'coverage');
const COVERAGE_JSON = join(COVERAGE_DIR, 'coverage-final.json');
const COVERAGE_JSON_REL = 'coverage/coverage-final.json';

const KNOWN_FLAGS = new Set(['--commit', '--help']);

/** Exit codes for CI differentiation */
const EXIT = { OK: 0, ERROR: 1, NO_CHANGES: 2 } as const;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function printHelp(): void {
  console.log(`Usage: bun run scripts/update-coverage.ts [options]

Options:
  --commit    Commit coverage-final.json to git (default: dry run)
  --help      Show this help message

Exit codes:
  0  Changes committed or dry-run with changes detected
  1  Error (test failure, git failure, missing file)
  2  No changes detected (coverage already up to date)`);
}

function parseArgs(argv: string[]): { shouldCommit: boolean } | null {
  let shouldCommit = false;

  for (const arg of argv) {
    if (arg === '--help') {
      printHelp();
      return null;
    } else if (arg === '--commit') {
      shouldCommit = true;
    } else if (arg.startsWith('--')) {
      if (!KNOWN_FLAGS.has(arg)) {
        console.warn(
          `Unknown flag '${arg}' — ignoring. Run with --help for usage.`,
        );
      }
    }
  }

  return { shouldCommit };
}

// ---------------------------------------------------------------------------
// Git helpers
// ---------------------------------------------------------------------------

async function isGitRepo(): Promise<boolean> {
  try {
    await $`git rev-parse --is-inside-work-tree`.quiet();
    return true;
  } catch {
    return false;
  }
}

async function hasChanges(): Promise<boolean> {
  try {
    const result = await $`git status --porcelain ${COVERAGE_JSON_REL}`.text();
    return result.trim().length > 0;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to check git status for ${COVERAGE_JSON_REL}: ${msg}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Coverage execution
// ---------------------------------------------------------------------------

/**
 * Resolve the real Node.js binary, skipping Bun's injected shim.
 * Bun places a fake `node` in a temp dir (e.g. /tmp/bun-node-*) that
 * shadows the real binary. We use `which -a` to find all candidates
 * and pick the first one that isn't a Bun shim.
 */
function resolveRealNode(): string {
  const allNodes = execFileSync('which', ['-a', 'node'], { encoding: 'utf-8' })
    .trim()
    .split('\n')
    .filter(Boolean);

  const realNode = allNodes.find((p) => !p.includes('bun-node'));
  if (realNode) return realNode;

  // Fallback: if every candidate looks like a Bun shim, try the first one
  // and let it fail with a clear error downstream.
  if (allNodes.length > 0) return allNodes[0]!;

  throw new Error(
    'Could not find a Node.js binary. Install Node.js or ensure it is on PATH.',
  );
}

function cleanCoverageDir(): void {
  rmSync(COVERAGE_DIR, { recursive: true, force: true });
}

async function runCoverage(): Promise<boolean> {
  console.log('Running test coverage...\n');

  try {
    // Run vitest under Node via child_process — Bun lacks node:inspector
    // support required by @vitest/coverage-v8. Bun injects its own `node`
    // shim into PATH (e.g. /tmp/bun-node-*/node), so we resolve the real
    // Node binary by filtering out Bun shims from `which -a node`.
    const nodeBin = resolveRealNode();
    const vitest = join(ROOT_DIR, 'node_modules', 'vitest', 'vitest.mjs');
    execFileSync(nodeBin, [vitest, 'run', '--coverage'], {
      cwd: ROOT_DIR,
      stdio: 'inherit',
    });
    console.log('\nCoverage generation complete\n');
    return true;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`\nCoverage generation failed: ${msg}\n`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Stats parsing
// ---------------------------------------------------------------------------

function computeMetric(covered: number, total: number): CoverageMetric {
  const pct = total > 0 ? ((covered / total) * 100).toFixed(2) : '0.00';
  return { covered, total, pct };
}

function parseCoverageData(
  data: Record<string, CoverageFileEntry>,
): CoverageStats {
  let totalStatements = 0;
  let coveredStatements = 0;
  let totalFunctions = 0;
  let coveredFunctions = 0;
  let totalBranches = 0;
  let coveredBranches = 0;
  let totalLines = 0;
  let coveredLines = 0;

  for (const fileEntry of Object.values(data)) {
    if (fileEntry.s) {
      for (const count of Object.values(fileEntry.s)) {
        totalStatements++;
        if (count > 0) coveredStatements++;
      }
    }
    if (fileEntry.f) {
      for (const count of Object.values(fileEntry.f)) {
        totalFunctions++;
        if (count > 0) coveredFunctions++;
      }
    }
    if (fileEntry.b) {
      for (const arms of Object.values(fileEntry.b)) {
        for (const count of arms) {
          totalBranches++;
          if (count > 0) coveredBranches++;
        }
      }
    }
    if (fileEntry.l) {
      for (const count of Object.values(fileEntry.l)) {
        totalLines++;
        if (count > 0) coveredLines++;
      }
    }
  }

  return {
    statements: computeMetric(coveredStatements, totalStatements),
    functions: computeMetric(coveredFunctions, totalFunctions),
    branches: computeMetric(coveredBranches, totalBranches),
    lines: computeMetric(coveredLines, totalLines),
  };
}

async function getCoverageStats(quiet = false): Promise<CoverageStats | null> {
  try {
    const file = Bun.file(COVERAGE_JSON);
    if (!(await file.exists())) return null;
    const data: Record<string, CoverageFileEntry> = await file.json();
    return parseCoverageData(data);
  } catch (error: unknown) {
    if (!quiet) console.warn('Could not read coverage statistics:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

function formatMetricLine(
  label: string,
  metric: CoverageMetric,
  delta?: CoverageMetric,
): string {
  const pctStr = metric.pct.padStart(7);
  const counts = `(${metric.covered}/${metric.total})`;
  let line = `  ${label} ${pctStr}%  ${counts}`;

  if (delta) {
    const prev = parseFloat(delta.pct);
    const curr = parseFloat(metric.pct);
    const diff = curr - prev;
    if (Math.abs(diff) >= 0.01) {
      const sign = diff > 0 ? '+' : '';
      line += `  ${sign}${diff.toFixed(2)}%`;
    }
  }

  return line;
}

function printStats(
  stats: CoverageStats,
  previous?: CoverageStats | null,
): void {
  console.log('Coverage:');
  console.log(
    formatMetricLine('Statements:', stats.statements, previous?.statements),
  );
  console.log(
    formatMetricLine('Functions: ', stats.functions, previous?.functions),
  );
  console.log(
    formatMetricLine('Branches:  ', stats.branches, previous?.branches),
  );
  console.log(formatMetricLine('Lines:     ', stats.lines, previous?.lines));
  console.log();
}

function buildCommitMessage(stats: CoverageStats | null): string {
  const summary = stats
    ? `\nStatements: ${stats.statements.pct}% | Functions: ${stats.functions.pct}% | Branches: ${stats.branches.pct}% | Lines: ${stats.lines.pct}%`
    : '';

  return `chore(coverage): update test coverage reports\n\nUpdated coverage-final.json with latest test results.${summary}`;
}

// ---------------------------------------------------------------------------
// Git commit
// ---------------------------------------------------------------------------

async function commitChanges(stats: CoverageStats | null): Promise<boolean> {
  console.log('Committing coverage changes...\n');

  try {
    const message = buildCommitMessage(stats);
    await $`git add ${COVERAGE_JSON_REL}`;
    await $`git commit -m ${message}`;
    console.log('Coverage changes committed\n');
    return true;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`Failed to commit changes: ${msg}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (!parsed) process.exit(EXIT.OK);

  const { shouldCommit } = parsed;
  const dryRun = !shouldCommit;

  console.log('Update Coverage Script\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no commit)' : 'COMMIT'}\n`);
  console.log('\u2500'.repeat(50) + '\n');

  if (!(await isGitRepo())) {
    console.error('Not a git repository');
    process.exit(EXIT.ERROR);
  }

  // Capture previous stats before cleaning for delta display
  const previousStats = await getCoverageStats(true);

  cleanCoverageDir();

  const success = await runCoverage();
  if (!success) {
    process.exit(EXIT.ERROR);
  }

  const file = Bun.file(COVERAGE_JSON);
  if (!(await file.exists())) {
    console.error('coverage-final.json not found after test run');
    process.exit(EXIT.ERROR);
  }

  const stats = await getCoverageStats();
  if (stats) {
    printStats(stats, previousStats);
  }

  const changed = await hasChanges();

  if (!changed) {
    console.log('No changes detected in coverage-final.json');
    console.log('Coverage is already up to date!\n');
    process.exit(EXIT.NO_CHANGES);
  }

  console.log('Changes detected in coverage-final.json\n');

  try {
    const statusOutput =
      await $`git status --short ${COVERAGE_JSON_REL}`.text();
    if (statusOutput.trim()) {
      console.log('Changes:\n' + statusOutput);
    }
  } catch {
    // Non-critical — skip the summary display
  }

  if (dryRun) {
    console.log('DRY RUN: Changes not committed');
    console.log('Run with --commit flag to commit these changes\n');
    console.log('Example: bun run scripts/update-coverage.ts --commit\n');
    process.exit(EXIT.OK);
  }

  const committed = await commitChanges(stats);

  if (committed) {
    console.log('Coverage update complete!\n');
    process.exit(EXIT.OK);
  } else {
    console.error('Failed to commit coverage changes\n');
    process.exit(EXIT.ERROR);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(EXIT.ERROR);
});
