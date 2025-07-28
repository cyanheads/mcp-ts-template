/**
 * @fileoverview Tests for the HTTP error handler.
 * @module tests/mcp-server/transports/http/httpErrorHandler.test
 */

import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { httpErrorHandler } from "../../../../src/mcp-server/transports/http/httpErrorHandler.js";
import { BaseErrorCode, McpError } from "../../../../src/types-global/errors.js";

describe("httpErrorHandler", () => {
  let app: Hono;

  const setupApp = (errorToThrow: Error) => {
    app = new Hono();
    app.get("/test", () => {
      throw errorToThrow;
    });
    app.post("/test", () => {
      throw errorToThrow;
    });
    app.onError(httpErrorHandler);
  };

  it("should return a 500 status for a generic Error", async () => {
    setupApp(new Error("Generic error"));
    const req = new Request("http://localhost/test");
    const res = await app.request(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe(BaseErrorCode.INTERNAL_ERROR);
    expect(body.error.message).toContain("Generic error");
  });

  it("should return a 404 status for a NOT_FOUND McpError", async () => {
    setupApp(new McpError(BaseErrorCode.NOT_FOUND, "Resource not found"));
    const req = new Request("http://localhost/test");
    const res = await app.request(req);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe(BaseErrorCode.NOT_FOUND);
  });

  it("should return a 401 status for an UNAUTHORIZED McpError", async () => {
    setupApp(new McpError(BaseErrorCode.UNAUTHORIZED, "Unauthorized"));
    const req = new Request("http://localhost/test");
    const res = await app.request(req);
    expect(res.status).toBe(401);
  });

  it("should return a 403 status for a FORBIDDEN McpError", async () => {
    setupApp(new McpError(BaseErrorCode.FORBIDDEN, "Forbidden"));
    const req = new Request("http://localhost/test");
    const res = await app.request(req);
    expect(res.status).toBe(403);
  });

  it("should return a 400 status for a VALIDATION_ERROR McpError", async () => {
    setupApp(new McpError(BaseErrorCode.VALIDATION_ERROR, "Invalid input"));
    const req = new Request("http://localhost/test");
    const res = await app.request(req);
    expect(res.status).toBe(400);
  });

  it("should return a 409 status for a CONFLICT McpError", async () => {
    setupApp(new McpError(BaseErrorCode.CONFLICT, "Conflict"));
    const req = new Request("http://localhost/test");
    const res = await app.request(req);
    expect(res.status).toBe(409);
  });

  it("should return a 429 status for a RATE_LIMITED McpError", async () => {
    setupApp(new McpError(BaseErrorCode.RATE_LIMITED, "Too many requests"));
    const req = new Request("http://localhost/test");
    const res = await app.request(req);
    expect(res.status).toBe(429);
  });

  it("should include the request id in the error response if available in the body", async () => {
    setupApp(new Error("Generic error"));
    const req = new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "12345" }),
    });
    const res = await app.request(req);
    const body = await res.json();
    expect(body.id).toBe("12345");
  });

  it("should handle cases where the request body is not valid JSON", async () => {
    setupApp(new Error("Generic error"));
    const req = new Request("http://localhost/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await app.request(req);
    const body = await res.json();
    expect(body.id).toBeNull();
  });
});
