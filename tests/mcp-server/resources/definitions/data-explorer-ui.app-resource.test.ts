/**
 * @fileoverview Tests for the data explorer UI app resource definition (new-style resource() builder).
 * @module tests/mcp-server/resources/definitions/data-explorer-ui.app-resource.test
 */

import { RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { describe, expect, it } from 'vitest';
import { createMockContext } from '@/testing/index.js';
import { dataExplorerUiResource } from '../../../../src/mcp-server/resources/definitions/data-explorer-ui.app-resource.js';

describe('dataExplorerUiResource', () => {
  it('has the correct name, title, and description', () => {
    expect(dataExplorerUiResource.name).toBe('data-explorer-ui');
    expect(dataExplorerUiResource.title).toBe('Data Explorer UI');
    expect(dataExplorerUiResource.description).toContain('Interactive HTML app');
  });

  it('uses the MCP Apps MIME type', () => {
    expect(dataExplorerUiResource.mimeType).toBe(RESOURCE_MIME_TYPE);
  });

  it('has an audience annotation', () => {
    expect(dataExplorerUiResource.annotations?.audience).toEqual(['user']);
  });

  it('uses the correct URI template', () => {
    expect(dataExplorerUiResource.uriTemplate).toBe('ui://template-data-explorer/app.html');
  });

  describe('handler', () => {
    it('returns HTML content containing the Data Explorer markup', async () => {
      const uri = new URL('ui://template-data-explorer/app.html');
      const ctx = createMockContext({ uri });
      const result = (await dataExplorerUiResource.handler({}, ctx)) as string;

      expect(typeof result).toBe('string');
      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('Data Explorer');
      expect(result).toContain('app.connect()');
    });
  });

  describe('list', () => {
    it('returns a single resource entry for discovery', async () => {
      const mockExtra = {
        signal: new AbortController().signal,
        _meta: {},
      } as any;

      const result = await dataExplorerUiResource.list?.(mockExtra);
      expect(result!.resources).toHaveLength(1);
      expect(result!.resources[0]).toMatchObject({
        uri: 'ui://template-data-explorer/app.html',
        name: 'Data Explorer App',
      });
      expect(result!.resources[0]?.mimeType).toBe(RESOURCE_MIME_TYPE);
    });
  });

  describe('format', () => {
    it('formats HTML result into a resource content block', () => {
      const html = '<html>test</html>';
      const meta = {
        uri: new URL('ui://template-data-explorer/app.html'),
        mimeType: RESOURCE_MIME_TYPE,
      };
      const blocks = dataExplorerUiResource.format?.(html, meta);

      expect(blocks).toHaveLength(1);
      expect(blocks![0]).toMatchObject({
        uri: 'ui://template-data-explorer/app.html',
        mimeType: RESOURCE_MIME_TYPE,
        text: html,
      });
    });
  });
});
