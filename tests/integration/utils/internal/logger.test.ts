/**
 * @fileoverview Integration tests for the Logger utility.
 * These tests validate file creation, log level handling, and rate limiting.
 */
import { existsSync, readFileSync, rmSync } from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { config } from '../../../../src/config/index.js';
import { Logger } from '../../../../src/utils/internal/logger.js';

const LOGS_DIR = path.join(config.logsPath, 'logger-test');
const COMBINED_LOG_PATH = path.join(LOGS_DIR, 'combined.log');
const ERROR_LOG_PATH = path.join(LOGS_DIR, 'error.log');

// Override config to use a dedicated test directory
config.logsPath = LOGS_DIR;

describe('Logger Integration', () => {
  let logger: Logger;

  beforeAll(async () => {
    // Clean up old logs if they exist
    if (existsSync(LOGS_DIR)) {
      rmSync(LOGS_DIR, { recursive: true, force: true });
    }
    logger = Logger.getInstance();
    await logger.initialize('debug');
  });

  afterAll(async () => {
    await logger.close();
    Logger.resetForTesting();
    // Clean up the test log directory
    if (existsSync(LOGS_DIR)) {
      rmSync(LOGS_DIR, { recursive: true, force: true });
    }
  });

  it('should create log files on initialization', async () => {
    // Winston file transport creation is async. Give it a moment to complete.
    await new Promise((res) => setTimeout(res, 50));
    expect(existsSync(COMBINED_LOG_PATH)).toBe(true);
    expect(existsSync(ERROR_LOG_PATH)).toBe(true);
  });

  it('should write an info message to the combined log but not the error log', async () => {
    await new Promise<void>((resolve) => {
      logger.info('This is an info message', {
        testId: 'info-test',
        requestId: 'test-1',
        timestamp: new Date().toISOString(),
      });
      // Give winston a moment to write to the file stream
      setTimeout(() => {
        const combinedLog = readFileSync(COMBINED_LOG_PATH, 'utf-8');
        expect(combinedLog).toContain('This is an info message');
        expect(combinedLog).toContain('info-test');

        const errorLog = readFileSync(ERROR_LOG_PATH, 'utf-8');
        expect(errorLog).not.toContain('This is an info message');
        resolve();
      }, 150);
    });
  });

  it('should write an error message to both combined and error logs', async () => {
    await new Promise<void>((resolve) => {
      logger.error('This is an error message', {
        testId: 'error-test',
        requestId: 'test-2',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        const combinedLog = readFileSync(COMBINED_LOG_PATH, 'utf-8');
        expect(combinedLog).toContain('This is an error message');
        expect(combinedLog).toContain('error-test');

        const errorLog = readFileSync(ERROR_LOG_PATH, 'utf-8');
        expect(errorLog).toContain('This is an error message');
        resolve();
      }, 150);
    });
  });

  it('should respect the log level and not log debug messages if level is info', async () => {
    await new Promise<void>((resolve) => {
      logger.setLevel('info');
      logger.debug('This debug message should not be logged', {
        testId: 'debug-test',
        requestId: 'test-3',
        timestamp: new Date().toISOString(),
      });

      setTimeout(() => {
        const combinedLog = readFileSync(COMBINED_LOG_PATH, 'utf-8');
        expect(combinedLog).not.toContain('debug-test');

        // Reset level for other tests
        logger.setLevel('debug');
        resolve();
      }, 150);
    });
  });
});
