// src/mcp-server/transports/core/transportRequest.ts
import type { IncomingHttpHeaders } from "http";
import type { RequestContext } from "../../../utils/index.js";

export interface McpTransportRequest {
  headers: IncomingHttpHeaders;
  body: unknown;
  context: RequestContext;
  sessionId?: string;
}
