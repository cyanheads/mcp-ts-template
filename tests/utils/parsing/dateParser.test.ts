/**
 * @fileoverview Unit tests for the date parsing utilities powered by chrono-node.
 * @module tests/utils/parsing/dateParser.test
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as chrono from 'chrono-node';

import { JsonRpcErrorCode } from '../../../src/types-global/errors.js';
import {
  parseDateString,
  parseDateStringDetailed,
} from '../../../src/utils/parsing/dateParser.js';

const context = {
  requestId: 'date-parser-test',
  timestamp: new Date().toISOString(),
};

const chronoMock = chrono as unknown as {
  parseDate: ReturnType<typeof vi.fn>;
  parse: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  chronoMock.parseDate.mockReset();
  chronoMock.parse.mockReset();
  chronoMock.parseDate.mockReturnValue(null);
  chronoMock.parse.mockReturnValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('parseDateString', () => {
  it('converts natural language text into a Date instance when chrono parses successfully', async () => {
    const expectedDate = new Date('2030-12-25T10:00:00.000Z');
    chronoMock.parseDate.mockReturnValue(expectedDate);

    const result = await parseDateString('December 25, 2030 10:00', context);

    expect(result).toEqual(expectedDate);
    expect(chronoMock.parseDate).toHaveBeenCalledWith(
      'December 25, 2030 10:00',
      undefined,
      { forwardDate: true },
    );
  });

  it('returns null when the text cannot be parsed', async () => {
    chronoMock.parseDate.mockReturnValue(null);

    const result = await parseDateString('definitely not a date', context);
    expect(result).toBeNull();
  });
});

describe('parseDateStringDetailed', () => {
  it('returns the detailed chrono parse results', async () => {
    const parsedResults = [
      {
        text: '2024-11-05',
        start: { date: () => new Date('2024-11-05T12:00:00.000Z') },
      },
    ];
    chronoMock.parse.mockReturnValue(parsedResults as never);

    const results = await parseDateStringDetailed(
      'The meeting is on 2024-11-05 at noon',
      context,
    );

    expect(results).toBe(parsedResults);
    expect(chronoMock.parse).toHaveBeenCalledWith(
      'The meeting is on 2024-11-05 at noon',
      undefined,
      { forwardDate: true },
    );
  });

  it('wraps unexpected errors in an McpError', async () => {
    chronoMock.parse.mockImplementation(() => {
      throw new Error('chrono blew up');
    });

    await expect(
      parseDateStringDetailed('tomorrow at 9', context),
    ).rejects.toMatchObject({
      code: JsonRpcErrorCode.ParseError,
      message: expect.stringContaining('parseDateStringDetailed'),
    });
  });
});
