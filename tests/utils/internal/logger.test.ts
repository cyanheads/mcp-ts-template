/**
 * @fileoverview Tests for the Logger utility.
 * @module tests/utils/internal/logger.test
 */
import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import type winston from "winston";
import type { Logger as LoggerType } from "../../../src/utils/internal/logger";

// Define stable mock functions for logger methods at the top level
const mockLog = vi.fn();
const mockAdd = vi.fn();
const mockRemove = vi.fn();
const mockInfo = vi.fn();
const mockInteractionInfo = vi.fn();

const mockWinstonLogger = {
  log: mockLog,
  add: mockAdd,
  remove: mockRemove,
  info: mockInfo,
  level: "debug",
  transports: [],
};

const mockInteractionLogger = {
  info: mockInteractionInfo,
};

describe("Logger", () => {
  let loggerInstance: LoggerType;
  let winstonMock: typeof winston;
  let Logger: typeof LoggerType;

  beforeEach(async () => {
    // 1. Reset module cache to ensure fresh imports with new mocks for each test
    vi.resetModules();

    // 2. Mock dependencies using vi.doMock to prevent hoisting issues
    vi.doMock("../../../src/config/index.js", () => ({
      config: {
        logsPath: "/tmp/test-logs",
        mcpServerName: "test-server",
      },
    }));

    vi.doMock("winston", () => {
      const createLogger = vi.fn();
      const mockWinstonModule = {
        createLogger,
        transports: {
          File: vi.fn(),
          Console: vi.fn(),
        },
        format: {
          combine: vi.fn((...args) => args),
          colorize: vi.fn(),
          timestamp: vi.fn(),
          printf: vi.fn(),
          errors: vi.fn(),
          json: vi.fn(),
        },
      };
      return {
        __esModule: true,
        default: mockWinstonModule,
        ...mockWinstonModule,
      };
    });

    // 3. Dynamically import modules AFTER mocks are in place
    winstonMock = (await import("winston")).default;
    const LoggerModule = await import("../../../src/utils/internal/logger");
    Logger = LoggerModule.Logger;

    // 4. Set up the mock implementation for createLogger using call-order-specific values
    (winstonMock.createLogger as Mock)
      .mockReturnValueOnce(mockWinstonLogger) // First call returns the main logger
      .mockReturnValueOnce(mockInteractionLogger); // Second call returns the interaction logger

    // 5. Reset the singleton instance AFTER dynamic import and BEFORE getInstance
    Logger.resetForTesting();

    // 6. Get the fresh logger instance and initialize it
    loggerInstance = Logger.getInstance();
    await loggerInstance.initialize("debug");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should be a singleton", () => {
    const anotherInstance = Logger.getInstance();
    expect(loggerInstance).toBe(anotherInstance);
  });

  it("should initialize correctly by creating two loggers", () => {
    expect(winstonMock.createLogger).toHaveBeenCalledTimes(2);
  });

  it("should log a debug message", () => {
    loggerInstance.debug("test debug");
    expect(mockLog).toHaveBeenCalledWith("debug", "test debug", {});
  });

  it("should not log messages below the current level", () => {
    loggerInstance.setLevel("info");
    vi.clearAllMocks(); // Clear mocks after setLevel's own logging
    loggerInstance.debug("this should not be logged");
    expect(mockLog).not.toHaveBeenCalled();
  });

  it("should change log level dynamically", () => {
    loggerInstance.setLevel("warning");
    vi.clearAllMocks(); // Clear mocks after setLevel's own logging
    loggerInstance.info("not logged");
    loggerInstance.warning("logged");
    expect(mockLog).toHaveBeenCalledOnce();
    expect(mockLog).toHaveBeenCalledWith("warn", "logged", {});
  });

  it("should send an MCP notification if a sender is set", () => {
    const sender = vi.fn();
    loggerInstance.setMcpNotificationSender(sender);
    vi.clearAllMocks(); // Clear mocks after setMcpNotificationSender's own logging
    loggerInstance.info("test info");
    expect(sender).toHaveBeenCalledWith(
      "info",
      { message: "test info" },
      "test-server",
    );
  });

  it("should log an interaction", () => {
    loggerInstance.logInteraction("testInteraction", { data: "test" });
    expect(mockInteractionInfo).toHaveBeenCalledWith({
      interactionName: "testInteraction",
      data: "test",
    });
  });
});
