import { Logger } from '@nestjs/common';
import { WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BaseJobData } from '../types';

export abstract class BaseQueueProcessor<
  T extends BaseJobData,
> extends WorkerHost {
  protected readonly logger: Logger;

  constructor(loggerContext: string) {
    super();
    this.logger = new Logger(loggerContext);
  }

  // Subclasses MUST implement this — it is the worker entry point
  abstract process(job: Job<T>): Promise<unknown>;

  @OnWorkerEvent('active')
  onActive(job: Job<T>) {
    this.logger.log(`Processing job ${job.id} [${job.name}]`);
  }

  @OnWorkerEvent('completed')
  onComplete(job: Job<T>) {
    this.logger.log(`Job ${job.id} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<T> | undefined, error: Error) {
    this.logger.error(`Job ${job?.id} failed: ${error.message}`, error.stack);
  }

  @OnWorkerEvent('stalled')
  onStalled(jobId: string) {
    this.logger.warn(`Job ${jobId} stalled — will be re-queued automatically`);
  }
}
