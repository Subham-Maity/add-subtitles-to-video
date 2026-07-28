import { Module } from '@nestjs/common';
import { SubtitlesController } from './controller';
import { SubtitleService } from './service';
import { SubtitleCueRepository, SubtitleStyleRepository } from './repository';
import { VideosModule } from 'src/videos';
import { CueGenerationLayer } from 'src/videos/service/core';

@Module({
  imports: [VideosModule],
  controllers: [SubtitlesController],
  providers: [
    SubtitleService,
    SubtitleCueRepository,
    SubtitleStyleRepository,
    CueGenerationLayer,
  ],
  exports: [SubtitleService, SubtitleCueRepository, SubtitleStyleRepository],
})
export class SubtitlesModule {}
