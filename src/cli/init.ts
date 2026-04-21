#!/usr/bin/env node
/**
 * @fileoverview CLI entry point for `@cyanheads/mcp-ts-core`. Dispatches subcommands.
 * Currently supports `init` for scaffolding new consumer projects.
 * @module src/cli/init
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATES_DIR = join(PACKAGE_ROOT, 'templates');
const SKILLS_DIR = join(PACKAGE_ROOT, 'skills');
const SCRIPTS_DIR = join(PACKAGE_ROOT, 'scripts');
// Keep in sync with package.json `files` — entries here must also appear there to ship in the npm package.
const SCAFFOLD_SCRIPTS = [
  'build-changelog.ts',
  'build.ts',
  'check-docs-sync.ts',
  'clean.ts',
  'devcheck.ts',
  'lint-mcp.ts',
  'tree.ts',
];
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
    mcp-ts-core init [name]   Scaffold a new MCP server project
    mcp-ts-core --help        Show this help message

  Examples:
    npx @cyanheads/mcp-ts-core init my-mcp-server
    bunx @cyanheads/mcp-ts-core init banking-server
`);
}

// ── Init command ──────────────────────────────────────────────────────

function init(): void {
  const name = process.argv.slice(3).find((a) => !a.startsWith('--'));
  const dest = name ? join(process.cwd(), name) : process.cwd();
  const packageName = name ?? basename(dest);

  if (name) {
    if (!/^[a-zA-Z0-9_][\w.-]*$/.test(name) || name.includes('..')) {
      console.error(
        `  Error: invalid project name "${name}". Use alphanumeric, hyphens, underscores, dots.`,
      );
      process.exit(1);
    }
    mkdirSync(dest, { recursive: true });
  }

  const pkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, 'package.json'), 'utf-8')) as {
    version: string;
  };

  console.log(`\n  Scaffolding${name ? ` ${name}` : ''} in ${dest}\n`);

  const created: string[] = [];
  const skipped: string[] = [];

  // Step 1: Copy templates
  copyTemplates(dest, packageName, pkg.version, created, skipped);

  // Step 2: Copy scripts
  copyScripts(dest, created, skipped);

  // Step 3: Copy external skills
  copyExternalSkills(dest, created, skipped);

  // Print summary
  printSummary(created, skipped, name);
}

// ── Template copying ──────────────────────────────────────────────────

function copyTemplates(
  dest: string,
  name: string,
  frameworkVersion: string,
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

    if (isTextFile(srcPath)) {
      if (existsSync(destPath)) {
        skipped.push(relPath);
        continue;
      }
      mkdirSync(dirname(destPath), { recursive: true });
      const content = readFileSync(srcPath, 'utf-8')
        .replace(/\{\{PACKAGE_NAME\}\}/g, name)
        .replace(/\{\{FRAMEWORK_VERSION\}\}/g, frameworkVersion);
      writeFileSync(destPath, content);
      created.push(relPath);
    } else {
      copyIfAbsent(srcPath, destPath, relPath, created, skipped);
    }
  }
}

// ── Script copying ────────────────────────────────────────────────────

function copyScripts(dest: string, created: string[], skipped: string[]): void {
  if (!existsSync(SCRIPTS_DIR)) return;

  for (const scriptName of SCAFFOLD_SCRIPTS) {
    const srcPath = join(SCRIPTS_DIR, scriptName);
    if (!existsSync(srcPath)) continue;

    const relPath = join('scripts', scriptName);
    const destPath = join(dest, relPath);

    copyIfAbsent(srcPath, destPath, relPath, created, skipped);
  }
}

// ── Skill copying ─────────────────────────────────────────────────────

function copyExternalSkills(dest: string, created: string[], skipped: string[]): void {
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

      copyIfAbsent(srcPath, destPath, relPath, created, skipped);
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
  // Match `audience:` indented under `metadata:` (may have sibling keys before it)
  const nested = frontmatter[1].match(/^metadata:\s*\n(?:\s+\w[\w-]*:.*\n)*\s+audience:\s*(\w+)/m);
  if (nested) return nested[1];
  return frontmatter[1].match(/^audience:\s*(\w+)/m)?.[1];
}

/** Copy a single file if the destination doesn't already exist, tracking the result. */
function copyIfAbsent(
  srcPath: string,
  destPath: string,
  relPath: string,
  created: string[],
  skipped: string[],
): boolean {
  if (existsSync(destPath)) {
    skipped.push(relPath);
    return false;
  }
  mkdirSync(dirname(destPath), { recursive: true });
  cpSync(srcPath, destPath);
  created.push(relPath);
  return true;
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

function printSummary(created: string[], skipped: string[], name: string | undefined): void {
  if (created.length > 0) {
    console.log('  Created:');
    for (const f of created) {
      console.log(`    + ${f}`);
    }
  }

  if (skipped.length > 0) {
    console.log('\n  Skipped (already exist):');
    for (const f of skipped) {
      console.log(`    - ${f}`);
    }
  }

  console.log(`\n  ${created.length} created, ${skipped.length} skipped`);

  if (created.length > 0) {
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
