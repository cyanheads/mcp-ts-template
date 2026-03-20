/**
 * @fileoverview HTTP request helpers and JWT generation for integration tests.
 * @module tests/integration/helpers/http-helpers
 */
import { createHmac } from 'node:crypto';

/** Standard headers for MCP HTTP requests. */
export const MCP_HEADERS = {
  Accept: 'application/json, text/event-stream',
  'Content-Type': 'application/json',
} as const;

/** Creates a JSON-RPC request body. */
export function jsonrpc(id: number, method: string, params: Record<string, unknown> = {}): string {
  return JSON.stringify({ jsonrpc: '2.0', id, method, params });
}

/** Creates the initialize request body. */
export function initializeBody(id = 1, protocolVersion = '2025-06-18'): string {
  return jsonrpc(id, 'initialize', {
    protocolVersion,
    capabilities: {},
    clientInfo: { name: 'integration-test', version: '1.0.0' },
  });
}

/**
 * Generates a HS256 JWT for testing. Uses raw crypto — no external dependency.
 */
export function generateTestJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSeconds = 300,
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const b64url = (data: unknown) => Buffer.from(JSON.stringify(data)).toString('base64url');

  const headerB64 = b64url(header);
  const payloadB64 = b64url(fullPayload);
  const signature = createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Parses an SSE event stream response body into individual events.
 */
export function parseSSEEvents(body: string): Array<{ data: string; event?: string | undefined }> {
  const events: Array<{ data: string; event?: string | undefined }> = [];
  const blocks = body.split('\n\n').filter(Boolean);

  for (const block of blocks) {
    let event: string | undefined;
    const dataLines: string[] = [];

    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (dataLines.length > 0) {
      events.push({ data: dataLines.join('\n'), event });
    }
  }

  return events;
}
