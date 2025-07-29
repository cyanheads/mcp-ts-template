/**
 * @fileoverview Tests for the authorization utility function `withRequiredScopes`.
 * @module tests/mcp-server/transports/auth/lib/authUtils.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { authContext } from "../../../../../src/mcp-server/transports/auth/lib/authContext.js";
import type { AuthInfo } from "../../../../../src/mcp-server/transports/auth/lib/authTypes.js";
import { withRequiredScopes } from "../../../../../src/mcp-server/transports/auth/lib/authUtils.js";
import {
  BaseErrorCode,
  McpError,
} from "../../../../../src/types-global/errors.js";

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

  it("should throw a FORBIDDEN McpError if a required scope is missing", () => {
    const requiredScopes = ["read:data", "admin:access"];
    const testFunction = () => {
      authContext.run({ authInfo: mockAuthInfo }, () => {
        withRequiredScopes(requiredScopes);
      });
    };

    expect(testFunction).toThrow(McpError);
    try {
      testFunction();
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.FORBIDDEN);
      expect(mcpError.message).toContain("Insufficient permissions");
      // Use toMatchObject for flexible detail checking
      expect(mcpError.details).toMatchObject({
        requiredScopes,
        missingScopes: ["admin:access"],
        grantedScopes: mockAuthInfo.scopes,
      });
    }
  });

  it("should throw a FORBIDDEN McpError if multiple required scopes are missing", () => {
    const requiredScopes = ["admin:access", "system:config"];
    const testFunction = () => {
      authContext.run({ authInfo: mockAuthInfo }, () => {
        withRequiredScopes(requiredScopes);
      });
    };

    expect(testFunction).toThrow(McpError);
    try {
      testFunction();
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.FORBIDDEN);
      expect(mcpError.message).toContain("Insufficient permissions");
      expect(mcpError.details).toMatchObject({
        requiredScopes,
        missingScopes: ["admin:access", "system:config"],
        grantedScopes: mockAuthInfo.scopes,
      });
    }
  });

  it("should throw an INTERNAL_ERROR McpError if the auth context is not available", () => {
    const requiredScopes = ["read:data"];
    const testFunction = () => {
      withRequiredScopes(requiredScopes);
    };

    expect(testFunction).toThrow(McpError);
    try {
      testFunction();
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.INTERNAL_ERROR);
      expect(mcpError.message).toContain("Authentication context is missing");
    }
  });
});
