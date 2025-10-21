/**
 * @fileoverview Tests for DiffFormatter utility
 * @module tests/utils/formatting/diffFormatter.test
 */
import { describe, expect, it, vi } from 'vitest';

import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger, requestContextService } from '@/utils/index.js';
import {
  diffFormatter,
  DiffFormatter,
} from '@/utils/formatting/diffFormatter.js';

describe('DiffFormatter', () => {
  const oldText = `function hello() {
  console.log('Hi');
}`;

  const newText = `function hello(name: string) {
  console.log(\`Hello, \${name}!\`);
}`;

  describe('Singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(diffFormatter).toBeInstanceOf(DiffFormatter);
      expect(diffFormatter.diff).toBeInstanceOf(Function);
      expect(diffFormatter.diffLines).toBeInstanceOf(Function);
      expect(diffFormatter.diffWords).toBeInstanceOf(Function);
    });
  });

  describe('diff() method', () => {
    it('should generate a unified diff for changed text', () => {
      const result = diffFormatter.diff(oldText, newText);

      expect(result).toBeTruthy();
      expect(result).toContain('@@'); // Unified diff header
      expect(result).toContain('-'); // Deletions
      expect(result).toContain('+'); // Additions
    });

    it('should return minimal output for identical text', () => {
      const result = diffFormatter.diff('same text', 'same text');

      // Library still returns headers even with no changes
      expect(result).toBeTruthy();
      expect(result).not.toContain('@@'); // No hunks for identical content
    });

    it('should handle empty strings', () => {
      const result = diffFormatter.diff('', '');

      // Library returns headers even for empty content
      expect(result).toBeTruthy();
      expect(result).not.toContain('@@'); // No hunks for identical empty strings
    });

    it('should show additions when adding to empty text', () => {
      const result = diffFormatter.diff('', 'new content');

      expect(result).toContain('+'); // Addition marker
      expect(result).toContain('new content');
    });

    it('should show deletions when removing all text', () => {
      const result = diffFormatter.diff('old content', '');

      expect(result).toContain('-'); // Deletion marker
      expect(result).toContain('old content');
    });

    it('should respect context option', () => {
      const largeOld = Array(20)
        .fill('line')
        .map((l, i) => `${l} ${i}`)
        .join('\n');
      const largeNew = largeOld.replace('line 10', 'modified 10');

      const diff3 = diffFormatter.diff(largeOld, largeNew, { context: 3 });
      const diff1 = diffFormatter.diff(largeOld, largeNew, { context: 1 });

      expect(diff3.length).toBeGreaterThan(diff1.length); // More context = more output
    });

    it('should support patch format with headers', () => {
      const result = diffFormatter.diff(oldText, newText, {
        format: 'patch',
        includeHeaders: true,
        oldPath: 'a/file.ts',
        newPath: 'b/file.ts',
      });

      expect(result).toContain('---'); // Old file header
      expect(result).toContain('+++'); // New file header
    });

    it('should support unified format without file headers', () => {
      const result = diffFormatter.diff(oldText, newText, {
        format: 'unified',
      });

      expect(result).toContain('@@'); // Hunk header
      expect(result).not.toContain('---'); // No file headers
      expect(result).not.toContain('+++'); // No file headers
    });
  });

  describe('diffLines() method', () => {
    it('should generate diff from line arrays', () => {
      const oldLines = ['line 1', 'line 2', 'line 3'];
      const newLines = ['line 1', 'modified line 2', 'line 3', 'line 4'];

      const result = diffFormatter.diffLines(oldLines, newLines);

      expect(result).toBeTruthy();
      expect(result).toContain('@@');
      expect(result).toContain('-line 2');
      expect(result).toContain('+modified line 2');
      expect(result).toContain('+line 4');
    });

    it('should handle empty line arrays', () => {
      const result = diffFormatter.diffLines([], []);

      // Library returns headers even for empty arrays
      expect(result).toBeTruthy();
      expect(result).not.toContain('@@'); // No hunks for identical empty arrays
    });

    it('should handle single-line arrays', () => {
      const result = diffFormatter.diffLines(['old'], ['new']);

      expect(result).toContain('-old');
      expect(result).toContain('+new');
    });
  });

  describe('diffWords() method', () => {
    it('should generate word-level diff', () => {
      const old = 'The quick brown fox';
      const new_ = 'The fast brown dog';

      const result = diffFormatter.diffWords(old, new_);

      expect(result).toContain('[-quick-]'); // Removed word
      expect(result).toContain('[+fast+]'); // Added word
      expect(result).toContain('[-fox-]');
      expect(result).toContain('[+dog+]');
      expect(result).toContain('brown'); // Unchanged word
    });

    it('should handle identical text in word diff', () => {
      const result = diffFormatter.diffWords('same text', 'same text');

      expect(result).toBe('same text');
      expect(result).not.toContain('[-');
      expect(result).not.toContain('[+');
    });

    it('should handle empty strings in word diff', () => {
      const result = diffFormatter.diffWords('', '');
      expect(result).toBe('');
    });

    it('should show all additions for empty old text', () => {
      const result = diffFormatter.diffWords('', 'new words here');

      expect(result).toContain('[+new words here+]');
    });

    it('should show all deletions for empty new text', () => {
      const result = diffFormatter.diffWords('old words here', '');

      expect(result).toContain('[-old words here-]');
    });
  });

  describe('isEqual() method', () => {
    it('should return true for identical strings', () => {
      expect(diffFormatter.isEqual('same', 'same')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(diffFormatter.isEqual('different', 'strings')).toBe(false);
    });

    it('should return true for empty strings', () => {
      expect(diffFormatter.isEqual('', '')).toBe(true);
    });

    it('should be case-sensitive', () => {
      expect(diffFormatter.isEqual('Test', 'test')).toBe(false);
    });
  });

  describe('getStats() method', () => {
    it('should return statistics for diff', () => {
      const old = 'line 1\nline 2\nline 3';
      const new_ = 'line 1\nmodified 2\nline 3\nline 4';

      const stats = diffFormatter.getStats(old, new_);

      expect(stats.additions).toBeGreaterThan(0);
      expect(stats.deletions).toBeGreaterThan(0);
      expect(stats.changes).toBe(stats.additions + stats.deletions);
    });

    it('should return zero stats for identical text', () => {
      const stats = diffFormatter.getStats('same', 'same');

      expect(stats.additions).toBe(0);
      expect(stats.deletions).toBe(0);
      expect(stats.changes).toBe(0);
    });

    it('should count only additions when adding to empty', () => {
      const stats = diffFormatter.getStats('', 'line 1\nline 2');

      expect(stats.additions).toBe(2);
      expect(stats.deletions).toBe(0);
      expect(stats.changes).toBe(2);
    });

    it('should count only deletions when removing all', () => {
      const stats = diffFormatter.getStats('line 1\nline 2', '');

      expect(stats.additions).toBe(0);
      expect(stats.deletions).toBe(2);
      expect(stats.changes).toBe(2);
    });
  });

  describe('Error handling', () => {
    it('should throw McpError for non-string oldText in diff()', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        diffFormatter.diff(123, 'text');
      }).toThrow(McpError);

      try {
        // @ts-expect-error Testing invalid input
        diffFormatter.diff(123, 'text');
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(JsonRpcErrorCode.ValidationError);
        expect(mcpError.message).toContain('string');
      }
    });

    it('should throw McpError for non-string newText in diff()', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        diffFormatter.diff('text', null);
      }).toThrow(McpError);
    });

    it('should throw McpError for non-array inputs in diffLines()', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        diffFormatter.diffLines('not array', ['valid']);
      }).toThrow(McpError);

      try {
        // @ts-expect-error Testing invalid input
        diffFormatter.diffLines('not array', ['valid']);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(JsonRpcErrorCode.ValidationError);
        expect(mcpError.message).toContain('array');
      }
    });

    it('should throw McpError for non-string inputs in diffWords()', () => {
      expect(() => {
        // @ts-expect-error Testing invalid input
        diffFormatter.diffWords(undefined, 'text');
      }).toThrow(McpError);
    });
  });

  describe('Context logging', () => {
    it('should log successful diff generation with context', () => {
      const debugSpy = vi.spyOn(logger, 'debug');
      const context = requestContextService.createRequestContext({
        operation: 'test-diff',
      });

      diffFormatter.diff('old', 'new', {}, context);

      expect(debugSpy).toHaveBeenCalledWith(
        'Diff generated successfully',
        expect.objectContaining({
          operation: 'test-diff',
        }),
      );

      debugSpy.mockRestore();
    });

    it('should create auto-generated context when none provided', () => {
      const debugSpy = vi.spyOn(logger, 'debug');

      diffFormatter.diff('old', 'new');

      expect(debugSpy).toHaveBeenCalledWith(
        'Diff generated successfully',
        expect.objectContaining({
          operation: 'DiffFormatter.diff',
        }),
      );

      debugSpy.mockRestore();
    });

    it('should log word diff generation', () => {
      const debugSpy = vi.spyOn(logger, 'debug');

      diffFormatter.diffWords('old words', 'new words');

      expect(debugSpy).toHaveBeenCalledWith(
        'Word diff generated successfully',
        expect.any(Object),
      );

      debugSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('should handle text with special characters', () => {
      const old = 'Hello\nWorld\t!';
      const new_ = 'Hello\nUniverse\t!';

      const result = diffFormatter.diff(old, new_);
      expect(result).toBeTruthy();
    });

    it('should handle very long lines', () => {
      const longLine = 'A'.repeat(10000);
      const modifiedLine = 'A'.repeat(9999) + 'B';

      const result = diffFormatter.diff(longLine, modifiedLine);
      expect(result).toBeTruthy();
    });

    it('should handle multiline text with various line endings', () => {
      const old = 'line1\nline2\nline3';
      const new_ = 'line1\r\nline2\r\nmodified3';

      const result = diffFormatter.diff(old, new_);
      expect(result).toBeTruthy();
    });

    it('should handle text with only whitespace changes', () => {
      const old = 'word1  word2';
      const new_ = 'word1 word2';

      const result = diffFormatter.diff(old, new_);
      expect(result).toBeTruthy();
    });
  });

  describe('Format options', () => {
    it('should produce different outputs for different formats', () => {
      const unified = diffFormatter.diff(oldText, newText, {
        format: 'unified',
      });

      const patch = diffFormatter.diff(oldText, newText, {
        format: 'patch',
        includeHeaders: true,
      });

      const inline = diffFormatter.diff(oldText, newText, {
        format: 'inline',
      });

      // Patch should include headers, unified should not
      expect(patch).toContain('---');
      expect(unified).not.toContain('---');

      // All should contain some diff content
      expect(unified).toBeTruthy();
      expect(inline).toBeTruthy();
    });

    it('should allow custom file paths in headers', () => {
      const result = diffFormatter.diff(oldText, newText, {
        format: 'patch',
        oldPath: 'src/old/file.ts',
        newPath: 'src/new/file.ts',
      });

      expect(result).toContain('src/old/file.ts');
      expect(result).toContain('src/new/file.ts');
    });
  });
});
