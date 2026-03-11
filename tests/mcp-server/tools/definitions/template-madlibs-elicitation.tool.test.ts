/**
 * @fileoverview Tests for the template-madlibs-elicitation tool (new-style API).
 * @module tests/mcp-server/tools/definitions/template-madlibs-elicitation.tool.test
 */
import { describe, expect, it, vi } from 'vitest';
import { createMockContext } from '@/testing/index.js';
import { madlibsElicitationTool } from '../../../../src/mcp-server/tools/definitions/template-madlibs-elicitation.tool.js';
import { JsonRpcErrorCode, McpError } from '../../../../src/types-global/errors.js';

describe('madlibsElicitationTool', () => {
  it('should generate a story when all inputs are provided', async () => {
    const ctx = createMockContext();
    const input = madlibsElicitationTool.input.parse({
      noun: 'cat',
      verb: 'jumped',
      adjective: 'happy',
    });
    const result = await madlibsElicitationTool.handler(input, ctx);

    expect(result.story).toBe('The happy cat jumped over the lazy dog.');
    expect(result.noun).toBe('cat');
    expect(result.verb).toBe('jumped');
    expect(result.adjective).toBe('happy');
  });

  it('should elicit a noun if it is missing', async () => {
    const mockElicit = vi.fn().mockResolvedValue({ action: 'accept', content: { value: 'robot' } });
    const ctx = createMockContext({ elicit: mockElicit });
    const input = madlibsElicitationTool.input.parse({ verb: 'danced', adjective: 'silly' });
    const result = await madlibsElicitationTool.handler(input, ctx);

    expect(mockElicit).toHaveBeenCalledWith(
      'I need a noun. Please provide one below.',
      expect.objectContaining({ _zod: expect.anything() }),
    );
    expect(result.story).toBe('The silly robot danced over the lazy dog.');
    expect(result.noun).toBe('robot');
  });

  it('should elicit all parts of speech if none are provided', async () => {
    const mockElicit = vi
      .fn()
      .mockResolvedValueOnce({ action: 'accept', content: { value: 'unicorn' } })
      .mockResolvedValueOnce({ action: 'accept', content: { value: 'flew' } })
      .mockResolvedValueOnce({ action: 'accept', content: { value: 'sparkly' } });

    const ctx = createMockContext({ elicit: mockElicit });
    const input = madlibsElicitationTool.input.parse({});
    const result = await madlibsElicitationTool.handler(input, ctx);

    expect(mockElicit).toHaveBeenCalledTimes(3);
    expect(result.story).toBe('The sparkly unicorn flew over the lazy dog.');
    expect(result.noun).toBe('unicorn');
    expect(result.verb).toBe('flew');
    expect(result.adjective).toBe('sparkly');
  });

  it('should throw an error if elicitation is not supported', async () => {
    const ctx = createMockContext(); // no elicit capability
    const input = madlibsElicitationTool.input.parse({});

    await expect(madlibsElicitationTool.handler(input, ctx)).rejects.toThrow(McpError);
    await expect(madlibsElicitationTool.handler(input, ctx)).rejects.toHaveProperty(
      'code',
      JsonRpcErrorCode.InvalidRequest,
    );
  });

  it('should throw an error if user declines elicitation', async () => {
    const mockElicit = vi.fn().mockResolvedValue({ action: 'decline' });
    const ctx = createMockContext({ elicit: mockElicit });
    const input = madlibsElicitationTool.input.parse({});

    await expect(madlibsElicitationTool.handler(input, ctx)).rejects.toThrow(McpError);
    await expect(madlibsElicitationTool.handler(input, ctx)).rejects.toHaveProperty(
      'code',
      JsonRpcErrorCode.InvalidRequest,
    );
  });

  it('should throw an error if elicited content is empty', async () => {
    const mockElicit = vi.fn().mockResolvedValue({ action: 'accept', content: { value: '' } });
    const ctx = createMockContext({ elicit: mockElicit });
    const input = madlibsElicitationTool.input.parse({});

    await expect(madlibsElicitationTool.handler(input, ctx)).rejects.toThrow(McpError);
    await expect(madlibsElicitationTool.handler(input, ctx)).rejects.toHaveProperty(
      'code',
      JsonRpcErrorCode.InvalidParams,
    );
  });

  it('should format response correctly', () => {
    const result = {
      noun: 'dragon',
      verb: 'soared',
      adjective: 'magnificent',
      story: 'The magnificent dragon soared over the lazy dog.',
    };

    const formatted = madlibsElicitationTool.format?.(result);

    expect(formatted).toHaveLength(2);
    const storyBlock = formatted![0];
    const detailsBlock = formatted![1];

    expect(storyBlock).toBeDefined();
    if (!storyBlock || storyBlock.type !== 'text') throw new Error('Expected text block');
    expect(storyBlock.text).toBe('The magnificent dragon soared over the lazy dog.');

    expect(detailsBlock).toBeDefined();
    if (!detailsBlock || detailsBlock.type !== 'text') throw new Error('Expected text block');
    const details = JSON.parse(detailsBlock.text);
    expect(details.noun).toBe('dragon');
    expect(details.verb).toBe('soared');
    expect(details.adjective).toBe('magnificent');
  });
});
