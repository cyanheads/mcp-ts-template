import { describe, it, expect } from "vitest";
import { sanitization } from "../../../src/utils/security/sanitization";
import { McpError, BaseErrorCode } from "../../../src/types-global/errors";

describe("Sanitization Utility", () => {
  describe("sanitizeHtml", () => {
    it("should remove <script> tags and other malicious HTML", () => {
      const maliciousInput =
        '<script>alert("xss")</script><p>Hello</p><iframe src="http://example.com"></iframe>';
      const expectedOutput = "<p>Hello</p>";
      expect(sanitization.sanitizeHtml(maliciousInput)).toBe(expectedOutput);
    });

    it("should allow safe HTML tags like <p> and <b>", () => {
      const safeInput = "<p>This is a <b>bold</b> statement.</p>";
      expect(sanitization.sanitizeHtml(safeInput)).toBe(safeInput);
    });

    it("should return an empty string for null or undefined input", () => {
      expect(sanitization.sanitizeHtml(null as unknown as string)).toBe("");
      expect(sanitization.sanitizeHtml(undefined as unknown as string)).toBe(
        "",
      );
    });
  });

  describe("sanitizeString", () => {
    it('should handle "text" context by stripping all HTML', () => {
      const input = "<p>Hello World</p>";
      const expected = "Hello World";
      expect(sanitization.sanitizeString(input, { context: "text" })).toBe(
        expected,
      );
    });

    it('should handle "html" context correctly', () => {
      const maliciousInput = '<script>alert("xss")</script><p>Hello</p>';
      const expected = "<p>Hello</p>";
      expect(
        sanitization.sanitizeString(maliciousInput, { context: "html" }),
      ).toBe(expected);
    });

    it('should handle "url" context and return empty for invalid URLs', () => {
      const validInput = "https://example.com/path";
      const invalidUrl = 'javascript:alert("xss")';
      expect(sanitization.sanitizeString(validInput, { context: "url" })).toBe(
        validInput,
      );
      expect(sanitization.sanitizeString(invalidUrl, { context: "url" })).toBe(
        "",
      );
    });

    it('should throw an McpError when context is "javascript"', () => {
      const jsInput = 'alert("hello")';
      expect(() =>
        sanitization.sanitizeString(jsInput, { context: "javascript" }),
      ).toThrow(McpError);
      expect(() =>
        sanitization.sanitizeString(jsInput, { context: "javascript" }),
      ).toThrow(
        expect.objectContaining({ code: BaseErrorCode.VALIDATION_ERROR }),
      );
    });
  });

  describe("sanitizePath", () => {
    it("should prevent path traversal with ../ by normalizing", () => {
      const traversalPath = "a/b/../c";
      const result = sanitization.sanitizePath(traversalPath);
      expect(result.sanitizedPath).toBe("a/c");
    });

    it("should throw an error for paths containing null bytes (\\0)", () => {
      const nullBytePath = "/path/to/file\0.txt";
      expect(() => sanitization.sanitizePath(nullBytePath)).toThrow(McpError);
      expect(() => sanitization.sanitizePath(nullBytePath)).toThrow(
        expect.objectContaining({
          code: BaseErrorCode.VALIDATION_ERROR,
          message: "Path contains null byte, which is disallowed.",
        }),
      );
    });

    it("should respect the rootDir option and throw if path escapes it", () => {
      const rootDir = "/app/safe-zone";
      const validPath = "data/file.txt";
      // This path attempts to go up one level from the root.
      const invalidPath = "../outside.txt";

      // The sanitized path should be relative to the rootDir.
      expect(
        sanitization.sanitizePath(validPath, { rootDir }).sanitizedPath,
      ).toBe("data/file.txt");

      // This should throw because it tries to leave the root directory.
      expect(() => sanitization.sanitizePath(invalidPath, { rootDir })).toThrow(
        McpError,
      );
    });

    it("should handle absolute paths correctly based on the allowAbsolute option", () => {
      const absolutePath = "/etc/passwd";
      // By default, absolute paths are not allowed and should throw.
      expect(() =>
        sanitization.sanitizePath(absolutePath, { allowAbsolute: false }),
      ).toThrow(McpError);
      // When allowed, the path should be returned as is.
      expect(
        sanitization.sanitizePath(absolutePath, { allowAbsolute: true })
          .sanitizedPath,
      ).toBe(absolutePath);
    });
  });

  describe("sanitizeForLogging", () => {
    it('should redact sensitive keys like "password", "token", and "apiKey" in a flat object', () => {
      const sensitiveObject = {
        username: "test",
        password: "my-secret-password",
        session_token: "abc-123",
        secretKey: "xyz-789",
      };
      const sanitized = sanitization.sanitizeForLogging(
        sensitiveObject,
      ) as Record<string, unknown>;
      expect((sanitized as Record<string, string>).password).toBe("[REDACTED]");
      expect(sanitized.session_token).toBe("[REDACTED]");
      expect(sanitized.secretKey).toBe("[REDACTED]");
      expect(sanitized.username).toBe("test");
    });

    it("should redact sensitive keys in a deeply nested object", () => {
      const sensitiveObject = {
        user: "casey",
        credentials: {
          password: "my-secret-password",
          session_token: "abc-123-def-456",
        },
        nonSensitive: "data",
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sanitized = sanitization.sanitizeForLogging(
        sensitiveObject,
      ) as Record<string, any>;
      expect(sanitized.credentials.password).toBe("[REDACTED]");
      expect(sanitized.credentials.session_token).toBe("[REDACTED]");
      expect(sanitized.nonSensitive).toBe("data");
    });

    it("should not modify non-sensitive keys", () => {
      const nonSensitive = { user: "casey", id: 123 };
      const sanitized = sanitization.sanitizeForLogging(nonSensitive);
      expect(sanitized).toEqual(nonSensitive);
    });

    it("should handle arrays of objects correctly", () => {
      const sensitiveArray = [
        { user: "a", password: "123" },
        { user: "b", apiKey: "456" },
      ];
      const sanitized = sanitization.sanitizeForLogging(
        sensitiveArray,
      ) as Record<string, unknown>[];
      expect(sanitized[0].password).toBe("[REDACTED]");
      expect(sanitized[1].apiKey).toBe("[REDACTED]");
      expect(sanitized[0].user).toBe("a");
    });
  });

  // Adding tests for other public methods to ensure full coverage
  describe("sanitizeUrl", () => {
    it("should return a valid URL", () => {
      const url = "https://example.com";
      expect(sanitization.sanitizeUrl(url)).toBe(url);
    });

    it("should throw for invalid URL", () => {
      const url = "not-a-url";
      expect(() => sanitization.sanitizeUrl(url)).toThrow(McpError);
    });

    it("should throw for disallowed protocols", () => {
      const url = "ftp://example.com";
      expect(() => sanitization.sanitizeUrl(url)).toThrow(McpError);
    });
  });

  describe("sanitizeJson", () => {
    it("should parse a valid JSON string", () => {
      const json = '{"key": "value"}';
      expect(sanitization.sanitizeJson(json)).toEqual({ key: "value" });
    });

    it("should throw for an invalid JSON string", () => {
      const json = '{"key": "value"';
      expect(() => sanitization.sanitizeJson(json)).toThrow(McpError);
    });

    it("should throw if JSON size exceeds maxSize", () => {
      const json = '{"key": "value"}';
      expect(() => sanitization.sanitizeJson(json, 5)).toThrow(McpError);
    });
  });

  describe("sanitizeNumber", () => {
    it("should return a valid number", () => {
      expect(sanitization.sanitizeNumber(123)).toBe(123);
      expect(sanitization.sanitizeNumber("123.45")).toBe(123.45);
    });

    it("should throw for an invalid number string", () => {
      expect(() => sanitization.sanitizeNumber("abc")).toThrow(McpError);
    });

    it("should clamp number to min/max range", () => {
      expect(sanitization.sanitizeNumber(5, 10, 20)).toBe(10);
      expect(sanitization.sanitizeNumber(25, 10, 20)).toBe(20);
    });
  });
});
