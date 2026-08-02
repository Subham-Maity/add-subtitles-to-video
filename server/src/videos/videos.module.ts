import { forwardRef, Module } from '@nestjs/common';
import { VideosController } from './controller';
import { VideoProjectRepository } from './repository';
import { QueueModule } from 'src/queue/queue.module';
import {
  VideoPipelineOrchestrator,
  AudioExtractionLayer,
  TranscriptionLayer,
  CueGenerationLayer,
  FfmpegRunnerHelper,
  FfprobeHelper,
  TranscriptionClientProvider,
} from './service';

@Module({
  imports: [forwardRef(() => QueueModule)],
  controllers: [VideosController],
  providers: [
    VideoProjectRepository,
    VideoPipelineOrchestrator,
    AudioExtractionLayer,
    TranscriptionLayer,
    CueGenerationLayer,
    FfmpegRunnerHelper,
    FfprobeHelper,
    TranscriptionClientProvider,
  ],
  exports: [
    VideoProjectRepository,
    VideoPipelineOrchestrator,
    FfmpegRunnerHelper,
  ],
})
export class VideosModule {}
