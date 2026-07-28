import { Module } from '@nestjs/common';
import { VideosController } from './controller';
import { VideoProjectRepository } from './repository';
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
