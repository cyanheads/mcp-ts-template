/**
 * @fileoverview Test suite for scheduling utilities barrel export
 * @module tests/utils/scheduling/index.test
 */

import { describe, expect, it } from 'vitest';

describe('Scheduling Utilities Barrel Export', () => {
  describe('Class Exports', () => {
    it('should export SchedulerService class', async () => {
      const { SchedulerService } = await import('@/utils/scheduling/index.js');

      expect(SchedulerService).toBeDefined();
      expect(typeof SchedulerService).toBe('function');
    });

    it('should allow instantiating SchedulerService via getInstance', async () => {
      const { SchedulerService } = await import('@/utils/scheduling/index.js');

      const instance = SchedulerService.getInstance();
      expect(instance).toBeInstanceOf(SchedulerService);
    });

    it('should export SchedulerService as singleton', async () => {
      const { SchedulerService } = await import('@/utils/scheduling/index.js');

      const instance1 = SchedulerService.getInstance();
      const instance2 = SchedulerService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Singleton Instance Export', () => {
    it('should export schedulerService singleton instance', async () => {
      const { schedulerService } = await import('@/utils/scheduling/index.js');

      expect(schedulerService).toBeDefined();
      expect(typeof schedulerService).toBe('object');
    });

    it('should have schedule method on singleton', async () => {
      const { schedulerService } = await import('@/utils/scheduling/index.js');

      expect(schedulerService.schedule).toBeDefined();
      expect(typeof schedulerService.schedule).toBe('function');
    });

    it('should have start method on singleton', async () => {
      const { schedulerService } = await import('@/utils/scheduling/index.js');

      expect(schedulerService.start).toBeDefined();
      expect(typeof schedulerService.start).toBe('function');
    });

    it('should have stop method on singleton', async () => {
      const { schedulerService } = await import('@/utils/scheduling/index.js');

      expect(schedulerService.stop).toBeDefined();
      expect(typeof schedulerService.stop).toBe('function');
    });

    it('should have remove method on singleton', async () => {
      const { schedulerService } = await import('@/utils/scheduling/index.js');

      expect(schedulerService.remove).toBeDefined();
      expect(typeof schedulerService.remove).toBe('function');
    });

    it('should have listJobs method on singleton', async () => {
      const { schedulerService } = await import('@/utils/scheduling/index.js');

      expect(schedulerService.listJobs).toBeDefined();
      expect(typeof schedulerService.listJobs).toBe('function');
    });
  });

  describe('Type Exports', () => {
    it('should export Job interface type', async () => {
      const schedulingModule = await import('@/utils/scheduling/index.js');

      // Job interface is used in SchedulerService methods
      // Verify module loads successfully
      expect(schedulingModule).toBeDefined();
    });
  });

  describe('Complete Export Verification', () => {
    it('should export all expected symbols', async () => {
      const schedulingModule = await import('@/utils/scheduling/index.js');

      const expectedExports = ['SchedulerService', 'schedulerService'];

      expectedExports.forEach((exportName) => {
        expect(schedulingModule).toHaveProperty(exportName);
      });
    });

    it('should have consistent singleton instances', async () => {
      const { SchedulerService, schedulerService } = await import(
        '@/utils/scheduling/index.js'
      );

      const instance = SchedulerService.getInstance();
      expect(instance).toBe(schedulerService);
    });
  });

  describe('Functional Integration', () => {
    it('should allow calling listJobs through barrel export', async () => {
      const { schedulerService } = await import('@/utils/scheduling/index.js');

      const jobs = schedulerService.listJobs();
      expect(Array.isArray(jobs)).toBe(true);
    });

    it('should allow scheduling a job through barrel export', async () => {
      const { schedulerService } = await import('@/utils/scheduling/index.js');

      const jobId = `test-job-${Date.now()}`;
      const schedule = '*/5 * * * * *'; // Every 5 seconds
      const taskFn = () => {
        // Test task
      };

      const job = schedulerService.schedule(
        jobId,
        schedule,
        taskFn,
        'Test job',
      );

      expect(job).toBeDefined();
      expect(job.id).toBe(jobId);
      expect(job.schedule).toBe(schedule);
      expect(job.description).toBe('Test job');

      // Clean up
      schedulerService.remove(jobId);
    });

    it('should allow using SchedulerService class through barrel export', async () => {
      const { SchedulerService } = await import('@/utils/scheduling/index.js');

      const service = SchedulerService.getInstance();
      const jobs = service.listJobs();

      expect(Array.isArray(jobs)).toBe(true);
    });
  });
});
