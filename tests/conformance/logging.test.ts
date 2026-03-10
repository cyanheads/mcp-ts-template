/**
 * @fileoverview Logging capability conformance tests.
 * Validates the server's logging capability advertisement, log level control,
 * and log message notification delivery via the MCP protocol.
 * @module tests/conformance/logging
 */

import { LoggingMessageNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type ConformanceHarness, createConformanceHarness } from './helpers/server-harness.js';

/** Valid syslog severity levels per MCP spec. */
const SYSLOG_LEVELS = [
  'debug',
  'info',
  'notice',
  'warning',
  'error',
  'critical',
  'alert',
  'emergency',
] as const;

/** Numeric severity: lower index = lower severity. */
const LEVEL_SEVERITY: Record<string, number> = Object.fromEntries(
  SYSLOG_LEVELS.map((level, idx) => [level, idx]),
);

describe('Logging capability conformance', () => {
  let harness: ConformanceHarness;

  beforeAll(async () => {
    harness = await createConformanceHarness();
  });

  afterAll(async () => {
    await harness?.cleanup();
  });

  // -- Capability advertisement -------------------------------------------

  it('server declares logging capability', () => {
    const caps = harness.client.getServerCapabilities();
    expect(caps?.logging).toBeDefined();
  });

  // -- Log level control --------------------------------------------------

  it('setLoggingLevel to debug succeeds without error', async () => {
    // Should not throw — server must accept valid log levels
    await harness.client.setLoggingLevel('debug');
  });

  it('setLoggingLevel to emergency succeeds without error', async () => {
    await harness.client.setLoggingLevel('emergency');
  });

  // -- Log message notifications ------------------------------------------

  it('log messages at debug level have valid syslog levels', async () => {
    const logMessages: Array<{
      data?: unknown | undefined;
      level: string;
      logger?: string | undefined;
    }> = [];

    harness.client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
      logMessages.push(notification.params);
    });

    await harness.client.setLoggingLevel('debug');

    // Trigger activity that may produce log output
    await harness.client.callTool({
      arguments: { message: 'logging-test' },
      name: 'template_echo_message',
    });

    // Give async notifications a moment to arrive
    await new Promise((resolve) => setTimeout(resolve, 100));

    // If log messages were emitted, every one must use a valid level
    for (const msg of logMessages) {
      expect(SYSLOG_LEVELS as readonly string[]).toContain(msg.level);
    }
  });

  it('emergency level suppresses lower-severity messages', async () => {
    const logMessages: Array<{
      data?: unknown | undefined;
      level: string;
      logger?: string | undefined;
    }> = [];

    harness.client.setNotificationHandler(LoggingMessageNotificationSchema, (notification) => {
      logMessages.push(notification.params);
    });

    // Set to emergency — only emergency-level messages should arrive
    await harness.client.setLoggingLevel('emergency');

    await harness.client.callTool({
      arguments: { message: 'emergency-filter-test' },
      name: 'template_echo_message',
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    // No message with severity below emergency should have been delivered
    const emergencySeverity = LEVEL_SEVERITY['emergency']!;
    for (const msg of logMessages) {
      const severity = LEVEL_SEVERITY[msg.level];
      expect(
        severity,
        `Unexpected log level "${msg.level}" — not a valid syslog level`,
      ).toBeDefined();
      expect(
        severity! >= emergencySeverity,
        `Log message with level "${msg.level}" arrived despite emergency filter`,
      ).toBe(true);
    }
  });
});
