/**
 * @fileoverview Test suite for formatting utilities barrel export
 * @module tests/utils/formatting/index.test
 */

import { describe, expect, it } from 'vitest';

describe('Formatting Utilities Barrel Export', () => {
  describe('Class Exports', () => {
    it('should export MarkdownBuilder class', async () => {
      const { MarkdownBuilder } = await import('@/utils/formatting/index.js');

      expect(MarkdownBuilder).toBeDefined();
      expect(typeof MarkdownBuilder).toBe('function');
    });

    it('should allow MarkdownBuilder to be instantiated', async () => {
      const { MarkdownBuilder } = await import('@/utils/formatting/index.js');

      const builder = new MarkdownBuilder();
      expect(builder).toBeInstanceOf(MarkdownBuilder);
    });
  });

  describe('Function Exports', () => {
    it('should export markdown helper function', async () => {
      const { markdown } = await import('@/utils/formatting/index.js');

      expect(markdown).toBeDefined();
      expect(typeof markdown).toBe('function');
    });

    it('should allow markdown helper to be called', async () => {
      const { markdown } = await import('@/utils/formatting/index.js');

      const result = markdown().h1('Test').paragraph('This is a test.').build();

      expect(typeof result).toBe('string');
      expect(result).toContain('# Test');
      expect(result).toContain('This is a test.');
    });
  });

  describe('Complete Export Verification', () => {
    it('should export all expected symbols', async () => {
      const formattingModule = await import('@/utils/formatting/index.js');

      const expectedExports = [
        'MarkdownBuilder',
        'markdown',
        'tableFormatter',
        'TableFormatter',
        'diffFormatter',
        'DiffFormatter',
        'treeFormatter',
        'TreeFormatter',
      ];

      expectedExports.forEach((exportName) => {
        expect(formattingModule).toHaveProperty(exportName);
      });
    });

    it('should only export expected symbols', async () => {
      const formattingModule = await import('@/utils/formatting/index.js');

      const exports = Object.keys(formattingModule);
      const knownExports = [
        'MarkdownBuilder',
        'markdown',
        'tableFormatter',
        'TableFormatter',
        'diffFormatter',
        'DiffFormatter',
        'treeFormatter',
        'TreeFormatter',
      ];

      exports.forEach((exportName) => {
        expect(knownExports).toContain(exportName);
      });
    });
  });

  describe('Functional Integration', () => {
    it('should allow using MarkdownBuilder through barrel export', async () => {
      const { MarkdownBuilder } = await import('@/utils/formatting/index.js');

      const builder = new MarkdownBuilder();
      const result = builder
        .h1('Title')
        .paragraph('This is a paragraph.')
        .list(['Item 1', 'Item 2', 'Item 3'])
        .build();

      expect(result).toContain('# Title');
      expect(result).toContain('This is a paragraph.');
      expect(result).toContain('- Item 1');
      expect(result).toContain('- Item 2');
      expect(result).toContain('- Item 3');
    });

    it('should allow using markdown helper through barrel export', async () => {
      const { markdown } = await import('@/utils/formatting/index.js');

      const result = markdown()
        .h2('Features')
        .list(['Feature A', 'Feature B'])
        .codeBlock('console.log("Hello");', 'javascript')
        .build();

      expect(result).toContain('## Features');
      expect(result).toContain('- Feature A');
      expect(result).toContain('- Feature B');
      expect(result).toContain('```javascript');
      expect(result).toContain('console.log("Hello");');
      expect(result).toContain('```');
    });

    it('should support method chaining', async () => {
      const { markdown } = await import('@/utils/formatting/index.js');

      const result = markdown()
        .h1('Section 1')
        .paragraph('Text in section 1')
        .h2('Section 2')
        .paragraph('Text in section 2')
        .build();

      expect(result).toContain('# Section 1');
      expect(result).toContain('Text in section 1');
      expect(result).toContain('## Section 2');
      expect(result).toContain('Text in section 2');
    });
  });
});
