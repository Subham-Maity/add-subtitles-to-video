import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import * as path from 'path';
import { PipelineStatus } from '@prisma/client';
import { VideoProjectRepository } from 'src/videos/repository';
import { AudioExtractionLayer, TranscriptionLayer, CueGenerationLayer } from './core';
import { PipelineProgressEvent } from 'src/videos/types';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class VideoPipelineOrchestrator {
  private readonly logger = new Logger(VideoPipelineOrchestrator.name);
  private readonly inFlight = new Set<string>();
  private readonly eventStreams = new Map<string, Subject<PipelineProgressEvent>>();

  constructor(
    private readonly videoRepo: VideoProjectRepository,
    private readonly audioExtraction: AudioExtractionLayer,
    private readonly transcription: TranscriptionLayer,
    private readonly cueGeneration: CueGenerationLayer,
    private readonly prisma: PrismaService,
  ) {}

  getEventStream(videoId: string): Observable<PipelineProgressEvent> {
    if (!this.eventStreams.has(videoId)) {
      this.eventStreams.set(videoId, new Subject<PipelineProgressEvent>());
    }
    return this.eventStreams.get(videoId)!.asObservable();
  }

  private emitEvent(videoId: string, event: PipelineProgressEvent) {
    const stream = this.eventStreams.get(videoId);
    if (stream) {
      stream.next(event);
    }
  }

  async runPipeline(videoId: string): Promise<void> {
    if (this.inFlight.has(videoId)) {
      throw new ConflictException('Video processing is already in progress');
    }

    this.inFlight.add(videoId);

    try {
      const project = await this.videoRepo.findById(videoId);
      if (!project) throw new Error('Video project not found');

      // Stage 1: Audio extraction
      await this.videoRepo.updateStatus(videoId, PipelineStatus.EXTRACTING_AUDIO);
      this.emitEvent(videoId, { type: 'stage', stage: 'EXTRACTING_AUDIO' });

      const outputDir = path.dirname(project.storagePath);
      const audioPath = await this.audioExtraction.extract(project.storagePath, outputDir);

      // Stage 2: Transcription
      await this.videoRepo.updateStatus(videoId, PipelineStatus.TRANSCRIBING);
      this.emitEvent(videoId, { type: 'stage', stage: 'TRANSCRIBING' });

      const rawWords = await this.transcription.transcribe(audioPath);

      // Save TranscriptWords
      const words = await this.videoRepo.saveTranscriptWords(videoId, rawWords);

      // Stage 3: Cue generation
      const wordsPerCue = project.style?.wordsPerCue || 6;
      const generatedCues = this.cueGeneration.generateCues(words, wordsPerCue);

      // Save SubtitleCues
      await this.prisma.subtitleCue.deleteMany({ where: { videoProjectId: videoId } });
      await this.prisma.subtitleCue.createMany({
        data: generatedCues.map((cue) => ({
          videoProjectId: videoId,
          text: cue.text,
          startMs: cue.startMs,
          endMs: cue.endMs,
          order: cue.order,
          edited: false,
        })),
      });

      await this.videoRepo.updateStatus(videoId, PipelineStatus.TRANSCRIBED);
      this.emitEvent(videoId, { type: 'stage', stage: 'TRANSCRIBED' });
      this.emitEvent(videoId, { type: 'done', wordCount: words.length });
    } catch (error: any) {
      this.logger.error(`Pipeline failed for ${videoId}: ${error.message}`, error.stack);
      await this.videoRepo.updateStatus(videoId, PipelineStatus.FAILED, error.message);
      this.emitEvent(videoId, { type: 'error', message: error.message });
    } finally {
      this.inFlight.delete(videoId);
    }
  }
}
