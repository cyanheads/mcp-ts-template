/**
 * @fileoverview Shared text utilities for handler-source heuristic lint rules.
 * @module src/linter/rules/source-text
 */

/**
 * Replaces the contents of single-line comments, block comments, and string
 * literals with same-length whitespace runs. Preserves line structure (so any
 * future line-aware diagnostics still align) without falsely matching
 * anti-pattern regexes against documentation or sample text inside literals.
 *
 * Used by the handler-body and error-contract conformance rules so a comment
 * like `// throws NotFound` doesn't pollute the scan.
 *
 * Limitations: regex literals are not stripped. If a regex contains the literal
 * text `throw new Error(`, it would still trigger a false positive — but that is
 * a deliberate trade-off; full lexing is overkill for a heuristic warning.
 */
export function stripCommentsAndStrings(source: string): string {
  let out = '';
  let i = 0;
  const n = source.length;

  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];

    // Line comment
    if (ch === '/' && next === '/') {
      out += '//';
      i += 2;
      while (i < n && source[i] !== '\n') {
        out += ' ';
        i++;
      }
      continue;
    }

    // Block comment
    if (ch === '/' && next === '*') {
      out += '/*';
      i += 2;
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) {
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < n) {
        out += '*/';
        i += 2;
      }
      continue;
    }

    // String literal: ', ", `
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch;
      out += quote;
      i++;
      while (i < n && source[i] !== quote) {
        if (source[i] === '\\' && i + 1 < n) {
          out += '  ';
          i += 2;
          continue;
        }
        // Template literals can contain `${...}` — preserve those so we don't
        // miss patterns like `throw new Error(\`x: ${JSON.stringify(y)}\`)`.
        if (quote === '`' && source[i] === '$' && source[i + 1] === '{') {
          let depth = 1;
          out += '${';
          i += 2;
          while (i < n && depth > 0) {
            if (source[i] === '{') depth++;
            else if (source[i] === '}') depth--;
            if (depth > 0) {
              out += source[i];
              i++;
            }
          }
          if (i < n) {
            out += '}';
            i++;
          }
          continue;
        }
        out += source[i] === '\n' ? '\n' : ' ';
        i++;
      }
      if (i < n) {
        out += quote;
        i++;
      }
      continue;
    }

    out += ch;
    i++;
  }

  return out;
}
