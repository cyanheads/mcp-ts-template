/**
 * @fileoverview Test suite for stdio transport barrel export
 * @module tests/mcp-server/transports/stdio/index.test
 */

import { describe, expect, it } from 'vitest';

describe('Stdio Transport Barrel Export', () => {
  it('should export startStdioTransport', async () => {
    const mod = await import('@/mcp-server/transports/stdio/index.js');
    expect(mod.startStdioTransport).toBeDefined();
    expect(typeof mod.startStdioTransport).toBe('function');
  });
});
