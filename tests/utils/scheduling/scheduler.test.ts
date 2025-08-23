/**
 * @fileoverview Tests for the SchedulerService singleton and job management functionality.
 * @module tests/utils/scheduling/scheduler.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SchedulerService } from "../../../src/utils/scheduling/scheduler.js";

// Mock only the utilities, keep node-cron real for validation
vi.mock("../../../src/utils/internal/index.js", () => ({
  logger: {
    info: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../../src/utils/internal/requestContext.js", () => ({
  requestContextService: {
    createRequestContext: vi.fn(() => ({
      requestId: "test-request-id",
      timestamp: new Date().toISOString(),
      jobId: "test-job",
      schedule: "* * * * *",
    })),
  },
}));

describe("SchedulerService", () => {
  let scheduler: SchedulerService;
  let mockTaskFunction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset singleton instance for clean tests
    (SchedulerService as unknown as { instance?: SchedulerService }).instance =
      undefined;

    scheduler = SchedulerService.getInstance();
    mockTaskFunction = vi.fn().mockResolvedValue(undefined);

    // Clear any existing jobs
    const existingJobs = scheduler.listJobs();
    existingJobs.forEach((job) => {
      try {
        scheduler.remove(job.id);
      } catch {
        // Job might already be removed
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up any remaining jobs
    const jobs = scheduler.listJobs();
    jobs.forEach((job) => {
      try {
        scheduler.remove(job.id);
      } catch {
        // Job might already be removed
      }
    });

    // Reset singleton for next test
    (SchedulerService as unknown as { instance?: SchedulerService }).instance =
      undefined;
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance when getInstance is called multiple times", () => {
      const instance1 = SchedulerService.getInstance();
      const instance2 = SchedulerService.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(scheduler);
    });
  });

  describe("schedule", () => {
    it("should throw error when scheduling job with duplicate ID", () => {
      const jobId = "duplicate-job";
      const schedule = "0 0 * * *";
      const description = "First job";

      scheduler.schedule(jobId, schedule, mockTaskFunction, description);

      expect(() => {
        scheduler.schedule(jobId, schedule, mockTaskFunction, "Second job");
      }).toThrow(`Job with ID '${jobId}' already exists.`);
    });

    it("should throw error when providing invalid cron schedule", () => {
      const jobId = "invalid-schedule-job";
      const invalidSchedule = "invalid cron pattern";
      const description = "Job with invalid schedule";

      expect(() => {
        scheduler.schedule(
          jobId,
          invalidSchedule,
          mockTaskFunction,
          description,
        );
      }).toThrow(`Invalid cron schedule: ${invalidSchedule}`);
    });

    it("should validate different cron patterns correctly", () => {
      const validSchedules = [
        "* * * * *", // Every minute
        "0 0 * * *", // Daily at midnight
        "0 0 * * 0", // Weekly on Sunday
        "0 0 1 * *", // Monthly on 1st
        "*/5 * * * *", // Every 5 minutes
      ];

      validSchedules.forEach((schedule, index) => {
        const jobId = `valid-job-${index}`;
        expect(() => {
          scheduler.schedule(
            jobId,
            schedule,
            mockTaskFunction,
            `Valid job ${index}`,
          );
        }).not.toThrow();
      });
    });
  });

  describe("start", () => {
    it("should throw error when starting non-existent job", () => {
      const nonExistentJobId = "non-existent-job";

      expect(() => {
        scheduler.start(nonExistentJobId);
      }).toThrow(`Job with ID '${nonExistentJobId}' not found.`);
    });
  });

  describe("stop", () => {
    it("should throw error when stopping non-existent job", () => {
      const nonExistentJobId = "non-existent-job";

      expect(() => {
        scheduler.stop(nonExistentJobId);
      }).toThrow(`Job with ID '${nonExistentJobId}' not found.`);
    });
  });

  describe("remove", () => {
    it("should throw error when removing non-existent job", () => {
      const nonExistentJobId = "non-existent-job";

      expect(() => {
        scheduler.remove(nonExistentJobId);
      }).toThrow(`Job with ID '${nonExistentJobId}' not found.`);
    });
  });

  describe("listJobs", () => {
    it("should return empty array when no jobs are scheduled", () => {
      const jobs = scheduler.listJobs();
      expect(jobs).toEqual([]);
    });

    it("should return all scheduled jobs", () => {
      const job1Id = "list-job-1";
      const job2Id = "list-job-2";

      const job1 = scheduler.schedule(
        job1Id,
        "0 0 * * *",
        mockTaskFunction,
        "First job",
      );
      const job2 = scheduler.schedule(
        job2Id,
        "0 12 * * *",
        mockTaskFunction,
        "Second job",
      );

      const jobs = scheduler.listJobs();

      expect(jobs).toHaveLength(2);
      expect(jobs).toContainEqual(job1);
      expect(jobs).toContainEqual(job2);
    });

    it("should reflect job state changes in listed jobs", () => {
      const jobId = "state-tracking-job";
      scheduler.schedule(
        jobId,
        "0 0 * * *",
        mockTaskFunction,
        "State tracking job",
      );

      const jobsBefore = scheduler.listJobs();
      expect(jobsBefore[0].isRunning).toBe(false);

      // Simulate job running state change
      const job = scheduler.listJobs()[0];
      job.isRunning = true;

      const jobsAfter = scheduler.listJobs();
      expect(jobsAfter[0].isRunning).toBe(true);
    });
  });

  describe("Integration with node-cron", () => {
    it("should use real cron validation for schedule patterns", () => {
      // Test that we're actually using node-cron's validation
      expect(() => {
        scheduler.schedule("test-job", "invalid", mockTaskFunction, "Test");
      }).toThrow("Invalid cron schedule: invalid");

      // Verify valid patterns work
      expect(() => {
        scheduler.schedule("valid-job", "0 0 * * *", mockTaskFunction, "Valid");
      }).not.toThrow();
    });

    it("should create actual ScheduledTask objects", () => {
      const job = scheduler.schedule(
        "task-test",
        "0 0 * * *",
        mockTaskFunction,
        "Task test",
      );

      // Verify the task has node-cron ScheduledTask methods
      expect(job.task).toHaveProperty("start");
      expect(job.task).toHaveProperty("stop");
      expect(typeof job.task.start).toBe("function");
      expect(typeof job.task.stop).toBe("function");
    });
  });
});
