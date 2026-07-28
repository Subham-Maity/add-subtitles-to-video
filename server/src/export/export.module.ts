import { Module } from '@nestjs/common';
import { ExportController } from './controller';
import {
  ExportOrchestrator,
  AssBuilderLayer,
  OverlayRenderLayer,
  CaptionsOnlyRenderLayer,
} from './service';
import { ExportJobRepository } from './repository';
import { VideosModule } from 'src/videos';
import { FontsModule } from 'src/fonts';

@Module({
  imports: [VideosModule, FontsModule],
  controllers: [ExportController],
  providers: [
    ExportOrchestrator,
    AssBuilderLayer,
    OverlayRenderLayer,
    CaptionsOnlyRenderLayer,
    ExportJobRepository,
  ],
  exports: [ExportOrchestrator, ExportJobRepository],
})
export class ExportModule {}
