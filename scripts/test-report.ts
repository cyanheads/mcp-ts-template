#!/usr/bin/env bun
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
/**
 * @fileoverview Runs all test suites, collects JSON results, and generates
 * a self-contained HTML test report dashboard.
 * @module scripts/test-report
 *
 * @example
 *   bun run scripts/test-report.ts           # Run all suites, generate report
 *   bun run scripts/test-report.ts --open    # Generate and open in browser
 *   bun run scripts/test-report.ts --suite unit,conformance  # Specific suites only
 */
import { spawn } from 'bun';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ROOT = path.resolve(import.meta.dirname, '..');
const REPORTS_DIR = path.join(ROOT, 'reports');

interface SuiteConfig {
  command: string[];
  jsonFile: string;
  label: string;
  name: string;
}

const SUITES: SuiteConfig[] = [
  {
    name: 'unit',
    label: 'Unit Tests',
    command: ['bunx', 'vitest', 'run', '--reporter=json', '--reporter=verbose'],
    jsonFile: 'unit.json',
  },
  {
    name: 'conformance',
    label: 'Conformance Tests',
    command: [
      'bunx',
      'vitest',
      'run',
      '--config',
      'vitest.conformance.ts',
      '--reporter=json',
      '--reporter=verbose',
    ],
    jsonFile: 'conformance.json',
  },
  {
    name: 'integration',
    label: 'Integration Tests',
    command: [
      'bunx',
      'vitest',
      'run',
      '--config',
      'vitest.integration.ts',
      '--reporter=json',
      '--reporter=verbose',
    ],
    jsonFile: 'integration.json',
  },
  {
    name: 'fuzz',
    label: 'Fuzz / Property Tests',
    command: ['bunx', 'vitest', 'run', 'fuzz', '--reporter=json', '--reporter=verbose'],
    jsonFile: 'fuzz.json',
  },
];

// ---------------------------------------------------------------------------
// Types for Vitest JSON output
// ---------------------------------------------------------------------------

interface VitestResult {
  numFailedTests: number;
  numPassedTests: number;
  numPendingTests: number;
  numTodoTests: number;
  numTotalTests: number;
  startTime: number;
  success: boolean;
  testResults: VitestFileResult[];
}

interface VitestFileResult {
  assertionResults: VitestTestResult[];
  endTime: number;
  name: string;
  startTime: number;
  status: 'passed' | 'failed' | 'skipped';
}

interface VitestTestResult {
  ancestorTitles: string[];
  duration: number;
  failureMessages: string[];
  status: 'passed' | 'failed' | 'pending' | 'skipped' | 'todo';
  title: string;
}

interface SuiteReport {
  config: SuiteConfig;
  durationMs: number;
  error: string | null;
  exitCode: number;
  result: VitestResult | null;
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const shouldOpen = args.includes('--open');
const suiteFilter = args
  .find((a) => a.startsWith('--suite=') || a.startsWith('--suite '))
  ?.replace('--suite=', '')
  ?.replace('--suite ', '')
  ?.split(',');

const suitesToRun = suiteFilter ? SUITES.filter((s) => suiteFilter.includes(s.name)) : SUITES;

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function runSuite(suite: SuiteConfig): Promise<SuiteReport> {
  const jsonPath = path.join(REPORTS_DIR, suite.jsonFile);
  const cmd = [...suite.command, `--outputFile=${jsonPath}`];

  console.log(`\n--- ${suite.label} ---`);
  console.log(`  $ ${cmd.join(' ')}`);

  const start = Date.now();
  let exitCode = 1;
  let error: string | null = null;

  try {
    const proc = spawn({
      cmd,
      cwd: ROOT,
      stdout: 'inherit',
      stderr: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    exitCode = await proc.exited;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const durationMs = Date.now() - start;

  let result: VitestResult | null = null;
  try {
    if (existsSync(jsonPath)) {
      const raw = await Bun.file(jsonPath).text();
      result = JSON.parse(raw) as VitestResult;
    }
  } catch {
    // JSON may not exist if suite was skipped or crashed before output
  }

  return { config: suite, exitCode, durationMs, result, error };
}

// ---------------------------------------------------------------------------
// HTML Report Generator
// ---------------------------------------------------------------------------

function generateHtml(reports: SuiteReport[]): string {
  const timestamp = new Date().toISOString();
  const totalTests = reports.reduce((s, r) => s + (r.result?.numTotalTests ?? 0), 0);
  const totalPassed = reports.reduce((s, r) => s + (r.result?.numPassedTests ?? 0), 0);
  const totalFailed = reports.reduce((s, r) => s + (r.result?.numFailedTests ?? 0), 0);
  const totalSkipped = reports.reduce(
    (s, r) => s + (r.result?.numPendingTests ?? 0) + (r.result?.numTodoTests ?? 0),
    0,
  );
  const totalDuration = reports.reduce((s, r) => s + r.durationMs, 0);
  const allPassed = reports.every((r) => r.exitCode === 0);

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function statusBadge(status: string): string {
    const colors: Record<string, string> = {
      passed: '#10b981',
      failed: '#ef4444',
      pending: '#f59e0b',
      skipped: '#6b7280',
      todo: '#8b5cf6',
    };
    const color = colors[status] ?? '#6b7280';
    return `<span class="badge" style="--badge-color: ${color}">${status}</span>`;
  }

  // Build suite sections
  const suiteSections = reports
    .map((report) => {
      const r = report.result;
      const suiteStatus = report.exitCode === 0 ? 'passed' : 'failed';

      let filesHtml = '';
      if (r?.testResults) {
        filesHtml = r.testResults
          .map((file) => {
            const relPath = file.name.replace(`${ROOT}/`, '').replace(`${ROOT}\\`, '');
            const testsHtml = file.assertionResults
              .map((t) => {
                const fullName = [...t.ancestorTitles, t.title].join(' > ');
                const dur =
                  t.duration != null
                    ? `<span class="dur">${formatDuration(t.duration)}</span>`
                    : '';
                const failMsg =
                  t.status === 'failed' && t.failureMessages.length > 0
                    ? `<pre class="fail-msg">${escapeHtml(t.failureMessages.join('\n'))}</pre>`
                    : '';
                return `<div class="test-row test-${t.status}">
                  <span class="test-status">${statusBadge(t.status)}</span>
                  <span class="test-name">${escapeHtml(fullName)}</span>
                  ${dur}
                  ${failMsg}
                </div>`;
              })
              .join('\n');

            return `<details class="file-group" ${file.status === 'failed' ? 'open' : ''}>
              <summary class="file-header">
                ${statusBadge(file.status)}
                <span class="file-path">${escapeHtml(relPath)}</span>
                <span class="file-count">${file.assertionResults.length} tests</span>
              </summary>
              <div class="file-tests">${testsHtml}</div>
            </details>`;
          })
          .join('\n');
      }

      const errorHtml = report.error
        ? `<pre class="suite-error">${escapeHtml(report.error)}</pre>`
        : '';

      return `<section class="suite" id="suite-${report.config.name}">
        <div class="suite-header">
          <h2>${statusBadge(suiteStatus)} ${escapeHtml(report.config.label)}</h2>
          <div class="suite-stats">
            <span class="stat">${r?.numPassedTests ?? 0} passed</span>
            <span class="stat stat-fail">${r?.numFailedTests ?? 0} failed</span>
            <span class="stat stat-skip">${(r?.numPendingTests ?? 0) + (r?.numTodoTests ?? 0)} skipped</span>
            <span class="stat stat-dur">${formatDuration(report.durationMs)}</span>
          </div>
        </div>
        ${errorHtml}
        <div class="suite-files">${filesHtml || '<p class="no-results">No test results collected</p>'}</div>
      </section>`;
    })
    .join('\n');

  // Nav links
  const navLinks = reports
    .map((r) => {
      const icon = r.exitCode === 0 ? '&#10003;' : '&#10007;';
      const cls = r.exitCode === 0 ? 'nav-pass' : 'nav-fail';
      return `<a href="#suite-${r.config.name}" class="${cls}">${icon} ${r.config.label}</a>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test Report &mdash; @cyanheads/mcp-ts-core</title>
<style>
  :root {
    --bg: #0a0a0f;
    --bg-card: #12121a;
    --bg-hover: #1a1a25;
    --border: #1e1e2e;
    --text: #e4e4ec;
    --text-dim: #8888a0;
    --accent: #6366f1;
    --accent-dim: #4f46e5;
    --green: #10b981;
    --red: #ef4444;
    --yellow: #f59e0b;
    --radius: 8px;
    --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, system-ui, sans-serif;
    --mono: 'SF Mono', 'Cascadia Code', 'Fira Code', Menlo, monospace;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: var(--font);
    background: var(--bg);
    color: var(--text);
    line-height: 1.6;
    min-height: 100vh;
  }
  .layout {
    display: grid;
    grid-template-columns: 220px 1fr;
    min-height: 100vh;
  }
  /* -- Sidebar -- */
  .sidebar {
    background: var(--bg-card);
    border-right: 1px solid var(--border);
    padding: 24px 16px;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }
  .sidebar h1 {
    font-size: 14px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
    margin-bottom: 20px;
  }
  .sidebar a {
    display: block;
    padding: 8px 12px;
    color: var(--text);
    text-decoration: none;
    border-radius: 6px;
    font-size: 13px;
    margin-bottom: 2px;
    transition: background 0.15s;
  }
  .sidebar a:hover { background: var(--bg-hover); }
  .nav-pass::before { content: ''; }
  .nav-fail { color: var(--red); }
  .nav-pass { color: var(--green); }
  /* -- Main -- */
  .main {
    padding: 32px 40px;
    max-width: 1000px;
  }
  .report-header {
    margin-bottom: 32px;
  }
  .report-header h1 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  .report-header .meta {
    font-size: 13px;
    color: var(--text-dim);
  }
  /* -- Summary cards -- */
  .summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 36px;
  }
  .card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px 18px;
  }
  .card .card-value {
    font-size: 28px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .card .card-label {
    font-size: 12px;
    color: var(--text-dim);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-top: 2px;
  }
  .card-pass .card-value { color: var(--green); }
  .card-fail .card-value { color: var(--red); }
  .card-skip .card-value { color: var(--yellow); }
  .card-total .card-value { color: var(--accent); }
  .card-status .card-value { font-size: 18px; }
  /* -- Suite sections -- */
  .suite {
    margin-bottom: 32px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }
  .suite-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }
  .suite-header h2 {
    font-size: 16px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .suite-stats {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: var(--text-dim);
  }
  .stat-fail { color: var(--red); }
  .stat-skip { color: var(--yellow); }
  .suite-files { padding: 8px 12px; }
  .suite-error {
    background: #1a0a0a;
    border: 1px solid #3a1515;
    color: var(--red);
    padding: 12px 16px;
    margin: 12px;
    border-radius: 6px;
    font-family: var(--mono);
    font-size: 12px;
    white-space: pre-wrap;
    overflow-x: auto;
  }
  .no-results {
    color: var(--text-dim);
    font-size: 13px;
    padding: 12px 8px;
  }
  /* -- File groups -- */
  .file-group {
    margin-bottom: 4px;
  }
  .file-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    transition: background 0.15s;
    list-style: none;
  }
  .file-header::-webkit-details-marker { display: none; }
  .file-header::before {
    content: '\\25B6';
    font-size: 9px;
    color: var(--text-dim);
    transition: transform 0.15s;
  }
  details[open] > .file-header::before { transform: rotate(90deg); }
  .file-header:hover { background: var(--bg-hover); }
  .file-path {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--text);
  }
  .file-count {
    margin-left: auto;
    font-size: 11px;
    color: var(--text-dim);
  }
  .file-tests { padding: 0 0 4px 28px; }
  /* -- Individual tests -- */
  .test-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 3px 8px;
    font-size: 12px;
    border-radius: 4px;
  }
  .test-row:hover { background: var(--bg-hover); }
  .test-name {
    flex: 1;
    font-family: var(--mono);
    font-size: 11.5px;
  }
  .dur {
    font-size: 11px;
    color: var(--text-dim);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .fail-msg {
    width: 100%;
    background: #1a0a0a;
    border: 1px solid #3a1515;
    color: #f87171;
    padding: 8px 12px;
    margin: 4px 0;
    border-radius: 4px;
    font-family: var(--mono);
    font-size: 11px;
    white-space: pre-wrap;
    overflow-x: auto;
  }
  /* -- Badges -- */
  .badge {
    display: inline-block;
    padding: 1px 7px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    background: color-mix(in srgb, var(--badge-color) 15%, transparent);
    color: var(--badge-color);
    border: 1px solid color-mix(in srgb, var(--badge-color) 30%, transparent);
  }
  /* -- Responsive -- */
  @media (max-width: 768px) {
    .layout { grid-template-columns: 1fr; }
    .sidebar { display: none; }
    .main { padding: 20px 16px; }
  }
</style>
</head>
<body>
<div class="layout">
  <nav class="sidebar">
    <h1>Test Report</h1>
    ${navLinks}
  </nav>
  <main class="main">
    <div class="report-header">
      <h1>@cyanheads/mcp-ts-core</h1>
      <p class="meta">Generated ${timestamp}</p>
    </div>
    <div class="summary">
      <div class="card card-status">
        <div class="card-value">${allPassed ? 'ALL PASSED' : 'FAILURES'}</div>
        <div class="card-label">Status</div>
      </div>
      <div class="card card-total">
        <div class="card-value">${totalTests}</div>
        <div class="card-label">Total</div>
      </div>
      <div class="card card-pass">
        <div class="card-value">${totalPassed}</div>
        <div class="card-label">Passed</div>
      </div>
      <div class="card card-fail">
        <div class="card-value">${totalFailed}</div>
        <div class="card-label">Failed</div>
      </div>
      <div class="card card-skip">
        <div class="card-value">${totalSkipped}</div>
        <div class="card-label">Skipped</div>
      </div>
      <div class="card card">
        <div class="card-value">${formatDuration(totalDuration)}</div>
        <div class="card-label">Duration</div>
      </div>
    </div>
    ${suiteSections}
  </main>
</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('Test Report Generator');
  console.log('=====================\n');

  // Ensure reports directory exists
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }

  // Run suites sequentially (they share stdout and some may share state)
  const reports: SuiteReport[] = [];
  for (const suite of suitesToRun) {
    const report = await runSuite(suite);
    reports.push(report);
  }

  // Generate HTML
  const html = generateHtml(reports);
  const htmlPath = path.join(REPORTS_DIR, 'index.html');
  writeFileSync(htmlPath, html, 'utf-8');

  // Summary
  console.log('\n=====================');
  console.log('Report Summary\n');

  for (const r of reports) {
    const icon = r.exitCode === 0 ? '\u2713' : '\u2717';
    const count = r.result
      ? `${r.result.numPassedTests}/${r.result.numTotalTests} passed`
      : 'no results';
    console.log(`  ${icon} ${r.config.label}: ${count} (${(r.durationMs / 1000).toFixed(1)}s)`);
  }

  const totalTests = reports.reduce((s, r) => s + (r.result?.numTotalTests ?? 0), 0);
  const totalPassed = reports.reduce((s, r) => s + (r.result?.numPassedTests ?? 0), 0);
  const anyFailed = reports.some((r) => r.exitCode !== 0);

  console.log(`\n  Total: ${totalPassed}/${totalTests} passed`);
  console.log(`  Report: ${htmlPath}`);

  // Open in browser if requested
  if (shouldOpen) {
    const openCmd =
      process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    spawn({ cmd: [openCmd, htmlPath], stdout: 'ignore', stderr: 'ignore' });
  }

  process.exit(anyFailed ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
