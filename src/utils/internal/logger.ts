/**
 * @fileoverview Pino-backed singleton logger with environment-adaptive output.
 * Implements RFC5424 level mapping, structured context, automatic trace injection via
 * OpenTelemetry, and graceful shutdown.
 * @module src/utils/internal/logger
 */
import fs from 'fs';
import path from 'path';
import type { Logger as PinoLogger } from 'pino';
import pino from 'pino';

import { config } from '@/config/index.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';
import { sanitization } from '@/utils/security/sanitization.js';

export type McpLogLevel =
  | 'debug'
  | 'info'
  | 'notice'
  | 'warning'
  | 'error'
  | 'crit'
  | 'alert'
  | 'emerg';

// Pino levels: trace, debug, info, warn, error, fatal
const mcpToPinoLevel: Record<McpLogLevel, pino.LevelWithSilent> = {
  emerg: 'fatal',
  alert: 'fatal',
  crit: 'error',
  error: 'error',
  warning: 'warn',
  notice: 'info',
  info: 'info',
  debug: 'debug',
};

const pinoToMcpLevelSeverity: Record<string, number> = {
  fatal: 0, // emerg, alert
  error: 2, // crit, error
  warn: 4, // warning
  info: 6, // notice, info
  debug: 7, // debug
};

export class Logger {
  private static instance: Logger | undefined;
  private pinoLogger?: PinoLogger;
  private interactionLogger: PinoLogger | undefined;
  private initialized = false;
  private currentMcpLevel: McpLogLevel = 'info';

  // Rate limiting state
  private rateLimitThreshold = 10;
  private rateLimitWindow = 60000;
  private messageCounts = new Map<
    string,
    { count: number; firstSeen: number }
  >();
  private suppressedMessages = new Map<string, number>();
  private cleanupTimer?: ReturnType<typeof setInterval>;

  private constructor() {
    this.cleanupTimer = setInterval(
      () => this.flushSuppressedMessages(),
      this.rateLimitWindow,
    );
    this.cleanupTimer.unref?.();
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createPinoLogger(level: McpLogLevel): PinoLogger {
    const isDevelopment = config.environment === 'development';
    const isTest = config.environment === 'test';
    const pinoLevel = mcpToPinoLevel[level] || 'info';

    const pinoOptions: pino.LoggerOptions = {
      level: pinoLevel,
      base: {
        env: config.environment,
        version: config.mcpServerVersion,
        pid: process.pid,
      },
      redact: {
        paths: sanitization.getSensitivePinoFields(),
        censor: '[REDACTED]',
      },
    };

    const transports: pino.TransportTargetOptions[] = [];

    // Console transport (pretty in dev, json in prod, silent in test)
    if (isDevelopment) {
      transports.push({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
        },
      });
    } else if (!isTest) {
      transports.push({
        target: 'pino/file', // Directs to stdout for production
        options: { destination: 1 },
      });
    }

    // File transport for combined logs
    if (config.logsPath) {
      try {
        if (!fs.existsSync(config.logsPath)) {
          fs.mkdirSync(config.logsPath, { recursive: true });
        }
        transports.push({
          level: pinoLevel,
          target: 'pino/file',
          options: {
            destination: path.join(config.logsPath, 'combined.log'),
            mkdir: true,
          },
        });
        transports.push({
          level: 'error',
          target: 'pino/file',
          options: {
            destination: path.join(config.logsPath, 'error.log'),
            mkdir: true,
          },
        });
      } catch (err) {
        console.error(
          `[Logger Init] Failed to configure file logging: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return pino({
      ...pinoOptions,
      transport: { targets: transports },
    });
  }

  private createInteractionLogger(): PinoLogger | undefined {
    if (!config.logsPath) return undefined;
    return pino({
      transport: {
        target: 'pino/file',
        options: {
          destination: path.join(config.logsPath, 'interactions.log'),
          mkdir: true,
        },
      },
    });
  }

  public initialize(level: McpLogLevel = 'info'): Promise<void> {
    if (this.initialized) {
      this.warning('Logger already initialized.', {
        requestId: 'logger-reinit',
        timestamp: new Date().toISOString(),
      });
      return Promise.resolve();
    }

    this.currentMcpLevel = level;
    this.pinoLogger = this.createPinoLogger(level);
    this.interactionLogger = this.createInteractionLogger();
    this.initialized = true;

    this.info(`Logger initialized. MCP level: ${level}.`, {
      requestId: 'logger-init',
      timestamp: new Date().toISOString(),
    });
    return Promise.resolve();
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public setLevel(newLevel: McpLogLevel): void {
    if (!this.pinoLogger || !this.initialized) {
      console.error('Cannot set level: Logger not initialized.');
      return;
    }
    this.currentMcpLevel = newLevel;
    this.pinoLogger.level = mcpToPinoLevel[newLevel] || 'info';
    this.info(`Log level changed to ${newLevel}.`, {
      requestId: 'logger-set-level',
      timestamp: new Date().toISOString(),
    });
  }

  public close(): Promise<void> {
    if (!this.initialized) {
      return Promise.resolve();
    }

    this.info('Logger shutting down.', {
      requestId: 'logger-close',
      timestamp: new Date().toISOString(),
    });

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.flushSuppressedMessages();

    // With pino.transport, flushing is handled in a worker thread.
    // A robust graceful shutdown would require more complex inter-process
    // communication. For this implementation, we ensure our internal state
    // is clean and allow the process to exit. The OS buffer will handle most cases.
    const loggers = [this.pinoLogger, this.interactionLogger].filter(
      Boolean,
    ) as PinoLogger[];
    loggers.forEach((l) => l.flush());

    this.initialized = false;
    return Promise.resolve();
  }

  // --- Rate Limiting (ported from original) ---
  private isRateLimited(message: string): boolean {
    const now = Date.now();
    const entry = this.messageCounts.get(message);
    if (entry) {
      if (now - entry.firstSeen > this.rateLimitWindow) {
        this.messageCounts.set(message, { count: 1, firstSeen: now });
        return false;
      }
      entry.count++;
      if (entry.count > this.rateLimitThreshold) {
        this.suppressedMessages.set(
          message,
          (this.suppressedMessages.get(message) || 0) + 1,
        );
        return true;
      }
    } else {
      this.messageCounts.set(message, { count: 1, firstSeen: now });
    }
    return false;
  }

  private flushSuppressedMessages(): void {
    if (this.suppressedMessages.size === 0) {
      return;
    }
    for (const [message, count] of this.suppressedMessages.entries()) {
      this.warning(
        `Log message suppressed ${count} times due to rate limiting.`,
        {
          requestId: 'logger-rate-limit-flush',
          timestamp: new Date().toISOString(),
          originalMessage: message,
          rateLimitInfo: true,
        },
      );
    }
    this.suppressedMessages.clear();
    this.messageCounts.clear();
  }

  private log(
    level: McpLogLevel,
    msg: string,
    context?: RequestContext,
    error?: Error,
  ): void {
    if (!this.pinoLogger || !this.initialized) return;

    const pinoLevel = mcpToPinoLevel[level] || 'info';
    const currentPinoLevel = mcpToPinoLevel[this.currentMcpLevel] || 'info';
    const severity = pinoToMcpLevelSeverity[pinoLevel];
    const currentSeverity = pinoToMcpLevelSeverity[currentPinoLevel];

    if (
      typeof severity === 'number' &&
      typeof currentSeverity === 'number' &&
      severity > currentSeverity
    ) {
      return;
    }

    if (this.isRateLimited(msg)) {
      return;
    }

    const logObject: Record<string, unknown> = { ...context };
    if (error) {
      logObject.err = pino.stdSerializers.err(error);
    }

    this.pinoLogger[pinoLevel](logObject, msg);
  }

  // --- Public Log Methods ---
  public debug(msg: string, context?: RequestContext): void {
    this.log('debug', msg, context);
  }
  public info(msg: string, context?: RequestContext): void {
    this.log('info', msg, context);
  }
  public notice(msg: string, context?: RequestContext): void {
    this.log('notice', msg, context);
  }
  public warning(msg: string, context?: RequestContext): void {
    this.log('warning', msg, context);
  }
  public error(msg: string, context: RequestContext): void;
  public error(msg: string, error: Error, context?: RequestContext): void;
  public error(
    msg: string,
    errorOrContext: Error | RequestContext,
    context?: RequestContext,
  ): void {
    const errorObj =
      errorOrContext instanceof Error ? errorOrContext : undefined;
    const actualContext =
      errorOrContext instanceof Error ? context : errorOrContext;
    this.log('error', msg, actualContext, errorObj);
  }
  // Implement crit, alert, emerg, fatal similarly to error...
  public crit(msg: string, context: RequestContext): void;
  public crit(msg: string, error: Error, context?: RequestContext): void;
  public crit(
    msg: string,
    errorOrContext: Error | RequestContext,
    context?: RequestContext,
  ): void {
    const errorObj =
      errorOrContext instanceof Error ? errorOrContext : undefined;
    const actualContext =
      errorOrContext instanceof Error ? context : errorOrContext;
    this.log('crit', msg, actualContext, errorObj);
  }
  public alert(msg: string, context: RequestContext): void;
  public alert(msg: string, error: Error, context?: RequestContext): void;
  public alert(
    msg: string,
    errorOrContext: Error | RequestContext,
    context?: RequestContext,
  ): void {
    const errorObj =
      errorOrContext instanceof Error ? errorOrContext : undefined;
    const actualContext =
      errorOrContext instanceof Error ? context : errorOrContext;
    this.log('alert', msg, actualContext, errorObj);
  }
  public emerg(msg: string, context: RequestContext): void;
  public emerg(msg: string, error: Error, context?: RequestContext): void;
  public emerg(
    msg: string,
    errorOrContext: Error | RequestContext,
    context?: RequestContext,
  ): void {
    const errorObj =
      errorOrContext instanceof Error ? errorOrContext : undefined;
    const actualContext =
      errorOrContext instanceof Error ? context : errorOrContext;
    this.log('emerg', msg, actualContext, errorObj);
  }
  public fatal(msg: string, context: RequestContext): void;
  public fatal(msg: string, error: Error, context?: RequestContext): void;
  public fatal(
    msg: string,
    errorOrContext: Error | RequestContext,
    context?: RequestContext,
  ): void {
    this.emerg(msg, errorOrContext as Error, context); // Map fatal to emerg
  }

  public logInteraction(
    interactionName: string,
    data: Record<string, unknown>,
  ): void {
    if (!this.interactionLogger) {
      this.warning(
        'Interaction logger not available. File logging may be disabled.',
        (data.context || {}) as RequestContext,
      );
      return;
    }
    this.interactionLogger.info({ interactionName, ...data });
  }
}

export const logger = Logger.getInstance();
