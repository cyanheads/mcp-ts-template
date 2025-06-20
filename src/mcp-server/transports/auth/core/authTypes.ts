/**
 * @fileoverview Shared types for authentication middleware.
 * @module src/mcp-server/transports/auth/core/auth.types
 */

import type { AuthInfo as SdkAuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

/**
 * Defines the structure for authentication information derived from a token.
 * It extends the base SDK type to include common optional claims.
 */
export type AuthInfo = SdkAuthInfo & {
  subject?: string;
};

// Extend the Node.js IncomingMessage type to include an optional 'auth' property.
// This is necessary for type-safe access when attaching the AuthInfo.
declare module "http" {
  interface IncomingMessage {
    auth?: AuthInfo;
  }
}
