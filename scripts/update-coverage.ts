#!/usr/bin/env bun
/**
 * @fileoverview Update Coverage Script
 * @module scripts/update-coverage
 *
 * Runs test coverage, checks for changes, and optionally commits them to git.
 * Usage:
 *   bun run scripts/update-coverage.ts           # Dry run (no commit)
 *   bun run scripts/update-coverage.ts --commit  # Run and commit changes
 */

import { $ } from 'bun';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const COVERAGE_DIR = 'coverage';
const COMMIT_MESSAGE = `chore(coverage): update test coverage reports

Updated coverage reports with latest test results.`;

/**
 * Check if we're in a git repository
 */
async function isGitRepo(): Promise<boolean> {
  try {
    await $`git rev-parse --is-inside-work-tree`.quiet();
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if coverage directory exists
 */
function coverageExists(): boolean {
  return existsSync(join(process.cwd(), COVERAGE_DIR));
}

/**
 * Run test coverage
 */
async function runCoverage(): Promise<boolean> {
  console.log('📊 Running test coverage...\n');

  try {
    await $`bunx vitest run --coverage`;
    console.log('\n✅ Coverage generation complete\n');
    return true;
  } catch (error: unknown) {
    console.error('\n❌ Coverage generation failed:', error);
    return false;
  }
}

/**
 * Check if there are changes in the coverage directory
 */
async function hasChanges(): Promise<boolean> {
  try {
    const result = await $`git status --porcelain ${COVERAGE_DIR}`.text();
    return result.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get coverage statistics from the coverage directory
 */
async function getCoverageStats(): Promise<string | null> {
  const summaryPath = join(process.cwd(), COVERAGE_DIR, 'coverage-final.json');

  if (!existsSync(summaryPath)) {
    return null;
  }

  try {
    const file = Bun.file(summaryPath);
    const data = await file.json();

    // Calculate total coverage
    let totalStatements = 0;
    let coveredStatements = 0;

    for (const filePath in data) {
      const fileData = data[filePath];
      if (fileData.s) {
        for (const count of Object.values(fileData.s)) {
          totalStatements++;
          if ((count as number) > 0) {
            coveredStatements++;
          }
        }
      }
    }

    const percentage =
      totalStatements > 0
        ? ((coveredStatements / totalStatements) * 100).toFixed(2)
        : '0.00';

    return `${percentage}% (${coveredStatements}/${totalStatements} statements)`;
  } catch (error: unknown) {
    console.warn('⚠️  Could not read coverage statistics:', error);
    return null;
  }
}

/**
 * Commit coverage changes
 */
async function commitChanges(): Promise<boolean> {
  console.log('💾 Committing coverage changes...\n');

  try {
    // Stage coverage directory
    await $`git add ${COVERAGE_DIR}`;

    // Create commit
    await $`git commit -m ${COMMIT_MESSAGE}`;

    console.log('✅ Coverage changes committed\n');
    return true;
  } catch (error: unknown) {
    console.error('❌ Failed to commit changes:', error);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  const shouldCommit = process.argv.includes('--commit');
  const dryRun = !shouldCommit;

  console.log('🧪 Update Coverage Script\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no commit)' : 'COMMIT'}\n`);
  console.log('─'.repeat(50) + '\n');

  // Check if we're in a git repo
  if (!(await isGitRepo())) {
    console.error('❌ Not a git repository');
    process.exit(1);
  }

  // Run coverage
  const success = await runCoverage();
  if (!success) {
    process.exit(1);
  }

  // Check if coverage directory exists
  if (!coverageExists()) {
    console.error('❌ Coverage directory not found');
    process.exit(1);
  }

  // Get coverage stats
  const stats = await getCoverageStats();
  if (stats) {
    console.log(`📈 Coverage: ${stats}\n`);
  }

  // Check for changes
  const hasChangesInCoverage = await hasChanges();

  if (!hasChangesInCoverage) {
    console.log('ℹ️  No changes detected in coverage directory');
    console.log('✨ Coverage is already up to date!\n');
    process.exit(0);
  }

  console.log('📝 Changes detected in coverage directory\n');

  // Show diff summary
  try {
    const diffStat = await $`git diff --stat ${COVERAGE_DIR}`.text();
    console.log('Changes:\n' + diffStat + '\n');
  } catch {
    // Ignore diff errors
  }

  if (dryRun) {
    console.log('ℹ️  DRY RUN: Changes not committed');
    console.log('💡 Run with --commit flag to commit these changes\n');
    console.log('Example: bun run scripts/update-coverage.ts --commit\n');
    process.exit(0);
  }

  // Commit changes
  const committed = await commitChanges();

  if (committed) {
    console.log('✨ Coverage update complete!\n');
    process.exit(0);
  } else {
    console.error('❌ Failed to commit coverage changes\n');
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
