/**
 * @fileoverview Pino-backed singleton logger with environment-adaptive output.
 * Implements RFC5424 level mapping, structured context, automatic trace injection via
 * OpenTelemetry, and graceful shutdown. In a serverless environment (like Cloudflare
 * Workers), it uses a lightweight console-based logger.
 * @module src/utils/internal/logger
 */
import type { LevelWithSilent, Logger as PinoLogger } from 'pino';
import pino from 'pino';

import { config } from '@/config/index.js';
import { type RequestContext, requestContextService } from '@/utils/internal/requestContext.js';

/**
 * RFC 5424 severity levels supported by the MCP logger, ordered from least to most severe.
 * These map internally to Pino levels for transport compatibility:
 * - `debug` → pino `debug`
 * - `info` / `notice` → pino `info`
 * - `warning` → pino `warn`
 * - `error` / `crit` → pino `error`
 * - `alert` / `emerg` → pino `fatal`
 */
export type McpLogLevel =
  | 'debug'
  | 'info'
  | 'notice'
  | 'warning'
  | 'error'
  | 'crit'
  | 'alert'
  | 'emerg';

const mcpToPinoLevel: Record<McpLogLevel, LevelWithSilent> = {
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
  fatal: 0,
  error: 2,
  warn: 4,
  info: 6,
  debug: 7,
};

const isServerless = typeof process === 'undefined' || process.env.IS_SERVERLESS === 'true';

/** Pino redact paths for sensitive fields (top-level, one-deep, two-deep). */
const SENSITIVE_PINO_FIELDS: string[] = [
  'password',
  'token',
  'secret',
  'apiKey',
  'credential',
  'jwt',
  'ssn',
  'cvv',
  'authorization',
  'cookie',
  'clientsecret',
  'client_secret',
  'private_key',
  'privatekey',
].flatMap((field) => [field, `*.${field}`, `*.*.${field}`]);

/**
 * Singleton structured logger backed by Pino with RFC 5424 level semantics.
 *
 * Features:
 * - Environment-adaptive output: pretty-printed (pino-pretty) in HTTP development mode,
 *   JSON to stderr in stdio/production mode (MCP spec requires clean stdout).
 * - Optional file sinks: `combined.log` at the configured log level, `error.log` for
 *   errors and above, and `interactions.log` for structured interaction records.
 * - Sensitive field redaction via Pino's `redact` option.
 * - Per-message rate limiting to suppress log storms; suppressed counts are flushed
 *   at the end of each rate-limit window.
 * - OpenTelemetry trace context is auto-injected via {@link RequestContext} fields.
 * - Serverless-safe: when `IS_SERVERLESS=true` or `process` is unavailable, falls
 *   back to minimal Pino config without file transports or Node.js APIs.
 *
 * Obtain the singleton via {@link logger} or `Logger.getInstance()`.
 */
export class Logger {
  private static readonly instance: Logger = new Logger();
  private pinoLogger?: PinoLogger;
  private interactionLogger?: PinoLogger | undefined;
  private initialized = false;
  private currentMcpLevel: McpLogLevel = 'info';
  private transportType: 'stdio' | 'http' | undefined;

  private rateLimitThreshold = 10;
  private rateLimitWindow = 60000;
  private messageCounts = new Map<string, { count: number; firstSeen: number }>();
  private suppressedMessages = new Map<string, number>();
  private cleanupTimer?: NodeJS.Timeout;

  private constructor() {
    // The constructor is now safe to call in a global scope.
  }

  /**
   * Returns the singleton `Logger` instance.
   *
   * Prefer importing the pre-resolved {@link logger} export rather than calling this directly.
   *
   * @returns The singleton `Logger` instance.
   * @example
   * ```ts
   * import { Logger } from '@/utils/internal/logger.js';
   * const log = Logger.getInstance();
   * ```
   */
  public static getInstance(): Logger {
    return Logger.instance;
  }

  private async createPinoLogger(
    level: McpLogLevel,
    transportType?: 'stdio' | 'http',
  ): Promise<PinoLogger> {
    const pinoLevel = mcpToPinoLevel[level] ?? 'info';

    const pinoOptions: pino.LoggerOptions = {
      level: pinoLevel,
      base: {
        env: config.environment,
        version: config.mcpServerVersion,
        pid: !isServerless ? process.pid : undefined,
      },
      redact: {
        paths: SENSITIVE_PINO_FIELDS,
        censor: '[REDACTED]',
      },
    };

    if (isServerless) {
      return pino(pinoOptions);
    }

    // Node.js specific transports
    const { default: fs } = await import('node:fs');
    const { default: path } = await import('node:path');

    const transports: pino.TransportTargetOptions[] = [];
    const isDevelopment = config.environment === 'development';
    const isTest = config.environment === 'testing';

    // CRITICAL: STDIO transport MUST NOT output colored logs to stdout.
    // The MCP specification requires clean JSON-RPC on stdout with no ANSI codes.
    // Only use pretty/colored output for HTTP mode or when explicitly debugging.
    // Respect NO_COLOR environment variable (https://no-color.org/)
    const noColorEnv = process.env.NO_COLOR === '1' || process.env.FORCE_COLOR === '0';
    const useColoredOutput = isDevelopment && transportType !== 'stdio' && !noColorEnv;

    if (useColoredOutput && !isServerless) {
      // Try to resolve 'pino-pretty' robustly even when bundled (e.g., Bun/ESM),
      // falling back to JSON stdout if resolution fails.
      try {
        const { createRequire } = await import('node:module');
        const require = createRequire(import.meta.url);
        const prettyTarget = require.resolve('pino-pretty');
        transports.push({
          target: prettyTarget,
          options: { colorize: true, translateTime: 'yyyy-mm-dd HH:MM:ss' },
        });
      } catch (err) {
        // Only log to console if TTY to avoid polluting stderr in STDIO mode
        if (process.stderr?.isTTY) {
          console.warn(
            `[Logger Init] Pretty transport unavailable (${err instanceof Error ? err.message : String(err)}); falling back to stdout JSON.`,
          );
        }
        transports.push({ target: 'pino/file', options: { destination: 1 } });
      }
    } else if (!isTest) {
      // CRITICAL: For STDIO transport, logs MUST go to stderr (fd 2), NOT stdout (fd 1).
      // The MCP specification requires only JSON-RPC messages on stdout.
      // For HTTP transport or production, we also use stderr to avoid polluting stdout.
      transports.push({ target: 'pino/file', options: { destination: 2 } });
    }

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
        // Only log to console if TTY to avoid polluting stderr in STDIO mode
        if (process.stderr?.isTTY) {
          console.error(
            `[Logger Init] Failed to configure file logging: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }

    return pino({ ...pinoOptions, transport: { targets: transports } });
  }

  private async createInteractionLogger(): Promise<PinoLogger | undefined> {
    if (isServerless || !config.logsPath) return;

    const { default: path } = await import('node:path');
    return pino({
      redact: {
        paths: SENSITIVE_PINO_FIELDS,
        censor: '[REDACTED]',
      },
      transport: {
        target: 'pino/file',
        options: {
          destination: path.join(config.logsPath, 'interactions.log'),
          mkdir: true,
        },
      },
    });
  }

  /**
   * Initializes the logger, constructing Pino transports appropriate for the environment.
   *
   * Must be called once at server startup before any log methods are used. Subsequent calls
   * are no-ops (a warning is emitted instead). After initialization, a startup `info` entry
   * is written confirming the active level.
   *
   * @param level - MCP log level to apply. Defaults to `'info'`.
   * @param transportType - Active transport (`'stdio'` or `'http'`). Determines whether
   *   colored pretty-print output is enabled. In `'stdio'` mode, logs are always written
   *   to stderr (fd 2) to preserve stdout for MCP JSON-RPC.
   * @returns Promise that resolves when Pino transports and file sinks are ready.
   * @example
   * ```ts
   * await logger.initialize('debug', 'http');
   * ```
   */
  public async initialize(
    level: McpLogLevel = 'info',
    transportType?: 'stdio' | 'http',
  ): Promise<void> {
    if (this.initialized) {
      this.warning(
        'Logger already initialized.',
        requestContextService.createRequestContext({
          operation: 'loggerReinit',
        }),
      );
      return;
    }
    this.currentMcpLevel = level;
    this.transportType = transportType;
    this.pinoLogger = await this.createPinoLogger(level, transportType);
    this.interactionLogger = await this.createInteractionLogger();

    // Start the cleanup timer only after initialization and only in Node.js
    if (!isServerless && !this.cleanupTimer) {
      this.cleanupTimer = setInterval(() => this.flushSuppressedMessages(), this.rateLimitWindow);
      this.cleanupTimer.unref?.();
    }

    this.initialized = true;
    this.info(
      `Logger initialized. MCP level: ${level}.`,
      requestContextService.createRequestContext({ operation: 'loggerInit' }),
    );
  }

  /**
   * Changes the active log level at runtime without restarting transports.
   *
   * Has no effect if the logger has not been initialized; a console error is emitted
   * to stderr when running in a TTY. After the level is updated, an `info` entry is
   * written to confirm the change.
   *
   * @param newLevel - The new MCP log level to apply.
   * @example
   * ```ts
   * logger.setLevel('debug');
   * ```
   */
  public setLevel(newLevel: McpLogLevel): void {
    if (!this.pinoLogger || !this.initialized) {
      // Only log to console if TTY to avoid polluting stderr in STDIO mode
      if (process.stderr?.isTTY) {
        console.error('Cannot set level: Logger not initialized.');
      }
      return;
    }
    this.currentMcpLevel = newLevel;
    this.pinoLogger.level = mcpToPinoLevel[newLevel] ?? 'info';
    this.info(
      `Log level changed to ${newLevel}.`,
      requestContextService.createRequestContext({
        operation: 'loggerSetLevel',
      }),
    );
  }

  /**
   * Implements the `AsyncDisposable` protocol (`await using logger`).
   *
   * Delegates to {@link close}. Allows the logger to be used with `await using` in
   * TypeScript 5.2+ explicit resource management contexts.
   *
   * @returns Promise that resolves when all transports have been flushed and closed.
   */
  async [Symbol.asyncDispose](): Promise<void> {
    return await this.close();
  }

  /**
   * Flushes all pending log entries and shuts down transports gracefully.
   *
   * Clears the rate-limit cleanup timer, flushes any suppressed message counts,
   * and waits for both the main Pino logger and the interaction logger to drain
   * before resolving. Safe to call multiple times — subsequent calls on an
   * already-closed logger resolve immediately.
   *
   * @returns Promise that resolves when all writes have completed.
   * @example
   * ```ts
   * process.on('SIGTERM', () => logger.close());
   * ```
   */
  public async close(): Promise<void> {
    if (!this.initialized) return Promise.resolve();
    this.info(
      'Logger shutting down.',
      requestContextService.createRequestContext({ operation: 'loggerClose' }),
    );
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    this.flushSuppressedMessages();

    // Wait for all pending writes to complete
    const flushPino = (pinoInstance: PinoLogger | undefined, label: string) => {
      const { promise, resolve } = Promise.withResolvers<void>();
      if (pinoInstance != null) {
        pinoInstance.flush((err) => {
          // Only log to console if TTY AND not in STDIO mode
          // In STDIO mode, stdout is reserved for MCP JSON-RPC, so avoid polluting stderr with shutdown noise
          if (err && process.stderr?.isTTY && this.transportType !== 'stdio') {
            console.error(`Error flushing ${label}:`, err);
          }
          resolve();
        });
      } else {
        resolve();
      }
      return promise;
    };

    await Promise.all([
      flushPino(this.pinoLogger, 'main logger'),
      flushPino(this.interactionLogger, 'interaction logger'),
    ]);

    this.initialized = false;
  }

  /**
   * Returns whether the logger has been successfully initialized.
   *
   * Use this to guard code that should only run after {@link initialize} has resolved,
   * or to skip logging in contexts where initialization may not have occurred.
   *
   * @returns `true` if {@link initialize} has completed and {@link close} has not yet been called.
   * @example
   * ```ts
   * if (logger.isInitialized()) {
   *   logger.info('Server ready', ctx);
   * }
   * ```
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  private isRateLimited(message: string): boolean {
    const now = Date.now();
    const entry = this.messageCounts.get(message);
    if (!entry) {
      this.messageCounts.set(message, { count: 1, firstSeen: now });
      return false;
    }
    if (now - entry.firstSeen > this.rateLimitWindow) {
      this.messageCounts.set(message, { count: 1, firstSeen: now });
      return false;
    }
    entry.count++;
    if (entry.count > this.rateLimitThreshold) {
      this.suppressedMessages.set(message, (this.suppressedMessages.get(message) || 0) + 1);
      return true;
    }
    return false;
  }

  private flushSuppressedMessages(): void {
    if (this.suppressedMessages.size === 0) return;
    for (const [message, count] of this.suppressedMessages.entries()) {
      this.warning(
        `Log message suppressed ${count} times due to rate limiting.`,
        requestContextService.createRequestContext({
          operation: 'loggerRateLimitFlush',
          additionalContext: { originalMessage: message },
        }),
      );
    }
    this.suppressedMessages.clear();
    this.messageCounts.clear();
  }

  private log(level: McpLogLevel, msg: string, context?: RequestContext, error?: Error): void {
    if (!this.pinoLogger || !this.initialized) return;

    const pinoLevel = mcpToPinoLevel[level] ?? 'info';
    const currentPinoLevel = mcpToPinoLevel[this.currentMcpLevel] ?? 'info';

    const levelSeverity = pinoToMcpLevelSeverity[pinoLevel];
    const currentLevelSeverity = pinoToMcpLevelSeverity[currentPinoLevel];

    if (
      typeof levelSeverity === 'number' &&
      typeof currentLevelSeverity === 'number' &&
      levelSeverity > currentLevelSeverity
    ) {
      return;
    }

    if (this.isRateLimited(msg)) return;

    const logObject: Record<string, unknown> = { ...context };
    if (error) logObject.err = pino.stdSerializers.err(error);

    this.pinoLogger[pinoLevel](logObject, msg);
  }

  private logWithError(
    level: McpLogLevel,
    msg: string,
    errorOrContext: Error | RequestContext,
    context?: RequestContext,
  ): void {
    const errorObj = errorOrContext instanceof Error ? errorOrContext : undefined;
    const actualContext = errorOrContext instanceof Error ? context : errorOrContext;
    this.log(level, msg, actualContext, errorObj);
  }

  /**
   * Logs a diagnostic message at `debug` severity (RFC 5424 level 7).
   *
   * Suppressed unless the active log level is `'debug'`. Use for verbose tracing,
   * internal state dumps, and low-level request/response details.
   *
   * @param msg - Human-readable log message.
   * @param context - Optional request context providing `requestId`, `traceId`, and related fields.
   * @example
   * ```ts
   * logger.debug('Cache miss', ctx);
   * ```
   */
  public debug(msg: string, context?: RequestContext): void {
    this.log('debug', msg, context);
  }

  /**
   * Logs an informational message at `info` severity (RFC 5424 level 6).
   *
   * Use for normal operational events: server startup, request completions, configuration loaded.
   *
   * @param msg - Human-readable log message.
   * @param context - Optional request context.
   * @example
   * ```ts
   * logger.info('Server listening on :3000', ctx);
   * ```
   */
  public info(msg: string, context?: RequestContext): void {
    this.log('info', msg, context);
  }

  /**
   * Logs a notice-level message at `notice` severity (RFC 5424 level 5).
   *
   * Use for significant but non-error conditions: configuration changes, deprecation notices,
   * expected state transitions worth tracking. Maps to pino `info` level internally.
   *
   * @param msg - Human-readable log message.
   * @param context - Optional request context.
   * @example
   * ```ts
   * logger.notice('Feature flag toggled', ctx);
   * ```
   */
  public notice(msg: string, context?: RequestContext): void {
    this.log('notice', msg, context);
  }

  /**
   * Logs a warning message at `warning` severity (RFC 5424 level 4).
   *
   * Use for recoverable abnormal conditions: deprecated API usage, retried operations,
   * non-fatal misconfigurations. Maps to pino `warn` level internally.
   *
   * @param msg - Human-readable log message.
   * @param context - Optional request context.
   * @example
   * ```ts
   * logger.warning('Rate limit approaching', ctx);
   * ```
   */
  public warning(msg: string, context?: RequestContext): void {
    this.log('warning', msg, context);
  }

  /**
   * Logs an error-level message at `error` severity (RFC 5424 level 3).
   *
   * Use when an operation fails but the server can continue. The `errorOrContext`
   * parameter accepts either an `Error` (serialized via `pino.stdSerializers.err`) or a
   * `RequestContext` when no error object is available. Maps to pino `error` level.
   *
   * @param msg - Human-readable description of the failure.
   * @param errorOrContext - The `Error` to serialize, or a `RequestContext` if no error object exists.
   * @param context - Request context; required when `errorOrContext` is an `Error`.
   * @example
   * ```ts
   * logger.error('Failed to fetch resource', err, ctx);
   * logger.error('Invalid state encountered', ctx);
   * ```
   */
  public error(
    msg: string,
    errorOrContext: Error | RequestContext,
    context?: RequestContext,
  ): void {
    this.logWithError('error', msg, errorOrContext, context);
  }

  /**
   * Logs a critical error at `crit` severity (RFC 5424 level 2).
   *
   * Use for serious failures that impair a subsystem but do not crash the process —
   * for example, a storage provider going offline. Maps to pino `error` level.
   *
   * @param msg - Human-readable description of the critical condition.
   * @param errorOrContext - The `Error` to serialize, or a `RequestContext` if no error object exists.
   * @param context - Request context; required when `errorOrContext` is an `Error`.
   * @example
   * ```ts
   * logger.crit('Database connection pool exhausted', err, ctx);
   * ```
   */
  public crit(msg: string, errorOrContext: Error | RequestContext, context?: RequestContext): void {
    this.logWithError('crit', msg, errorOrContext, context);
  }

  /**
   * Logs an alert-level message at `alert` severity (RFC 5424 level 1).
   *
   * Use when immediate human intervention is required — for example, a security breach
   * detected or critical data loss imminent. Maps to pino `fatal` level.
   *
   * @param msg - Human-readable description of the alert condition.
   * @param errorOrContext - The `Error` to serialize, or a `RequestContext` if no error object exists.
   * @param context - Request context; required when `errorOrContext` is an `Error`.
   * @example
   * ```ts
   * logger.alert('Unauthorized admin access detected', err, ctx);
   * ```
   */
  public alert(
    msg: string,
    errorOrContext: Error | RequestContext,
    context?: RequestContext,
  ): void {
    this.logWithError('alert', msg, errorOrContext, context);
  }

  /**
   * Logs an emergency-level message at `emerg` severity (RFC 5424 level 0).
   *
   * Use for conditions that render the system completely unusable — process about to exit,
   * unrecoverable internal state. Maps to pino `fatal` level.
   *
   * @param msg - Human-readable description of the emergency.
   * @param errorOrContext - The `Error` to serialize, or a `RequestContext` if no error object exists.
   * @param context - Request context; required when `errorOrContext` is an `Error`.
   * @example
   * ```ts
   * logger.emerg('Unrecoverable state — shutting down', err, ctx);
   * ```
   */
  public emerg(
    msg: string,
    errorOrContext: Error | RequestContext,
    context?: RequestContext,
  ): void {
    this.logWithError('emerg', msg, errorOrContext, context);
  }

  /**
   * Alias for {@link emerg}. Provided for callers familiar with the pino/winston `fatal` level.
   *
   * Maps to RFC 5424 `emerg` (level 0) and pino `fatal` internally.
   *
   * @param msg - Human-readable description of the fatal condition.
   * @param errorOrContext - The `Error` to serialize, or a `RequestContext` if no error object exists.
   * @param context - Request context; required when `errorOrContext` is an `Error`.
   * @example
   * ```ts
   * logger.fatal('Process terminating due to unhandled exception', err, ctx);
   * ```
   */
  public fatal(
    msg: string,
    errorOrContext: Error | RequestContext,
    context?: RequestContext,
  ): void {
    this.emerg(msg, errorOrContext, context);
  }

  /**
   * Writes a structured interaction record to the dedicated `interactions.log` file sink.
   *
   * Interaction logs capture high-level semantic events (tool invocations, resource reads,
   * prompt renders) as structured JSON, separate from the main operational log stream.
   * This sink is only available when `config.logsPath` is set and the runtime is not serverless;
   * a `warning` is emitted if the logger is called before the sink is ready.
   *
   * @param interactionName - Identifier for the interaction type (e.g., `'tool:my_tool'`).
   * @param data - Arbitrary structured data to include alongside `interactionName` in the log record.
   * @example
   * ```ts
   * logger.logInteraction('tool:echo_message', { requestId: ctx.requestId, input });
   * ```
   */
  public logInteraction(interactionName: string, data: Record<string, unknown>): void {
    if (!this.interactionLogger) {
      if (!isServerless)
        this.warning('Interaction logger not available.', (data.context || {}) as RequestContext);
      return;
    }
    this.interactionLogger.info({ interactionName, ...data });
  }
}

/**
 * Pre-resolved singleton logger instance. Import this directly rather than calling
 * `Logger.getInstance()` in most contexts.
 *
 * Must be initialized once at startup via `logger.initialize()` before any log methods
 * will produce output. Log calls made before initialization are silently dropped.
 *
 * @example
 * ```ts
 * import { logger } from '@/utils/internal/logger.js';
 *
 * // At startup:
 * await logger.initialize('debug', 'http');
 *
 * // In application code:
 * logger.info('Request received', ctx);
 * logger.error('Upstream failure', err, ctx);
 * ```
 */
export const logger = Logger.getInstance();
