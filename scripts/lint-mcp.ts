#!/usr/bin/env node
/**
 * @fileoverview MCP definition linter CLI.
 * Discovers tool/resource/prompt definitions from conventional locations,
 * runs `validateDefinitions()`, and reports results.
 *
 * Used by devcheck and as a standalone script: `bun run lint:mcp` / `npm run lint:mcp`
 *
 * Discovery strategy:
 *   1. Globs for `*.tool.ts`, `*.resource.ts`, `*.prompt.ts` in known paths
 *   2. Dynamically imports each file
 *   3. Extracts exported definitions by duck-typing (has name/handler/input etc.)
 *   4. Feeds them into `validateDefinitions()`
 *
 * Runtime-agnostic: works with bun, tsx, and Node.js (via ts-node/esm).
 *
 * @module scripts/lint-mcp
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

// ---------------------------------------------------------------------------
// Import validateDefinitions — resolve from package or local source
// ---------------------------------------------------------------------------

let validateDefinitions: typeof import('../src/linter/validate.js').validateDefinitions;

try {
  // Consumer path: installed as a dependency
  const pkg = await import('@cyanheads/mcp-ts-core/linter');
  validateDefinitions = pkg.validateDefinitions;
} catch {
  // Framework path: running from the framework repo itself
  const local = await import('../src/linter/validate.js');
  validateDefinitions = local.validateDefinitions;
}

// ---------------------------------------------------------------------------
// Definition detection (duck-typing)
// ---------------------------------------------------------------------------

function isToolLike(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const hasHandler = typeof o.handler === 'function';
  const hasTaskHandlers = o.taskHandlers != null && typeof o.taskHandlers === 'object';
  return (hasHandler || hasTaskHandlers) && o.input != null && o.output != null;
}

function isResourceLike(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.uriTemplate === 'string' && typeof o.handler === 'function';
}

function isPromptLike(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.generate === 'function' && typeof o.name === 'string' && !('handler' in o);
}

// ---------------------------------------------------------------------------
// File discovery (no bun dependency — uses Node.js fs)
// ---------------------------------------------------------------------------

const SEARCH_DIRS = ['examples/mcp-server', 'src/mcp-server'];

const DEFINITION_SUFFIXES = [
  '.tool.ts',
  '.resource.ts',
  '.prompt.ts',
  '.app-tool.ts',
  '.app-resource.ts',
];

function walkDir(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.DS_Store') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (DEFINITION_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) {
      results.push(full);
    }
  }
  return results;
}

function discoverFiles(): string[] {
  const files: string[] = [];
  for (const dir of SEARCH_DIRS) {
    const resolved = resolve(dir);
    files.push(...walkDir(resolved));
  }
  return [...new Set(files)];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const files = discoverFiles();

  if (files.length === 0) {
    console.log('No MCP definition files found. Skipping lint.');
    process.exit(0);
  }

  const tools: unknown[] = [];
  const resources: unknown[] = [];
  const prompts: unknown[] = [];

  for (const file of files) {
    try {
      const mod = await import(file);
      for (const exported of Object.values(mod)) {
        if (isToolLike(exported)) tools.push(exported);
        else if (isResourceLike(exported)) resources.push(exported);
        else if (isPromptLike(exported)) prompts.push(exported);
      }
    } catch (err) {
      console.warn(
        `Warning: Failed to import ${file}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  const total = tools.length + resources.length + prompts.length;
  if (total === 0) {
    console.log(`Scanned ${files.length} files but found no definitions. Skipping lint.`);
    process.exit(0);
  }

  console.log(
    `Linting ${tools.length} tool(s), ${resources.length} resource(s), ${prompts.length} prompt(s) from ${files.length} file(s)...`,
  );

  const report = validateDefinitions({ tools, resources, prompts });

  for (const w of report.warnings) {
    console.warn(`  ⚠ [${w.rule}] ${w.message}`);
  }
  for (const e of report.errors) {
    console.error(`  ✗ [${e.rule}] ${e.message}`);
  }

  if (report.passed) {
    if (report.warnings.length > 0) {
      console.log(`\nPassed with ${report.warnings.length} warning(s).`);
    } else {
      console.log('\nAll definitions valid.');
    }
    process.exit(0);
  } else {
    console.error(
      `\nFailed: ${report.errors.length} error(s), ${report.warnings.length} warning(s).`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('lint-mcp failed:', err);
  process.exit(1);
});
