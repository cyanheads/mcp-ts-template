/**
 * @fileoverview Tests for the authorization utility functions.
 * @module tests/mcp-server/transports/auth/lib/authUtils.test
 */

import { describe, it, expect } from "vitest";
import { withRequiredScopes } from "../../../../../src/mcp-server/transports/auth/lib/authUtils.js";
import { authContext } from "../../../../../src/mcp-server/transports/auth/lib/authContext.js";
import { McpError, BaseErrorCode } from "../../../../../src/types-global/errors.js";
import { type AuthInfo } from "../../../../../src/mcp-server/transports/auth/lib/authTypes.js";

describe("withRequiredScopes", () => {
  const mockAuthInfo = (scopes: string[]): AuthInfo => ({
    clientId: "test-client",
    subject: "test-user",
    scopes,
    token: "mock-token",
  });

  it("should not throw an error if all required scopes are present", () => {
    const requiredScopes = ["read:data", "write:data"];
    const authInfo = mockAuthInfo(["read:data", "write:data", "delete:data"]);

    expect(() => {
      authContext.run({ authInfo }, () => {
        withRequiredScopes(requiredScopes);
      });
    }).not.toThrow();
  });

  it("should not throw an error if required scopes are empty", () => {
    const requiredScopes: string[] = [];
    const authInfo = mockAuthInfo(["read:data"]);

    expect(() => {
      authContext.run({ authInfo }, () => {
        withRequiredScopes(requiredScopes);
      });
    }).not.toThrow();
  });

  it("should throw a FORBIDDEN error if some required scopes are missing", () => {
    const requiredScopes = ["read:data", "write:data", "admin:access"];
    const authInfo = mockAuthInfo(["read:data", "write:data"]);

    expect(() => {
      authContext.run({ authInfo }, () => {
        withRequiredScopes(requiredScopes);
      });
    }).toThrow(McpError);

    try {
      authContext.run({ authInfo }, () => {
        withRequiredScopes(requiredScopes);
      });
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.FORBIDDEN);
      expect(mcpError.message).toContain("Insufficient permissions");
      expect(mcpError.message).toContain("admin:access");
      expect(mcpError.details).toEqual({
        requiredScopes,
        missingScopes: ["admin:access"],
      });
    }
  });

  it("should throw a FORBIDDEN error if all required scopes are missing", () => {
    const requiredScopes = ["admin:access", "super:user"];
    const authInfo = mockAuthInfo(["read:data", "write:data"]);

    expect(() => {
      authContext.run({ authInfo }, () => {
        withRequiredScopes(requiredScopes);
      });
    }).toThrow(McpError);

    try {
      authContext.run({ authInfo }, () => {
        withRequiredScopes(requiredScopes);
      });
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.FORBIDDEN);
      expect(mcpError.details).toEqual({
        requiredScopes,
        missingScopes: ["admin:access", "super:user"],
      });
    }
  });

  it("should throw an INTERNAL_ERROR if authContext store is not found", () => {
    const requiredScopes = ["read:data"];

    expect(() => {
      withRequiredScopes(requiredScopes);
    }).toThrow(McpError);

    try {
      withRequiredScopes(requiredScopes);
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.INTERNAL_ERROR);
      expect(mcpError.message).toContain("Authentication context is missing");
    }
  });

  it("should throw an INTERNAL_ERROR if authInfo is missing from the store", () => {
    const requiredScopes = ["read:data"];

    expect(() => {
      authContext.run({ authInfo: undefined as unknown as AuthInfo }, () => {
        withRequiredScopes(requiredScopes);
      });
    }).toThrow(McpError);

    try {
      authContext.run({ authInfo: undefined as unknown as AuthInfo }, () => {
        withRequiredScopes(requiredScopes);
      });
    } catch (error) {
      const mcpError = error as McpError;
      expect(mcpError.code).toBe(BaseErrorCode.INTERNAL_ERROR);
      expect(mcpError.message).toContain("Authentication context is missing");
    }
  });
});
