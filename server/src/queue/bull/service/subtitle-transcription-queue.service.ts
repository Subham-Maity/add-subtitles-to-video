import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { BaseBullService } from './base-bull.service';
import { SubtitleTranscriptionJobData } from '../types';
import { SUBTITLE_TRANSCRIPTION_QUEUES } from '../constant';

@Injectable()
export class SubtitleTranscriptionQueueService extends BaseBullService<SubtitleTranscriptionJobData> {
  constructor(
    @InjectQueue(SUBTITLE_TRANSCRIPTION_QUEUES.TRANSCRIPTION) queue: Queue,
    @InjectQueue('failed') failedQueue: Queue,
  ) {
    super(queue, failedQueue, SubtitleTranscriptionQueueService.name);
  }

  async addTranscriptionJob(
    data: Omit<SubtitleTranscriptionJobData, 'jobId' | 'createdAt'>,
    opts?: Record<string, unknown>,
  ) {
    return this.addJob(data, opts);
  }
}
