import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BaseQueueProcessor } from './base-queue.processor';
import { SubtitleTranscriptionJobData } from '../types';
import { SUBTITLE_TRANSCRIPTION_QUEUES } from '../constant';
import { VideoPipelineOrchestrator } from 'src/videos/service/video-pipeline.orchestrator';

@Processor(SUBTITLE_TRANSCRIPTION_QUEUES.TRANSCRIPTION)
export class SubtitleTranscriptionProcessor extends BaseQueueProcessor<SubtitleTranscriptionJobData> {
  constructor(private readonly orchestrator: VideoPipelineOrchestrator) {
    super(SubtitleTranscriptionProcessor.name);
  }

  async process(job: Job<SubtitleTranscriptionJobData>): Promise<unknown> {
    const { videoProjectId } = job.data;
    this.logger.log(`Processing transcription/subtitles job for video ${videoProjectId}`);

    await this.orchestrator.runPipeline(videoProjectId);

    return { videoProjectId, status: 'completed' };
  }
}
