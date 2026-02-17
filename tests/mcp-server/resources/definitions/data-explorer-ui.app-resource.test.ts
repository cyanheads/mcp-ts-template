/**
 * @fileoverview Tests for the data explorer UI app resource definition.
 * @module tests/mcp-server/resources/definitions/data-explorer-ui.app-resource.test
 */
import { describe, it, expect } from 'vitest';
import { RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';

import { dataExplorerUiResource } from '../../../../src/mcp-server/resources/definitions/data-explorer-ui.app-resource.js';
import { requestContextService } from '../../../../src/utils/index.js';

describe('dataExplorerUiResource', () => {
  it('has the correct name, title, and description', () => {
    expect(dataExplorerUiResource.name).toBe('data-explorer-ui');
    expect(dataExplorerUiResource.title).toBe('Data Explorer UI');
    expect(dataExplorerUiResource.description).toContain(
      'Interactive HTML app',
    );
  });

  it('uses the MCP Apps MIME type', () => {
    expect(dataExplorerUiResource.mimeType).toBe(RESOURCE_MIME_TYPE);
  });

  it('has a readOnly annotation', () => {
    expect(dataExplorerUiResource.annotations?.readOnlyHint).toBe(true);
  });

  it('uses the correct URI template', () => {
    expect(dataExplorerUiResource.uriTemplate).toBe(
      'ui://template-data-explorer/app.html',
    );
  });

  describe('logic', () => {
    it('returns HTML content containing the Data Explorer markup', async () => {
      const uri = new URL('ui://template-data-explorer/app.html');
      const params = {};
      const context = requestContextService.createRequestContext();
      // logic is wrapped with withResourceAuth → returns Promise<string>
      const result = (await dataExplorerUiResource.logic(
        uri,
        params,
        context,
      )) as string;

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

      // list() may return a Promise per ResourceDefinition type
      const result = await dataExplorerUiResource.list!(mockExtra);
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0]).toMatchObject({
        uri: 'ui://template-data-explorer/app.html',
        name: 'Data Explorer App',
      });
      expect(result.resources[0]!.mimeType).toBe(RESOURCE_MIME_TYPE);
    });
  });

  describe('responseFormatter', () => {
    it('formats HTML result into a resource content block', () => {
      const html = '<html>test</html>';
      const meta = {
        uri: new URL('ui://template-data-explorer/app.html'),
        mimeType: RESOURCE_MIME_TYPE,
      };
      const blocks = dataExplorerUiResource.responseFormatter!(html, meta);

      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        uri: 'ui://template-data-explorer/app.html',
        mimeType: RESOURCE_MIME_TYPE,
        text: html,
      });
    });
  });
});
