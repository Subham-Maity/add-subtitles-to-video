import { Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BaseJobData } from '../types';

export abstract class BaseBullService<T extends BaseJobData> {
  protected readonly logger: Logger;

  constructor(
    protected readonly queue: Queue,
    protected readonly failedQueue: Queue,
    loggerContext: string,
  ) {
    this.logger = new Logger(loggerContext);
  }

  async addJob(
    jobData: Omit<T, 'jobId' | 'createdAt'>,
    opts?: Record<string, unknown>,
  ) {
    try {
      const enrichedData = {
        ...jobData,
        jobId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        createdAt: new Date(),
      } as T;

      const job = await this.queue.add(this.queue.name, enrichedData, {
        ...opts,
      });
      this.logger.log(`Added job ${job.id} to ${this.queue.name}`);
      return job;
    } catch (error) {
      this.logger.error(
        `Failed to add job to ${this.queue.name}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async addBulkJobs(
    items: Array<{
      data: Omit<T, 'jobId' | 'createdAt'>;
      opts?: Record<string, unknown>;
    }>,
  ) {
    const jobs = items.map((item) => ({
      name: this.queue.name,
      data: {
        ...item.data,
        jobId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        createdAt: new Date(),
      } as T,
      opts: item.opts ?? {},
    }));

    try {
      const added = await this.queue.addBulk(jobs);
      this.logger.log(`Added ${added.length} bulk jobs to ${this.queue.name}`);
      return added;
    } catch (error) {
      this.logger.error(
        `Failed to bulk-add jobs to ${this.queue.name}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async moveToFailedQueue(jobName: string, jobData: T) {
    try {
      await this.failedQueue.add(jobName, jobData);
      this.logger.log(`Moved job to failed queue: ${jobName}`);
    } catch (error) {
      this.logger.error(
        `Failed to move job to failed queue`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  async purgeQueue() {
    try {
      await this.queue.drain();
      await this.queue.clean(0, 1000, 'completed');
      await this.queue.clean(0, 1000, 'failed');
      await this.queue.clean(0, 1000, 'active');
      await this.queue.clean(0, 1000, 'wait');
      await this.queue.clean(0, 1000, 'delayed');
      this.logger.log(`Purged queue ${this.queue.name}`);
    } catch (error) {
      this.logger.error(`Failed to purge queue ${this.queue.name}`, (error as Error).stack);
    }
  }
}
