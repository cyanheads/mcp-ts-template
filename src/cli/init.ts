#!/usr/bin/env node
/**
 * @fileoverview CLI entry point for `@cyanheads/mcp-ts-core`. Dispatches subcommands.
 * Currently supports `init` for scaffolding new consumer projects.
 * @module src/cli/init
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATES_DIR = join(PACKAGE_ROOT, 'templates');
const SKILLS_DIR = join(PACKAGE_ROOT, 'skills');
const TEXT_EXTENSIONS = new Set([
  '.md',
  '.ts',
  '.js',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.txt',
  '',
]);

// ── CLI dispatch ──────────────────────────────────────────────────────

const [subcommand] = process.argv.slice(2);

if (subcommand === 'init') {
  init();
} else {
  printUsage();
  process.exit(subcommand === undefined || subcommand === '--help' ? 0 : 1);
}

function printUsage(): void {
  const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as {
    version: string;
  };
  console.log(`
  @cyanheads/mcp-ts-core v${pkg.version}

  Usage:
    mcp-ts-core init [name] [--dry-run]   Scaffold a new MCP server project
    mcp-ts-core --help                    Show this help message

  Examples:
    npx @cyanheads/mcp-ts-core init my-mcp-server
    bunx @cyanheads/mcp-ts-core init banking-server --dry-run
`);
}

// ── Init command ──────────────────────────────────────────────────────

function init(): void {
  const args = process.argv.slice(3);
  const dryRun = args.includes('--dry-run');
  const name = args.find((a) => !a.startsWith('--'));
  const dest = name ? join(process.cwd(), name) : process.cwd();

  if (name) mkdirSync(dest, { recursive: true });

  console.log(`\n  Scaffolding${name ? ` ${name}` : ''} in ${dest}\n`);

  const created: string[] = [];
  const skipped: string[] = [];

  // Step 1: Copy templates
  copyTemplates(dest, name, dryRun, created, skipped);

  // Step 2: Copy external skills
  copyExternalSkills(dest, dryRun, created, skipped);

  // Print summary
  printSummary(created, skipped, dryRun, name);
}

// ── Template copying ──────────────────────────────────────────────────

function copyTemplates(
  dest: string,
  name: string | undefined,
  dryRun: boolean,
  created: string[],
  skipped: string[],
): void {
  const entries = walkDir(TEMPLATES_DIR);

  for (const srcPath of entries) {
    let relPath = relative(TEMPLATES_DIR, srcPath);

    // Strip template naming conventions that prevent IDE auto-discovery:
    //   biome.template.json → biome.json
    //   _tsconfig.json      → tsconfig.json
    relPath = relPath.replace(/\.template\.json$/, '.json');
    relPath = relPath.replace(/(^|\/)_([^/]+)$/, '$1$2');

    const destPath = join(dest, relPath);

    if (existsSync(destPath)) {
      skipped.push(relPath);
      continue;
    }

    if (!dryRun) {
      mkdirSync(dirname(destPath), { recursive: true });

      if (name && isTextFile(srcPath)) {
        const content = readFileSync(srcPath, 'utf-8').replace(/\{\{PACKAGE_NAME\}\}/g, name);
        writeFileSync(destPath, content);
      } else {
        cpSync(srcPath, destPath);
      }
    }

    created.push(relPath);
  }
}

// ── Skill copying ─────────────────────────────────────────────────────

function copyExternalSkills(
  dest: string,
  dryRun: boolean,
  created: string[],
  skipped: string[],
): void {
  if (!existsSync(SKILLS_DIR)) return;

  const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory());

  for (const dir of skillDirs) {
    const skillMdPath = join(SKILLS_DIR, dir.name, 'SKILL.md');
    if (!existsSync(skillMdPath)) continue;

    const audience = extractAudience(readFileSync(skillMdPath, 'utf-8'));
    if (audience !== 'external') continue;

    const skillFiles = walkDir(join(SKILLS_DIR, dir.name));

    for (const srcPath of skillFiles) {
      const relPath = join('skills', dir.name, relative(join(SKILLS_DIR, dir.name), srcPath));
      const destPath = join(dest, relPath);

      if (existsSync(destPath)) {
        skipped.push(relPath);
        continue;
      }

      if (!dryRun) {
        mkdirSync(dirname(destPath), { recursive: true });
        cpSync(srcPath, destPath);
      }

      created.push(relPath);
    }
  }
}

/**
 * Extract `metadata.audience` from SKILL.md YAML frontmatter.
 * Simple regex — avoids needing a YAML parser for a single field read.
 */
function extractAudience(content: string): string | undefined {
  const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatter?.[1]) return;
  return frontmatter[1].match(/audience:\s*(\w+)/)?.[1];
}

// ── Utilities ─────────────────────────────────────────────────────────

/** Recursively walk a directory, returning all file paths (no directories). */
function walkDir(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

function isTextFile(filePath: string): boolean {
  return TEXT_EXTENSIONS.has(extname(filePath).toLowerCase());
}

function printSummary(
  created: string[],
  skipped: string[],
  dryRun: boolean,
  name: string | undefined,
): void {
  const prefix = dryRun ? '(dry run) ' : '';

  if (created.length > 0) {
    console.log(`  ${prefix}Created:`);
    for (const f of created) {
      console.log(`    + ${f}`);
    }
  }

  if (skipped.length > 0) {
    console.log(`\n  ${prefix}Skipped (already exist):`);
    for (const f of skipped) {
      console.log(`    - ${f}`);
    }
  }

  console.log(`\n  ${created.length} created, ${skipped.length} skipped`);

  if (!dryRun && created.length > 0) {
    console.log('\n  Next steps:');
    let step = 1;
    if (name) {
      console.log(`    ${step++}. cd ${name}`);
    }
    console.log(`    ${step++}. bun install`);
    console.log(`    ${step}. Run your coding agent and ask it to get started:\n`);
    console.log('       claude');
    console.log('       codex');
    console.log('       cursor\n');
    console.log('       Your agent will read CLAUDE.md/AGENTS.md and orient itself.');
    console.log();
  }
}
