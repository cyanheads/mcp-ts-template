/**
 * @fileoverview Tests for the Logger utility.
 * @module tests/utils/internal/logger.test
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Logger } from "../../../src/utils/internal/logger";

const mockLog = vi.fn();
const mockAdd = vi.fn();
const mockRemove = vi.fn();
const mockInfo = vi.fn();

const mockWinstonLogger = {
  log: mockLog,
  add: mockAdd,
  remove: mockRemove,
  info: mockInfo,
  transports: [],
};

vi.mock("winston", async () => {
  const actualWinston = await vi.importActual("winston");
  return {
    ...actualWinston,
    createLogger: vi.fn(() => mockWinstonLogger),
    transports: {
      File: vi.fn(),
      Console: vi.fn(),
    },
    format: {
      combine: vi.fn(() => ({})),
      colorize: vi.fn(() => ({})),
      timestamp: vi.fn(() => ({})),
      printf: vi.fn(() => ({})),
      errors: vi.fn(() => ({})),
      json: vi.fn(() => ({})),
    },
  };
});

describe("Logger", () => {
  let loggerInstance: Logger;
  let winston: typeof import("winston");

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Dynamically import winston to get the mocked version
    winston = await import("winston");

    const { Logger: FreshLogger } = await import(
      "../../../src/utils/internal/logger"
    );
    loggerInstance = FreshLogger.getInstance();
    await loggerInstance.initialize("debug");
  });

  it("should be a singleton within a single module context", () => {
    const anotherInstance = Logger.getInstance();
    expect(loggerInstance).toBe(anotherInstance);
  });

  it("should initialize correctly", () => {
    expect(winston.createLogger).toHaveBeenCalled();
  });

  it("should log a debug message", () => {
    loggerInstance.debug("test debug");
    expect(mockLog).toHaveBeenCalledWith("debug", "test debug", {});
  });

  it("should not log messages below the current level", () => {
    loggerInstance.setLevel("info");
    vi.clearAllMocks();
    loggerInstance.debug("this should not be logged");
    expect(mockLog).not.toHaveBeenCalled();
  });

  it("should change log level dynamically", () => {
    loggerInstance.setLevel("warning");
    vi.clearAllMocks();
    loggerInstance.info("not logged");
    loggerInstance.warning("logged");
    expect(mockLog).toHaveBeenCalledOnce();
    expect(mockLog).toHaveBeenCalledWith("warn", "logged", {});
  });

  it("should send an MCP notification if a sender is set", () => {
    const sender = vi.fn();
    loggerInstance.setMcpNotificationSender(sender);
    vi.clearAllMocks();
    loggerInstance.info("test info");
    expect(sender).toHaveBeenCalledWith(
      "info",
      { message: "test info" },
      expect.any(String),
    );
  });

  it("should log an interaction", async () => {
    const mockInteractionLoggerInstance = { info: vi.fn() };
    (winston.createLogger as any).mockImplementation((options: any) => {
      if (options?.transports[0]?.filename?.includes("interactions.log")) {
        return mockInteractionLoggerInstance;
      }
      return mockWinstonLogger;
    });

    // Re-initialize to pick up the new mock implementation
    (loggerInstance as any).initialized = false;
    await loggerInstance.initialize("debug");

    loggerInstance.logInteraction("testInteraction", { data: "test" });
    expect(mockInteractionLoggerInstance.info).toHaveBeenCalledWith({
      interactionName: "testInteraction",
      data: "test",
    });
  });
});
