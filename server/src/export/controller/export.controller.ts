import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Res,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { ExportJobRepository } from '../repository';
import { ExportOrchestrator } from '../service';
import { CreateExportDto } from '../dto';
import { Observable, map } from 'rxjs';
import { VideoProjectRepository } from 'src/videos/repository';

@Controller()
export class ExportController {
  constructor(
    private readonly exportRepo: ExportJobRepository,
    private readonly orchestrator: ExportOrchestrator,
    private readonly videoRepo: VideoProjectRepository,
  ) {}

  @Post('videos/:id/export')
  async createExport(
    @Param('id') videoProjectId: string,
    @Body() dto: CreateExportDto,
  ) {
    // Guard: verify the video project exists before touching the DB export table
    const video = await this.videoRepo.findById(videoProjectId);
    if (!video) {
      throw new NotFoundException(`Video project '${videoProjectId}' not found. It may have been deleted.`);
    }

    const job = await this.exportRepo.create({
      videoProjectId,
      mode: dto.mode,
      format: dto.format,
      backgroundHex: dto.backgroundHex,
      includeAudio: dto.includeAudio,
    });

    // Run export in background
    this.orchestrator.startExport(job.id).catch(() => {});

    return job;
  }

  @Sse('exports/:jobId/progress')
  sseProgress(@Param('jobId') jobId: string): Observable<MessageEvent> {
    return this.orchestrator.getEventStream(jobId).pipe(
      map((event) => ({
        data: event,
      })),
    );
  }

  @Get('exports/:jobId/download')
  async downloadExport(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    const job = await this.exportRepo.findById(jobId);
    if (!job || !job.outputPath || !fs.existsSync(job.outputPath)) {
      throw new NotFoundException('Exported file not found');
    }

    const filename = path.basename(job.outputPath);
    res.download(path.resolve(job.outputPath), filename);
  }
}
