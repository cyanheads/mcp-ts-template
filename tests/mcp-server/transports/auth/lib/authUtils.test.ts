/**
 * @fileoverview Tests for the authorization utility function `withRequiredScopes`.
 * @module tests/mcp-server/transports/auth/lib/authUtils.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { authContext } from "../../../../../src/mcp-server/transports/auth/lib/authContext.js";
import type { AuthInfo } from "../../../../../src/mcp-server/transports/auth/lib/authTypes.js";
import { withRequiredScopes } from "../../../../../src/mcp-server/transports/auth/lib/authUtils.js";

// Mock logger to prevent console output during tests
vi.mock("../../../../../src/utils/internal/logger.js", () => ({
  logger: {
    warning: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    crit: vi.fn(), // Add missing crit method
  },
}));

describe("withRequiredScopes", () => {
  const mockAuthInfo: AuthInfo = {
    clientId: "test-client",
    scopes: ["read:data", "write:data", "delete:data"],
    subject: "user-123",
    token: "dummy-token",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not throw an error when all required scopes are present", () => {
    const requiredScopes = ["read:data", "write:data"];
    const testFunction = () => {
      authContext.run({ authInfo: mockAuthInfo }, () => {
        withRequiredScopes(requiredScopes);
      });
    };
    expect(testFunction).not.toThrow();
  });

  it("should not throw an error when no scopes are required", () => {
    const requiredScopes: string[] = [];
    const testFunction = () => {
      authContext.run({ authInfo: mockAuthInfo }, () => {
        withRequiredScopes(requiredScopes);
      });
    };
    expect(testFunction).not.toThrow();
  });
});
