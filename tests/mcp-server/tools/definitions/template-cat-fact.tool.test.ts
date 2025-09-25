/**
 * @fileoverview Tests for the template-cat-fact tool.
 * @module tests/mcp-server/tools/definitions/template-cat-fact.tool.test
 */
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { catFactTool } from '../../../../src/mcp-server/tools/definitions/template-cat-fact.tool.js';
import { requestContextService } from '../../../../src/utils/index.js';

const server = setupServer(
  http.get('https://catfact.ninja/fact', () => {
    return HttpResponse.json({ fact: 'Cats are cool.', length: 13 });
  }),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('catFactTool', () => {
  it('should fetch a cat fact and return it', async () => {
    const context = requestContextService.createRequestContext();
    const result = await catFactTool.logic({}, context);

    expect(result.fact).toBe('Cats are cool.');
    expect(result.length).toBe(13);
  });
});
