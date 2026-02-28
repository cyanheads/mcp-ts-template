/**
 * @fileoverview Provides a singleton service for scheduling and managing cron jobs.
 * This service wraps the 'node-cron' library to offer a unified interface for
 * defining, starting, stopping, and listing recurring tasks within the application.
 * @module src/utils/scheduling/scheduler
 */
import type { ScheduledTask } from 'node-cron';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { logger } from '@/utils/internal/logger.js';
import type { RequestContext } from '@/utils/internal/requestContext.js';
import { requestContextService } from '@/utils/internal/requestContext.js';
import { runtimeCaps } from '@/utils/internal/runtime.js';

/**
 * Lazily loads the node-cron module. Cached after first successful import.
 * Throws McpError if called outside a Node.js runtime (e.g., Cloudflare Workers).
 */
let cronModulePromise: Promise<typeof import('node-cron')> | null = null;

async function loadCron(): Promise<typeof import('node-cron')> {
  if (!runtimeCaps.isNode) {
    throw new McpError(
      JsonRpcErrorCode.ConfigurationError,
      'SchedulerService requires a Node.js runtime. Cron scheduling is not available in Workers or browser environments.',
    );
  }
  if (!cronModulePromise) {
    cronModulePromise = import('node-cron');
  }
  return await cronModulePromise;
}

/**
 * Represents a scheduled job managed by the SchedulerService.
 */
export interface Job {
  /** A description of what the job does. */
  description: string;
  /** A unique identifier for the job. */
  id: string;
  /** Indicates whether the job is currently running. */
  isRunning: boolean;
  /** The cron pattern defining the job's schedule. */
  schedule: string;
  /** The underlying 'node-cron' task instance. */
  task: ScheduledTask;
}

/**
 * A singleton service for scheduling and managing cron jobs.
 */
export class SchedulerService {
  private static instance: SchedulerService;
  private jobs: Map<string, Job> = new Map();

  /** @private */
  private constructor() {
    // The constructor is intentionally left empty to prevent instantiation with 'new'.
    // Logging has been removed from here to break a circular dependency
    // with the logger, which was causing a ReferenceError on startup.
  }

  /**
   * Gets the singleton instance of the SchedulerService.
   * @returns The singleton SchedulerService instance.
   */
  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  /**
   * Schedules a new job.
   *
   * @param id - A unique identifier for the job.
   * @param schedule - The cron pattern for the schedule (e.g., '* * * * *').
   * @param taskFunction - The function to execute on schedule. It receives a RequestContext.
   * @param description - A description of the job.
   * @returns The newly created Job object.
   */
  public async schedule(
    id: string,
    schedule: string,
    taskFunction: (context: RequestContext) => void | Promise<void>,
    description: string,
  ): Promise<Job> {
    if (this.jobs.has(id)) {
      throw new McpError(JsonRpcErrorCode.Conflict, `Job with ID '${id}' already exists.`);
    }

    const cron = await loadCron();

    if (!cron.validate(schedule)) {
      throw new McpError(JsonRpcErrorCode.InvalidParams, `Invalid cron schedule: ${schedule}`);
    }

    const task = cron.createTask(schedule, async () => {
      const job = this.jobs.get(id);
      const context = requestContextService.createRequestContext({
        operation: `scheduler:job:${id}`,
        jobId: id,
        schedule,
      });

      if (job?.isRunning) {
        logger.warning(`Job '${id}' is already running. Skipping this execution.`, context);
        return;
      }

      if (job) {
        job.isRunning = true;
      }

      logger.info(`Starting job '${id}'...`, context);
      try {
        await Promise.resolve(taskFunction(context));
        logger.info(`Job '${id}' completed successfully.`, context);
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error(`Job '${id}' failed.`, err, context);
      } finally {
        if (job) {
          job.isRunning = false;
        }
      }
    });

    const newJob: Job = {
      id,
      schedule,
      description,
      task,
      isRunning: false,
    };

    const context = requestContextService.createRequestContext({
      operation: 'scheduler:schedule',
      jobId: id,
    });
    this.jobs.set(id, newJob);
    logger.info(`Job '${id}' scheduled: ${description}`, context);
    return newJob;
  }

  /**
   * Starts a scheduled job.
   * @param id - The ID of the job to start.
   */
  public start(id: string): void {
    const job = this.resolveJob(id);
    void job.task.start();
    const context = requestContextService.createRequestContext({
      operation: 'scheduler:start',
      jobId: id,
    });
    logger.info(`Job '${id}' started.`, context);
  }

  /**
   * Stops a scheduled job.
   * @param id - The ID of the job to stop.
   */
  public stop(id: string): void {
    const job = this.resolveJob(id);
    void job.task.stop();
    const context = requestContextService.createRequestContext({
      operation: 'scheduler:stop',
      jobId: id,
    });
    logger.info(`Job '${id}' stopped.`, context);
  }

  /**
   * Removes a job from the scheduler. The job is stopped before being removed.
   * @param id - The ID of the job to remove.
   */
  public remove(id: string): void {
    const job = this.resolveJob(id);
    void job.task.stop();
    this.jobs.delete(id);
    const context = requestContextService.createRequestContext({
      operation: 'scheduler:remove',
      jobId: id,
    });
    logger.info(`Job '${id}' removed.`, context);
  }

  /** Resolves a job by ID or throws NotFound. */
  private resolveJob(id: string): Job {
    const job = this.jobs.get(id);
    if (!job) {
      throw new McpError(JsonRpcErrorCode.NotFound, `Job with ID '${id}' not found.`);
    }
    return job;
  }

  /**
   * Gets a list of all scheduled jobs.
   * @returns An array of all Job objects.
   */
  public listJobs(): Job[] {
    return Array.from(this.jobs.values());
  }
}

/**
 * The singleton instance of the SchedulerService.
 * Use this instance for all job scheduling operations.
 */
export const schedulerService = SchedulerService.getInstance();
