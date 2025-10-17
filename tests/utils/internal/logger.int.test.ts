/**
 * @fileoverview Integration tests for the Logger utility.
 * These tests validate file creation, log level handling, and rate limiting with Pino.
 */
import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { config } from '../../../src/config/index.js';
import { Logger } from '../../../src/utils/internal/logger.js';

const LOGS_DIR = path.join(process.cwd(), 'logs', 'logger-test');
const COMBINED_LOG_PATH = path.join(LOGS_DIR, 'combined.log');
const ERROR_LOG_PATH = path.join(LOGS_DIR, 'error.log');
const INTERACTIONS_LOG_PATH = path.join(LOGS_DIR, 'interactions.log');

// Override config to use a dedicated test directory
config.logsPath = LOGS_DIR;

function readJsonLog(filePath: string): any[] {
  if (!existsSync(filePath)) {
    return [];
  }
  const content = readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line));
}

describe('Logger Integration (Pino)', () => {
  let logger: Logger;

  beforeAll(async () => {
    // Enable test logs for logger integration tests
    process.env.ENABLE_TEST_LOGS = 'true';

    // Use real timers for this test suite to avoid conflicts with setTimeout
    if (typeof (vi as any).useRealTimers === 'function') {
      (vi as any).useRealTimers();
    }

    // Clean up old logs if they exist
    if (existsSync(LOGS_DIR)) {
      rmSync(LOGS_DIR, { recursive: true, force: true });
    }
    // We get a singleton instance, so we will reuse it. Tests should not interfere.
    logger = Logger.getInstance();
    if (!logger.isInitialized()) {
      await logger.initialize('debug');
    }
  });

  afterAll(async () => {
    await logger.close();
    // Clean up the test log directory
    if (existsSync(LOGS_DIR)) {
      rmSync(LOGS_DIR, { recursive: true, force: true });
    }
    // Cleanup environment variable
    delete process.env.ENABLE_TEST_LOGS;
  });

  it('should create log files on initialization', async () => {
    // Pino file transport creation is very fast, 100ms is sufficient
    await new Promise((res) => setTimeout(res, 100));
    expect(existsSync(COMBINED_LOG_PATH)).toBe(true);
    expect(existsSync(ERROR_LOG_PATH)).toBe(true);
  });

  it('should write an info message to the combined log but not the error log', async () => {
    await new Promise<void>((resolve) => {
      logger.info('This is a pino info message', {
        testId: 'pino-info-test',
        requestId: 'test-pino-1',
        timestamp: new Date().toISOString(),
      });

      // Give pino a moment to write to the file stream
      setTimeout(() => {
        const combinedLog = readJsonLog(COMBINED_LOG_PATH);
        const infoLogEntry = combinedLog.find(
          (log) => log.testId === 'pino-info-test',
        );
        expect(infoLogEntry).toBeDefined();
        expect(infoLogEntry.msg).toBe('This is a pino info message');
        expect(infoLogEntry.level).toBe(30); // Pino's level for info

        const errorLog = readJsonLog(ERROR_LOG_PATH);
        const errorLogEntry = errorLog.find(
          (log) => log.testId === 'pino-info-test',
        );
        expect(errorLogEntry).toBeUndefined();
        resolve();
      }, 100);
    });
  });

  it('should write an error message to both combined and error logs', async () => {
    await new Promise<void>((resolve) => {
      logger.error('This is a pino error message', new Error('test error'), {
        testId: 'pino-error-test',
        requestId: 'test-pino-2',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        const combinedLog = readJsonLog(COMBINED_LOG_PATH);
        const combinedErrorEntry = combinedLog.find(
          (log) => log.testId === 'pino-error-test',
        );
        expect(combinedErrorEntry).toBeDefined();
        expect(combinedErrorEntry.msg).toBe('This is a pino error message');
        expect(combinedErrorEntry.level).toBe(50); // Pino's level for error
        expect(combinedErrorEntry.err.message).toBe('test error');

        const errorLog = readJsonLog(ERROR_LOG_PATH);
        const errorLogEntry = errorLog.find(
          (log) => log.testId === 'pino-error-test',
        );
        expect(errorLogEntry).toBeDefined();
        expect(errorLogEntry.msg).toBe('This is a pino error message');
        resolve();
      }, 100);
    });
  });

  it('should respect the log level and not log debug messages if level is info', async () => {
    // Read current log size to check for new entries later
    const initialLog = readFileSync(COMBINED_LOG_PATH, 'utf-8');

    logger.setLevel('info');
    logger.debug('This pino debug message should not be logged', {
      testId: 'pino-debug-test',
      requestId: 'test-pino-3',
      timestamp: new Date().toISOString(),
    });

    await new Promise((res) => setTimeout(res, 100));

    const updatedLog = readFileSync(COMBINED_LOG_PATH, 'utf-8');
    const newLogContent = updatedLog.substring(initialLog.length);
    expect(newLogContent).not.toContain('pino-debug-test');

    // Reset level for other tests
    logger.setLevel('debug');
  });

  it('should log emergency level messages', async () => {
    await new Promise<void>((resolve) => {
      logger.emerg('Emergency situation detected', {
        testId: 'pino-emerg-test',
        requestId: 'test-pino-emerg',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        const combinedLog = readJsonLog(COMBINED_LOG_PATH);
        const emergEntry = combinedLog.find(
          (log) => log.testId === 'pino-emerg-test',
        );
        expect(emergEntry).toBeDefined();
        expect(emergEntry.msg).toBe('Emergency situation detected');
        // Pino fatal level is 60
        expect(emergEntry.level).toBeGreaterThanOrEqual(50);
        resolve();
      }, 100);
    });
  });

  it('should log critical level messages', async () => {
    await new Promise<void>((resolve) => {
      logger.crit('Critical error occurred', {
        testId: 'pino-crit-test',
        requestId: 'test-pino-crit',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        const combinedLog = readJsonLog(COMBINED_LOG_PATH);
        const critEntry = combinedLog.find(
          (log) => log.testId === 'pino-crit-test',
        );
        expect(critEntry).toBeDefined();
        expect(critEntry.msg).toBe('Critical error occurred');
        // Mapped to error level (50) in Pino
        expect(critEntry.level).toBeGreaterThanOrEqual(50);
        resolve();
      }, 100);
    });
  });

  it('should log alert level messages', async () => {
    await new Promise<void>((resolve) => {
      logger.alert('Alert condition triggered', {
        testId: 'pino-alert-test',
        requestId: 'test-pino-alert',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        const combinedLog = readJsonLog(COMBINED_LOG_PATH);
        const alertEntry = combinedLog.find(
          (log) => log.testId === 'pino-alert-test',
        );
        expect(alertEntry).toBeDefined();
        expect(alertEntry.msg).toBe('Alert condition triggered');
        // Mapped to error/fatal level in Pino
        expect(alertEntry.level).toBeGreaterThanOrEqual(50);
        resolve();
      }, 100);
    });
  });

  it('should log notice level messages', async () => {
    await new Promise<void>((resolve) => {
      logger.notice('Notice level message', {
        testId: 'pino-notice-test',
        requestId: 'test-pino-notice',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        const combinedLog = readJsonLog(COMBINED_LOG_PATH);
        const noticeEntry = combinedLog.find(
          (log) => log.testId === 'pino-notice-test',
        );
        expect(noticeEntry).toBeDefined();
        expect(noticeEntry.msg).toBe('Notice level message');
        // Mapped to info level (30) in Pino
        expect(noticeEntry.level).toBeGreaterThanOrEqual(30);
        resolve();
      }, 100);
    });
  });

  it('should log fatal level messages by delegating to emerg', async () => {
    await new Promise<void>((resolve) => {
      logger.fatal('Fatal condition encountered', {
        testId: 'pino-fatal-test',
        requestId: 'test-pino-fatal',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        const combinedLog = readJsonLog(COMBINED_LOG_PATH);
        const fatalEntry = combinedLog.find(
          (log) => log.testId === 'pino-fatal-test',
        );
        expect(fatalEntry).toBeDefined();
        expect(fatalEntry.msg).toBe('Fatal condition encountered');
        expect(fatalEntry.level).toBeGreaterThanOrEqual(50);
        resolve();
      }, 100);
    });
  });

  it('writes interaction events when an interaction logger is available', async () => {
    logger.logInteraction('test-interaction', {
      context: {
        testId: 'interaction-test',
        requestId: 'interaction-1',
        timestamp: new Date().toISOString(),
      },
      payloadSize: 42,
    });

    // Use vi.waitFor with retry logic for eventual consistency
    await vi.waitFor(
      () => {
        const interactions = readJsonLog(INTERACTIONS_LOG_PATH);
        const entry = interactions.find(
          (log) => log.interactionName === 'test-interaction',
        );
        expect(entry).toBeDefined();
        expect(entry?.payloadSize).toBe(42);
      },
      {
        timeout: 2000, // 2 second max wait
        interval: 50, // Check every 50ms
      },
    );
  });

  it('warns when interaction logging is requested but unavailable', () => {
    const loggerWithInternals = logger as unknown as {
      interactionLogger?: unknown;
    };
    const originalInteractionLogger = loggerWithInternals.interactionLogger;
    loggerWithInternals.interactionLogger = undefined;

    const warningSpy = vi.spyOn(logger, 'warning');

    logger.logInteraction('missing-interaction', {
      context: {
        requestId: 'missing-interaction',
        timestamp: new Date().toISOString(),
      },
    });

    expect(warningSpy).toHaveBeenCalledWith(
      'Interaction logger not available.',
      expect.objectContaining({ requestId: 'missing-interaction' }),
    );

    warningSpy.mockRestore();
    loggerWithInternals.interactionLogger = originalInteractionLogger;
  });
});

describe('Logger Transport Mode Handling', () => {
  afterAll(async () => {
    // Clean up any test loggers
    const testLogger = Logger.getInstance();
    if (testLogger.isInitialized()) {
      await testLogger.close();
    }
  });

  it('should output plain JSON (no ANSI codes) to stderr when initialized with stdio transport', async () => {
    // NOTE: This test verifies STDIO mode behavior by checking file output.
    // Direct stderr capture is difficult with Pino's buffering, but we verify:
    // 1. No ANSI codes in output (MCP spec requirement)
    // 2. Valid JSON format (parseable by MCP clients)
    // 3. Logger initializes with stdio transport mode
    //
    // The actual stderr routing (fd 2) is verified by the implementation:
    // - Line 134 in logger.ts uses { destination: 2 } for STDIO mode
    // - This ensures logs go to stderr, not stdout, per MCP specification

    // CRITICAL: Enable test logs so logger doesn't run in silent mode
    const originalEnableTestLogs = process.env.ENABLE_TEST_LOGS;
    process.env.ENABLE_TEST_LOGS = 'true';

    const stdioLogger = Logger.getInstance();

    // Close any existing logger state
    if (stdioLogger.isInitialized()) {
      await stdioLogger.close();
    }

    // Create a test log directory for this specific test
    const stdioTestLogDir = path.join(process.cwd(), 'logs', 'stdio-test');
    const stdioTestLogPath = path.join(stdioTestLogDir, 'combined.log');

    // Temporarily override config for this test
    const originalLogsPath = config.logsPath;
    config.logsPath = stdioTestLogDir;

    // Clean up old logs if they exist
    if (existsSync(stdioTestLogDir)) {
      rmSync(stdioTestLogDir, { recursive: true, force: true });
    }

    // Initialize with STDIO transport mode
    await stdioLogger.initialize('info', 'stdio');

    // Wait for logger to initialize file transports
    await new Promise((res) => setTimeout(res, 100));

    // Write a test message
    stdioLogger.info('STDIO transport test message', {
      testId: 'stdio-ansi-test',
      requestId: 'test-stdio-1',
      timestamp: new Date().toISOString(),
    });

    // Wait for log to be written
    await new Promise((res) => setTimeout(res, 100));

    // Read the log file to verify output format
    expect(existsSync(stdioTestLogPath)).toBe(true);

    const logContent = readFileSync(stdioTestLogPath, 'utf-8');

    // CRITICAL: Check for ANSI escape codes (e.g., [35m, [39m, [32m, etc.)
    // The MCP specification requires clean JSON output with no color codes
    const ansiPattern = /\x1b\[\d+m/;
    expect(ansiPattern.test(logContent)).toBe(false);

    // Verify the log entry is valid JSON (MCP clients must be able to parse)
    const logLines = logContent
      .split('\n')
      .filter((line) => line.trim() !== '');

    expect(logLines.length).toBeGreaterThan(0);

    for (const line of logLines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }

    // Verify our test message was logged with correct content
    const logs = logLines.map((line) => JSON.parse(line));
    const testLog = logs.find((log) => log.testId === 'stdio-ansi-test');
    expect(testLog).toBeDefined();
    expect(testLog.msg).toBe('STDIO transport test message');

    // Verify logger was initialized with stdio transport awareness
    expect(stdioLogger.isInitialized()).toBe(true);

    // Cleanup
    await stdioLogger.close();
    if (existsSync(stdioTestLogDir)) {
      rmSync(stdioTestLogDir, { recursive: true, force: true });
    }

    // Restore original config and environment
    config.logsPath = originalLogsPath;
    if (originalEnableTestLogs !== undefined) {
      process.env.ENABLE_TEST_LOGS = originalEnableTestLogs;
    } else {
      delete process.env.ENABLE_TEST_LOGS;
    }
  });

  it('should allow colored output when initialized with http transport', async () => {
    // This test ensures HTTP mode can use pino-pretty in development
    // We just verify it doesn't throw an error during initialization
    const httpLogger = Logger.getInstance();

    // Close any existing logger state
    if (httpLogger.isInitialized()) {
      await httpLogger.close();
    }

    // Initialize with HTTP transport mode (should allow colors in dev)
    await httpLogger.initialize('info', 'http');

    // Verify logger is initialized successfully
    expect(httpLogger.isInitialized()).toBe(true);

    // Cleanup
    await httpLogger.close();
  });
});
