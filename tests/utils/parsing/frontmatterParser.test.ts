/**
 * @fileoverview Unit tests for the frontmatter parser utility.
 * @module tests/utils/parsing/frontmatterParser.test
 */
import { describe, expect, it, vi } from 'vitest';

import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger, requestContextService } from '@/utils/index.js';
import { frontmatterParser } from '@/utils/parsing/frontmatterParser.js';

describe('frontmatterParser.parse', () => {
  const createContext = () =>
    requestContextService.createRequestContext({
      operation: 'frontmatter-parser-test',
    });

  describe('valid frontmatter extraction', () => {
    it('parses markdown with valid frontmatter successfully', () => {
      const markdown = `---
title: My Note
tags: [productivity, notes]
published: true
---

# Note Content
This is the actual note.`;

      const result = frontmatterParser.parse<{
        title: string;
        tags: string[];
        published: boolean;
      }>(markdown);

      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter).toEqual({
        title: 'My Note',
        tags: ['productivity', 'notes'],
        published: true,
      });
      expect(result.content).toBe('# Note Content\nThis is the actual note.');
    });

    it('parses frontmatter with nested objects', () => {
      const markdown = `---
metadata:
  author: John Doe
  version: 1.0
settings:
  enabled: true
  count: 42
---

Content here.`;

      const result = frontmatterParser.parse(markdown);

      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter).toEqual({
        metadata: {
          author: 'John Doe',
          version: 1.0,
        },
        settings: {
          enabled: true,
          count: 42,
        },
      });
      expect(result.content).toBe('Content here.');
    });

    it('handles frontmatter with context for logging', () => {
      const context = createContext();
      const debugSpy = vi.spyOn(logger, 'debug');

      const markdown = `---
simple: value
---

Content`;

      const result = frontmatterParser.parse(markdown, context);

      expect(result.hasFrontmatter).toBe(true);
      expect(debugSpy).toHaveBeenCalledWith(
        'Frontmatter detected, extracting and parsing.',
        expect.objectContaining({
          operation: 'frontmatter-parser-test',
        }),
      );

      debugSpy.mockRestore();
    });

    it('handles YAML with LLM think blocks via yamlParser', () => {
      const markdown = `---
<think>processing metadata</think>
title: Test
---

Content`;

      const result = frontmatterParser.parse(markdown);

      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter).toEqual({ title: 'Test' });
      expect(result.content).toBe('Content');
    });
  });

  describe('documents without frontmatter', () => {
    it('returns original content when no frontmatter exists', () => {
      const markdown = '# Just a heading\n\nSome content.';
      const debugSpy = vi.spyOn(logger, 'debug');

      const result = frontmatterParser.parse(markdown);

      expect(result.hasFrontmatter).toBe(false);
      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe(markdown);
      expect(debugSpy).toHaveBeenCalledWith(
        'No frontmatter detected in markdown.',
        expect.any(Object),
      );

      debugSpy.mockRestore();
    });

    it('handles markdown with --- in the middle of content', () => {
      const markdown = `# Title

Some content here.

---

More content after the separator.`;

      const result = frontmatterParser.parse(markdown);

      expect(result.hasFrontmatter).toBe(false);
      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe(markdown);
    });

    it('handles markdown with only opening --- delimiter', () => {
      const markdown = `---
title: Test
# Missing closing delimiter`;

      const result = frontmatterParser.parse(markdown);

      expect(result.hasFrontmatter).toBe(false);
      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe(markdown);
    });

    it('creates auto-generated context when none is provided', () => {
      const debugSpy = vi.spyOn(logger, 'debug');
      const markdown = 'No frontmatter here';

      frontmatterParser.parse(markdown);

      expect(debugSpy).toHaveBeenCalledWith(
        'No frontmatter detected in markdown.',
        expect.objectContaining({
          operation: 'FrontmatterParser.noFrontmatter',
        }),
      );

      debugSpy.mockRestore();
    });
  });

  describe('empty frontmatter', () => {
    it('handles empty frontmatter block', () => {
      const markdown = `---
---

Content here.`;

      const debugSpy = vi.spyOn(logger, 'debug');
      const result = frontmatterParser.parse(markdown);

      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe('Content here.');
      expect(debugSpy).toHaveBeenCalledWith(
        'Empty frontmatter block detected.',
        expect.any(Object),
      );

      debugSpy.mockRestore();
    });

    it('handles frontmatter with only whitespace', () => {
      const markdown = `---


---

Content here.`;

      const result = frontmatterParser.parse(markdown);

      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe('Content here.');
    });
  });

  describe('error handling', () => {
    it('throws McpError for invalid YAML in frontmatter', () => {
      const context = createContext();
      const markdown = `---
invalid: [unterminated array
---

Content`;

      expect(() => frontmatterParser.parse(markdown, context)).toThrow(
        McpError,
      );

      try {
        frontmatterParser.parse(markdown, context);
      } catch (error) {
        expect(error).toBeInstanceOf(McpError);
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(JsonRpcErrorCode.ValidationError);
        expect(mcpError.message).toContain('Failed to parse YAML');
      }
    });

    it('logs parsing errors with context', () => {
      const context = createContext();
      const errorSpy = vi.spyOn(logger, 'error');
      const markdown = `---
bad: yaml: content
---

Content`;

      expect(() => frontmatterParser.parse(markdown, context)).toThrow(
        McpError,
      );

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to parse YAML content.',
        expect.objectContaining({
          operation: 'frontmatter-parser-test',
        }),
      );

      errorSpy.mockRestore();
    });

    it('creates auto-generated context for errors when none provided', () => {
      const errorSpy = vi.spyOn(logger, 'error');
      const markdown = `---
invalid yaml content here: {{{{
---

Content`;

      expect(() => frontmatterParser.parse(markdown)).toThrow(McpError);

      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });

    it('includes YAML content sample in error details', () => {
      const context = createContext();
      const markdown = `---
${'x: invalid\n'.repeat(100)}
---

Content`;

      try {
        frontmatterParser.parse(markdown, context);
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.message).toContain('Failed to parse YAML');
        // Error should include content sample
        expect(String(error)).toBeTruthy();
      }
    });
  });

  describe('edge cases', () => {
    it('handles empty string input', () => {
      const result = frontmatterParser.parse('');

      expect(result.hasFrontmatter).toBe(false);
      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe('');
    });

    it('handles frontmatter with no content after', () => {
      const markdown = `---
title: Test
---
`;

      const result = frontmatterParser.parse(markdown);

      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter).toEqual({ title: 'Test' });
      expect(result.content).toBe('');
    });

    it('preserves formatting in markdown content', () => {
      const markdown = `---
title: Test
---

# Heading

- List item 1
- List item 2

\`\`\`typescript
const code = true;
\`\`\``;

      const result = frontmatterParser.parse(markdown);

      expect(result.hasFrontmatter).toBe(true);
      expect(result.content).toContain('# Heading');
      expect(result.content).toContain('```typescript');
      expect(result.content).toContain('const code = true;');
    });

    it('handles frontmatter with special YAML features (anchors, references)', () => {
      const markdown = `---
defaults: &defaults
  timeout: 30
  retry: 3

production:
  <<: *defaults
  env: prod
---

Content`;

      const result = frontmatterParser.parse(markdown);

      expect(result.hasFrontmatter).toBe(true);
      expect(result.frontmatter).toEqual({
        defaults: { timeout: 30, retry: 3 },
        production: { timeout: 30, retry: 3, env: 'prod' },
      });
    });
  });

  describe('type safety', () => {
    it('supports generic type parameter for frontmatter', () => {
      interface NoteFrontmatter {
        title: string;
        tags: string[];
        published: boolean;
      }

      const markdown = `---
title: TypeScript Note
tags: [typescript, testing]
published: true
---

Content`;

      const result = frontmatterParser.parse<NoteFrontmatter>(markdown);

      // TypeScript should recognize these properties
      expect(result.frontmatter.title).toBe('TypeScript Note');
      expect(result.frontmatter.tags).toEqual(['typescript', 'testing']);
      expect(result.frontmatter.published).toBe(true);
    });
  });

  describe('singleton instance', () => {
    it('exports a singleton instance', () => {
      expect(frontmatterParser).toBeDefined();
      expect(typeof frontmatterParser.parse).toBe('function');
    });
  });
});
