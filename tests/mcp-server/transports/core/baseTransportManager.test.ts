/**
 * @fileoverview Tests for the BaseTransportManager abstract class.
 * @module tests/mcp-server/transports/core/baseTransportManager.test
 */

import { describe, it, expect, vi } from "vitest";
import { BaseTransportManager } from "../../../../src/mcp-server/transports/core/baseTransportManager.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RequestContext } from "../../../../src/utils/index.js";

// A concrete class for testing the abstract BaseTransportManager
class TestTransportManager extends BaseTransportManager {
  handleRequest(
    _req: unknown,
    _res: unknown,
    _body: unknown,
    _context: RequestContext,
    _sessionId?: string,
  ): Promise<unknown> {
    return Promise.resolve();
  }
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  // Expose the protected property for testing purposes
  public getCreateServerFn() {
    return this.createServerInstanceFn;
  }
}

describe("BaseTransportManager", () => {
  it("should correctly store the createServerInstanceFn in the constructor", () => {
    const mockCreateServerFn = vi
      .fn()
      .mockResolvedValue(new McpServer({ name: "test", version: "1" }));
    const manager = new TestTransportManager(mockCreateServerFn);

    expect(manager.getCreateServerFn()).toBe(mockCreateServerFn);
  });
});
