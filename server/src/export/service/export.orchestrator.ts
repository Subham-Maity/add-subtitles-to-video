import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';
import { ExportJobRepository } from '../repository';
import { AssBuilderLayer, OverlayRenderLayer, CaptionsOnlyRenderLayer } from './core';
import { ExportProgressEvent } from '../types';
import { ExportStatus } from '@prisma/client';

@Injectable()
export class ExportOrchestrator {
  private readonly logger = new Logger(ExportOrchestrator.name);
  private readonly eventStreams = new Map<string, Subject<ExportProgressEvent>>();
  private readonly storageDir: string;

  constructor(
    private readonly exportRepo: ExportJobRepository,
    private readonly assBuilder: AssBuilderLayer,
    private readonly overlayRender: OverlayRenderLayer,
    private readonly captionsOnlyRender: CaptionsOnlyRenderLayer,
    config: ConfigService,
  ) {
    this.storageDir = path.resolve(
      config.get<string>('STORAGE_DIR', '../storage'),
    );
  }

  getEventStream(jobId: string): Observable<ExportProgressEvent> {
    if (!this.eventStreams.has(jobId)) {
      this.eventStreams.set(jobId, new Subject<ExportProgressEvent>());
    }
    return this.eventStreams.get(jobId)!.asObservable();
  }

  private emitEvent(jobId: string, event: ExportProgressEvent) {
    const stream = this.eventStreams.get(jobId);
    if (stream) {
      stream.next(event);
    }
  }

  async startExport(jobId: string): Promise<void> {
    try {
      const job = await this.exportRepo.findById(jobId);
      if (!job) throw new NotFoundException('Export job not found');

      await this.exportRepo.updateProgress(jobId, 10, ExportStatus.RENDERING);
      this.emitEvent(jobId, { type: 'progress', progressPct: 10 });

      const exportDir = path.join(this.storageDir, 'exports', job.videoProjectId);
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      const assPath = this.assBuilder.buildAssFile(
        job.video.cues,
        job.video.style,
        exportDir,
        { width: job.video.width, height: job.video.height },
      );

      const ext = job.format === 'MOV' ? '.mov' : '.mp4';
      const outputPath = path.join(exportDir, `${job.id}${ext}`);

      await this.exportRepo.updateProgress(jobId, 25);
      this.emitEvent(jobId, { type: 'progress', progressPct: 25 });

      const onRenderProgress = (pct: number) => {
        this.exportRepo.updateProgress(jobId, pct);
        this.emitEvent(jobId, { type: 'progress', progressPct: pct });
      };

      if (job.mode === 'OVERLAY') {
        await this.overlayRender.render(
          job.video.storagePath,
          assPath,
          outputPath,
          job.video.durationMs,
          onRenderProgress,
        );
      } else {
        await this.captionsOnlyRender.render(
          job.video.storagePath,
          assPath,
          outputPath,
          {
            width: job.video.width,
            height: job.video.height,
            fps: job.video.fps,
            durationMs: job.video.durationMs,
            backgroundHex: job.backgroundHex || '#000000',
            includeAudio: job.includeAudio,
          },
          onRenderProgress,
        );
      }

      await this.exportRepo.updateComplete(jobId, outputPath);
      this.emitEvent(jobId, {
        type: 'done',
        progressPct: 100,
        outputPath,
      });
    } catch (error: any) {
      this.logger.error(`Export failed for job ${jobId}: ${error.message}`, error.stack);
      await this.exportRepo.updateFailed(jobId, error.message);
      this.emitEvent(jobId, { type: 'error', message: error.message });
    }
  }
}
