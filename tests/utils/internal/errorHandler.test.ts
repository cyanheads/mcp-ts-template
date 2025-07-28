import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErrorHandler } from "../../../src/utils/internal/errorHandler";
import { logger } from "../../../src/utils/internal/logger";
import { McpError, BaseErrorCode } from "../../../src/types-global/errors";

// Mock the logger module
vi.mock("../../../src/utils/internal/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("ErrorHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("determineErrorCode", () => {
    it("should return the code from an McpError instance", () => {
      const err = new McpError(BaseErrorCode.FORBIDDEN, "test");
      expect(ErrorHandler.determineErrorCode(err)).toBe(
        BaseErrorCode.FORBIDDEN,
      );
    });

    it("should return VALIDATION_ERROR for a TypeError", () => {
      const err = new TypeError("test");
      expect(ErrorHandler.determineErrorCode(err)).toBe(
        BaseErrorCode.VALIDATION_ERROR,
      );
    });

    it('should return NOT_FOUND for an error message containing "not found"', () => {
      const err = new Error("Item not found");
      expect(ErrorHandler.determineErrorCode(err)).toBe(
        BaseErrorCode.NOT_FOUND,
      );
    });

    it("should default to INTERNAL_ERROR for an unknown error", () => {
      const err = new Error("Something weird happened");
      expect(ErrorHandler.determineErrorCode(err)).toBe(
        BaseErrorCode.INTERNAL_ERROR,
      );
    });

    it.each([
      ["unauthorized access", BaseErrorCode.UNAUTHORIZED],
      ["access denied", BaseErrorCode.FORBIDDEN],
      ["item not found", BaseErrorCode.NOT_FOUND],
      ["validation failed", BaseErrorCode.VALIDATION_ERROR],
      ["duplicate key", BaseErrorCode.CONFLICT],
      ["rate limit exceeded", BaseErrorCode.RATE_LIMITED],
      ["request timed out", BaseErrorCode.TIMEOUT],
      ["service unavailable", BaseErrorCode.SERVICE_UNAVAILABLE],
    ])("should map '%s' to %s", (message, code) => {
      const err = new Error(message);
      expect(ErrorHandler.determineErrorCode(err)).toBe(code);
    });
  });

  describe("handleError", () => {
    it("should call logger.error with a structured payload", () => {
      const error = new Error("Something went wrong");
      const options = {
        operation: "testOperation",
        input: { password: "test" },
      };

      ErrorHandler.handleError(error, options);

      expect(logger.error).toHaveBeenCalledOnce();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [logMessage, logPayload] = (logger.error as any).mock.calls[0];

      expect(logMessage).toContain(
        "Error in testOperation: Something went wrong",
      );
      expect(logPayload).toHaveProperty("operation", "testOperation");
      expect(logPayload.input.password).toBe("[REDACTED]"); // Verify sanitization
      expect(logPayload).toHaveProperty("errorCode");
    });

    it("should return a new McpError instance", () => {
      const error = new Error("generic error");
      const handledError = ErrorHandler.handleError(error, {
        operation: "test",
      });
      expect(handledError).toBeInstanceOf(McpError);
    });

    it("should include sanitized input in the log payload", () => {
      const error = new Error("test");
      ErrorHandler.handleError(error, {
        operation: "op",
        input: { apiKey: "123" },
      });
      expect(logger.error).toHaveBeenCalledOnce();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [, logPayload] = (logger.error as any).mock.calls[0];
      expect(logPayload.input.apiKey).toBe("[REDACTED]");
    });

    it("should rethrow the error if rethrow is true", () => {
      const error = new Error("test");
      expect(() =>
        ErrorHandler.handleError(error, { operation: "op", rethrow: true }),
      ).toThrow(McpError);
    });

    it("should use an explicit error code if provided", () => {
      const error = new Error("test");
      const handledError = ErrorHandler.handleError(error, {
        operation: "op",
        errorCode: BaseErrorCode.NOT_FOUND,
      }) as McpError;
      expect(handledError.code).toBe(BaseErrorCode.NOT_FOUND);
    });

    it("should use a custom error mapper if provided", () => {
      const error = new Error("test");
      class CustomError extends Error {}
      const handledError = ErrorHandler.handleError(error, {
        operation: "op",
        errorMapper: (e) => new CustomError((e as Error).message),
      });
      expect(handledError).toBeInstanceOf(CustomError);
    });
  });

  describe("mapError", () => {
    const mappings = [
      {
        pattern: /not found/i,
        errorCode: BaseErrorCode.NOT_FOUND,
        factory: (e: unknown) =>
          new McpError(BaseErrorCode.NOT_FOUND, (e as Error).message),
      },
    ];

    it("should map an error based on the provided rules", () => {
      const error = new Error("Item not found");
      const mappedError = ErrorHandler.mapError(error, mappings) as McpError;
      expect(mappedError).toBeInstanceOf(McpError);
      expect(mappedError.code).toBe(BaseErrorCode.NOT_FOUND);
    });

    it("should return the original error if no mapping matches", () => {
      const error = new Error("Some other error");
      const mappedError = ErrorHandler.mapError(error, mappings);
      expect(mappedError).toBe(error);
    });

    it("should use the default factory if no mapping matches", () => {
      const error = new Error("Some other error");
      const defaultFactory = (e: unknown) =>
        new McpError(BaseErrorCode.UNKNOWN_ERROR, (e as Error).message);
      const mappedError = ErrorHandler.mapError(
        error,
        mappings,
        defaultFactory,
      ) as McpError;
      expect(mappedError.code).toBe(BaseErrorCode.UNKNOWN_ERROR);
    });
  });

  describe("formatError", () => {
    it("should format an McpError correctly", () => {
      const error = new McpError(BaseErrorCode.FORBIDDEN, "Access denied", {
        detail: "test",
      });
      const formatted = ErrorHandler.formatError(error);
      expect(formatted).toEqual({
        code: BaseErrorCode.FORBIDDEN,
        message: "Access denied",
        details: { detail: "test" },
      });
    });

    it("should format a standard Error correctly", () => {
      const error = new Error("Not found");
      const formatted = ErrorHandler.formatError(error);
      expect(formatted).toEqual({
        code: BaseErrorCode.NOT_FOUND,
        message: "Not found",
        details: { errorType: "Error" },
      });
    });

    it("should format a non-error value correctly", () => {
      const formatted = ErrorHandler.formatError("a string error");
      expect(formatted).toEqual({
        code: BaseErrorCode.UNKNOWN_ERROR,
        message: "a string error",
        details: { errorType: "stringEncountered" },
      });
    });
  });

  describe("tryCatch", () => {
    it("should return the result of the function on success", async () => {
      const successFn = async () => "success";
      const result = await ErrorHandler.tryCatch(successFn, {
        operation: "test",
      });
      expect(result).toBe("success");
    });

    it("should re-throw the handled error on failure", async () => {
      const error = new Error("failure");
      const failFn = async () => {
        throw error;
      };

      await expect(
        ErrorHandler.tryCatch(failFn, { operation: "test" }),
      ).rejects.toThrow(McpError);
      expect(logger.error).toHaveBeenCalledOnce();
    });
  });
});
