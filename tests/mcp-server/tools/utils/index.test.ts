/**
 * @fileoverview Test suite for tool utilities barrel export
 * @module tests/mcp-server/tools/utils/index.test
 */

import { describe, expect, it } from 'vitest';

describe('Tool Utilities Barrel Export', () => {
  it('should export createMcpToolHandler', async () => {
    const mod = await import('@/mcp-server/tools/utils/index.js');
    expect(mod.createMcpToolHandler).toBeDefined();
    expect(typeof mod.createMcpToolHandler).toBe('function');
  });

  it('should re-export ToolDefinition type via module structure', async () => {
    // Type exports aren't available at runtime, but we verify
    // the module loads without errors and has expected runtime exports
    const mod = await import('@/mcp-server/tools/utils/index.js');
    expect(Object.keys(mod)).toContain('createMcpToolHandler');
  });
});
