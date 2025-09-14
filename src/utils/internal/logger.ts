/**
 * @fileoverview Winston-backed singleton logger with MCP notifications.
 * RFC5424 level mapping, sanitized structured meta, rate limiting, and
 * clean shutdown. Console transport auto-enables in debug + TTY.
 * @module src/utils/internal/logger
 */
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import winston from 'winston';
import TransportStream from 'winston-transport';

import { config } from '@/config/index.js';
import { sanitizeInputForLogging } from '@/utils/security/sanitization.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';

export type McpLogLevel =
  | 'debug'
  | 'info'
  | 'notice'
  | 'warning'
  | 'error'
  | 'crit'
  | 'alert'
  | 'emerg';

const mcpLevelSeverity: Record<McpLogLevel, number> = {
  emerg: 0,
  alert: 1,
  crit: 2,
  error: 3,
  warning: 4,
  notice: 5,
  info: 6,
  debug: 7,
};

const mcpToWinstonLevel: Record<
  McpLogLevel,
  'debug' | 'info' | 'warn' | 'error'
> = {
  debug: 'debug',
  info: 'info',
  notice: 'info',
  warning: 'warn',
  error: 'error',
  crit: 'error',
  alert: 'error',
  emerg: 'error',
};

interface ErrorWithMessageAndStack {
  message?: string;
  stack?: string;
  [key: string]: unknown;
}

export interface McpLogPayload {
  message: string;
  context?: RequestContext;
  error?: {
    message: string;
    stack?: string;
  };
  [key: string]: unknown;
}

export type McpNotificationData = McpLogPayload | Record<string, unknown>;

export type McpNotificationSender = (
  level: McpLogLevel,
  data: McpNotificationData,
  loggerName?: string,
) => void;

function createWinstonConsoleFormat(): winston.Logform.Format {
  return winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let metaString = '';
      const metaCopy = { ...meta };
      if (metaCopy.error && typeof metaCopy.error === 'object') {
        const errorObj = metaCopy.error as ErrorWithMessageAndStack;
        if (errorObj.message) metaString += `\n  Error: ${errorObj.message}`;
        if (errorObj.stack)
          metaString += `\n  Stack: ${String(errorObj.stack)
            .split('\n')
            .map((l: string) => `    ${l}`)
            .join('\n')}`;
        delete metaCopy.error;
      }
      if (Object.keys(metaCopy).length > 0) {
        try {
          const replacer = (_key: string, value: unknown) =>
            typeof value === 'bigint' ? value.toString() : value;
          const remainingMetaJson = JSON.stringify(metaCopy, replacer, 2);
          if (remainingMetaJson !== '{}')
            metaString += `\n  Meta: ${remainingMetaJson}`;
        } catch (stringifyError: unknown) {
          const errorMessage =
            stringifyError instanceof Error
              ? stringifyError.message
              : String(stringifyError);
          metaString += `\n  Meta: [Error stringifying metadata: ${errorMessage}]`;
        }
      }
      return `${String(timestamp)} ${String(
        level,
      )}: ${message as string}${metaString}`;
    }),
  );
}

export class Logger {
  private static instance: Logger;
  private winstonLogger?: winston.Logger;
  private interactionLogger?: winston.Logger;
  private initialized = false;
  private mcpNotificationSender: McpNotificationSender | undefined;
  private currentMcpLevel: McpLogLevel = 'info';
  private currentWinstonLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private rateLimitThreshold = 10;
  private rateLimitWindow = 60000;
  private messageCounts = new Map<
    string,
    { count: number; firstSeen: number }
  >();
  private suppressedMessages = new Map<string, number>();
  private cleanupTimer?: ReturnType<typeof setInterval>;
  private readonly MCP_NOTIFICATION_STACK_TRACE_MAX_LENGTH = 1024;
  private readonly LOG_FILE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly LOG_MAX_FILES = 5;

  private constructor() {
    this.cleanupTimer = setInterval(
      () => this.flushSuppressedMessages(),
      this.rateLimitWindow,
    );
    this.cleanupTimer.unref?.();
  }

  public initialize(level: McpLogLevel = 'info'): Promise<void> {
    if (this.initialized) {
      this.warning('Logger already initialized.', {
        loggerSetup: true,
        requestId: 'logger-init',
        timestamp: new Date().toISOString(),
      });
      return Promise.resolve();
    }
    this.initialized = true;
    this.currentMcpLevel = level;
    this.currentWinstonLevel = mcpToWinstonLevel[level];
    const resolvedLogsDir = config.logsPath;
    const fileFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
    );
    const transports: TransportStream[] = [];
    const fileTransportOptions = {
      format: fileFormat,
      maxsize: this.LOG_FILE_MAX_SIZE,
      maxFiles: this.LOG_MAX_FILES,
      tailable: true,
    };
    if (resolvedLogsDir) {
      try {
        if (!existsSync(resolvedLogsDir)) {
          mkdirSync(resolvedLogsDir, { recursive: true });
        }
        transports.push(
          new winston.transports.File({
            filename: path.join(resolvedLogsDir, 'error.log'),
            level: 'error',
            ...fileTransportOptions,
          }),
          new winston.transports.File({
            filename: path.join(resolvedLogsDir, 'combined.log'),
            ...fileTransportOptions,
          }),
        );
      } catch (err) {
        if (process.stdout.isTTY) {
          const error = err instanceof Error ? err : new Error(String(err));
          console.error(
            `[Logger Init] Failed to create or access logs directory: ${resolvedLogsDir}. File logging disabled. Error: ${error.message}`,
          );
        }
      }
    } else if (
      typeof process !== 'undefined' &&
      process.stdout &&
      process.stdout.isTTY
    ) {
      console.warn(
        'File logging disabled as logsPath is not configured or invalid.',
      );
    }
    this.winstonLogger = winston.createLogger({
      level: this.currentWinstonLevel,
      transports,
      exitOnError: false,
    });
    if (resolvedLogsDir && transports.length > 0) {
      this.interactionLogger = winston.createLogger({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json({ space: 2 }),
        ),
        transports: [
          new winston.transports.File({
            filename: path.join(resolvedLogsDir, 'interactions.log'),
            ...fileTransportOptions,
          }),
        ],
      });
    }
    const consoleStatus = this._configureConsoleTransport();
    const initialContext: RequestContext = {
      loggerSetup: true,
      requestId: 'logger-init-deferred',
      timestamp: new Date().toISOString(),
    };
    if (consoleStatus.message) {
      this.info(consoleStatus.message, initialContext);
    }
    this.info(
      `Logger initialized. File logging level: ${this.currentWinstonLevel}. MCP logging level: ${this.currentMcpLevel}. Console logging: ${consoleStatus.enabled ? 'enabled' : 'disabled'}`,
      {
        loggerSetup: true,
        requestId: 'logger-post-init',
        timestamp: new Date().toISOString(),
        logsPathUsed: resolvedLogsDir ?? 'none',
      },
    );
    return Promise.resolve();
  }

  public setMcpNotificationSender(
    sender: McpNotificationSender | undefined,
  ): void {
    this.mcpNotificationSender = sender;
    const status = sender ? 'enabled' : 'disabled';
    this.info(`MCP notification sending ${status}.`, {
      loggerSetup: true,
      requestId: 'logger-set-sender',
      timestamp: new Date().toISOString(),
    });
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public setLevel(newLevel: McpLogLevel): void {
    const setLevelContext: RequestContext = {
      loggerSetup: true,
      requestId: 'logger-set-level',
      timestamp: new Date().toISOString(),
    };
    if (!this.ensureInitialized()) {
      if (
        typeof process !== 'undefined' &&
        process.stdout &&
        process.stdout.isTTY
      ) {
        console.error('Cannot set level: Logger not initialized.');
      }
      return;
    }
    if (!(newLevel in mcpLevelSeverity)) {
      this.warning(
        `Invalid MCP log level provided: ${newLevel}. Level not changed.`,
        setLevelContext,
      );
      return;
    }
    const oldLevel = this.currentMcpLevel;
    this.currentMcpLevel = newLevel;
    this.currentWinstonLevel = mcpToWinstonLevel[newLevel];
    if (this.winstonLogger) {
      this.winstonLogger.level = this.currentWinstonLevel;
    }
    const consoleStatus = this._configureConsoleTransport();
    if (oldLevel !== newLevel) {
      this.info(
        `Log level changed. File logging level: ${this.currentWinstonLevel}. MCP logging level: ${this.currentMcpLevel}. Console logging: ${consoleStatus.enabled ? 'enabled' : 'disabled'}`,
        setLevelContext,
      );
    }
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        delete this.cleanupTimer;
      }
      this.flushSuppressedMessages();

      const loggers = [this.winstonLogger, this.interactionLogger].filter(
        (lg): lg is winston.Logger => !!lg,
      );

      if (loggers.length === 0) {
        return resolve();
      }

      let closedCount = 0;
      const totalTransports = loggers.reduce(
        (acc, lg) => acc + lg.transports.length,
        0,
      );

      if (totalTransports === 0) {
        return resolve();
      }

      const onClosed = () => {
        closedCount++;
        if (closedCount >= totalTransports) {
          this.initialized = false;
          resolve();
        }
      };

      loggers.forEach((lg) => {
        lg.transports.forEach((transport) => {
          transport.once('finish', onClosed);
        });
        lg.end();
      });
    });
  }

  private _configureConsoleTransport(): {
    enabled: boolean;
    message: string | null;
  } {
    if (!this.winstonLogger) {
      return {
        enabled: false,
        message: 'Cannot configure console: Winston logger not initialized.',
      };
    }
    const consoleTransport = this.winstonLogger.transports.find(
      (t) => t instanceof winston.transports.Console,
    );
    const shouldHaveConsole =
      this.currentMcpLevel === 'debug' &&
      typeof process !== 'undefined' &&
      !!process.stdout &&
      !!process.stdout.isTTY;
    let message: string | null = null;
    if (shouldHaveConsole && !consoleTransport) {
      this.winstonLogger.add(
        new winston.transports.Console({
          level: 'debug',
          format: createWinstonConsoleFormat(),
        }),
      );
      message = 'Console logging enabled (level: debug, stdout is TTY).';
    } else if (!shouldHaveConsole && consoleTransport) {
      this.winstonLogger.remove(consoleTransport);
      message = 'Console logging disabled (level not debug or stdout not TTY).';
    }
    return { enabled: shouldHaveConsole, message };
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public static resetForTesting(): void {
    if (typeof process === 'undefined' || process.env?.NODE_ENV !== 'test') {
      console.warn(
        'Warning: `resetForTesting` should only be called in a test environment.',
      );
      return;
    }
    (Logger.instance as unknown) = undefined;
  }

  private ensureInitialized(): boolean {
    if (!this.initialized || !this.winstonLogger) {
      if (
        typeof process !== 'undefined' &&
        process.stdout &&
        process.stdout.isTTY
      ) {
        console.warn('Logger not initialized; message dropped.');
      }
      return false;
    }
    return true;
  }

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
    if (!this.ensureInitialized()) return;
    if (mcpLevelSeverity[level] > mcpLevelSeverity[this.currentMcpLevel]) {
      return;
    }
    if (this.isRateLimited(msg)) {
      return;
    }
    const sanitizedContext = context
      ? (sanitizeInputForLogging(context) as RequestContext)
      : undefined;
    const logData: Record<string, unknown> = sanitizedContext
      ? { ...sanitizedContext }
      : {};
    const winstonLevel = mcpToWinstonLevel[level];
    if (error) {
      this.winstonLogger!.log(winstonLevel, msg, { ...logData, error });
    } else {
      this.winstonLogger!.log(winstonLevel, msg, logData);
    }
    if (this.mcpNotificationSender) {
      const mcpDataPayload: McpLogPayload = { message: msg };
      if (sanitizedContext) {
        mcpDataPayload.context = sanitizedContext;
      }
      if (error) {
        mcpDataPayload.error = { message: error.message };
        if (this.currentMcpLevel === 'debug' && error.stack) {
          mcpDataPayload.error.stack = error.stack.substring(
            0,
            this.MCP_NOTIFICATION_STACK_TRACE_MAX_LENGTH,
          );
        }
      }
      try {
        const serverName =
          config?.mcpServerName ?? 'MCP_SERVER_NAME_NOT_CONFIGURED';
        this.mcpNotificationSender(level, mcpDataPayload, serverName);
      } catch (sendError: unknown) {
        const errorMessage =
          sendError instanceof Error ? sendError.message : String(sendError);
        this.winstonLogger!.error('Failed to send MCP log notification', {
          requestId: context?.requestId || 'logger-internal-error',
          timestamp: new Date().toISOString(),
          originalLevel: level,
          originalMessage: msg,
          sendError: errorMessage,
        });
      }
    }
  }

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
    const errorObj =
      errorOrContext instanceof Error ? errorOrContext : undefined;
    const actualContext =
      errorOrContext instanceof Error ? context : errorOrContext;
    this.log('emerg', msg, actualContext, errorObj);
  }

  public logInteraction(
    interactionName: string,
    data: Record<string, unknown>,
  ): void {
    if (!this.interactionLogger) {
      this.warning(
        'Interaction logger not available. File logging may be disabled.',
        data.context as RequestContext,
      );
      return;
    }
    this.interactionLogger.info({ interactionName, ...data });
  }
}

export const logger = Logger.getInstance();
