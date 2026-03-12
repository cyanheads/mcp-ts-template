/**
 * @fileoverview Verifies that all subpath exports in package.json resolve
 * to existing files in dist/. Run after `bun run build`.
 */
import { existsSync, readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
const exports = pkg.exports as Record<string, string | Record<string, string>>;

let errors = 0;
let checked = 0;

for (const [subpath, conditions] of Object.entries(exports)) {
  if (typeof conditions === 'string') {
    checked++;
    if (!existsSync(conditions)) {
      console.error(`MISSING: ${subpath} → ${conditions}`);
      errors++;
    }
  } else {
    for (const [condition, path] of Object.entries(conditions)) {
      checked++;
      if (!existsSync(path)) {
        console.error(`MISSING: ${subpath} [${condition}] → ${path}`);
        errors++;
      }
    }
  }
}

if (errors > 0) {
  console.error(`\n${errors} missing export path(s) out of ${checked} checked.`);
  process.exit(1);
} else {
  console.log(
    `All ${checked} export paths verified across ${Object.keys(exports).length} subpaths.`,
  );
}
