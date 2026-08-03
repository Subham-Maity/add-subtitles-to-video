import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ReplaySubject, Observable } from 'rxjs';
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
  private readonly cancelledVideoIds = new Set<string>();
  private readonly eventStreams = new Map<string, ReplaySubject<PipelineProgressEvent>>();

  constructor(
    private readonly videoRepo: VideoProjectRepository,
    private readonly audioExtraction: AudioExtractionLayer,
    private readonly transcription: TranscriptionLayer,
    private readonly cueGeneration: CueGenerationLayer,
    private readonly prisma: PrismaService,
  ) {}

  getEventStream(videoId: string): Observable<PipelineProgressEvent> {
    if (!this.eventStreams.has(videoId)) {
      this.eventStreams.set(videoId, new ReplaySubject<PipelineProgressEvent>(50));
    }
    return this.eventStreams.get(videoId)!.asObservable();
  }

  clearPipeline(videoId: string) {
    this.logger.log(`Cancelling pipeline for video ${videoId}`);
    this.cancelledVideoIds.add(videoId);
    this.inFlight.delete(videoId);
    this.eventStreams.delete(videoId);
  }

  clearAllPipelines() {
    this.logger.log('Cancelling all in-flight video pipelines');
    for (const videoId of this.inFlight) {
      this.cancelledVideoIds.add(videoId);
    }
    this.inFlight.clear();
    this.eventStreams.clear();
  }

  private emitEvent(videoId: string, event: PipelineProgressEvent) {
    if (this.cancelledVideoIds.has(videoId)) return;
    if (!this.eventStreams.has(videoId)) {
      this.eventStreams.set(videoId, new ReplaySubject<PipelineProgressEvent>(50));
    }
    const stream = this.eventStreams.get(videoId)!;
    stream.next(event);
  }

  async runPipeline(videoId: string, language?: string): Promise<void> {
    if (this.inFlight.has(videoId)) {
      throw new ConflictException('Video processing is already in progress');
    }

    this.cancelledVideoIds.delete(videoId);
    this.inFlight.add(videoId);
    // Reset event stream replay buffer for a fresh run
    this.eventStreams.set(videoId, new ReplaySubject<PipelineProgressEvent>(50));

    const startTime = Date.now();

    try {
      const project = await this.videoRepo.findById(videoId);
      if (!project) {
        this.logger.warn(`Video project ${videoId} not found. Skipping pipeline.`);
        return;
      }

      if (this.cancelledVideoIds.has(videoId)) {
        this.logger.log(`Pipeline for video ${videoId} was cancelled before start.`);
        return;
      }

      this.emitEvent(videoId, {
        type: 'log',
        stage: 'UPLOADED',
        pct: 5,
        elapsedMs: Date.now() - startTime,
        logMessage: `[Start] Initiating pipeline for ${project.originalFilename}`,
      });

      // Stage 1: Audio extraction
      await this.videoRepo.updateStatus(videoId, PipelineStatus.EXTRACTING_AUDIO);

      if (this.cancelledVideoIds.has(videoId)) return;

      this.emitEvent(videoId, {
        type: 'stage',
        stage: 'EXTRACTING_AUDIO',
        pct: 15,
        elapsedMs: Date.now() - startTime,
        logMessage: 'Extracting 16kHz WAV mono audio track using FFmpeg...',
      });

      const outputDir = path.dirname(project.storagePath);
      const audioPath = await this.audioExtraction.extract(project.storagePath, outputDir);

      if (this.cancelledVideoIds.has(videoId)) return;

      this.emitEvent(videoId, {
        type: 'log',
        stage: 'EXTRACTING_AUDIO',
        pct: 35,
        elapsedMs: Date.now() - startTime,
        logMessage: 'FFmpeg audio extraction completed successfully.',
      });

      // Stage 2: Transcription
      await this.videoRepo.updateStatus(videoId, PipelineStatus.TRANSCRIBING);

      if (this.cancelledVideoIds.has(videoId)) return;

      this.emitEvent(videoId, {
        type: 'stage',
        stage: 'TRANSCRIBING',
        pct: 45,
        elapsedMs: Date.now() - startTime,
        language: language || 'auto',
        logMessage: `Sending audio to Faster-Whisper AI model (Language: ${language || 'Auto-detect'})...`,
      });

      const rawWords = await this.transcription.transcribe(audioPath, language, (pct, logMessage) => {
        if (this.cancelledVideoIds.has(videoId)) return;
        this.emitEvent(videoId, {
          type: 'progress',
          stage: 'TRANSCRIBING',
          pct,
          elapsedMs: Date.now() - startTime,
          language: language || 'auto',
          logMessage,
        });
      });

      if (this.cancelledVideoIds.has(videoId)) return;

      this.emitEvent(videoId, {
        type: 'log',
        stage: 'TRANSCRIBING',
        pct: 75,
        elapsedMs: Date.now() - startTime,
        logMessage: `Faster-Whisper AI completed! Extracted ${rawWords.length} word timestamps.`,
      });

      // Save TranscriptWords
      const words = await this.videoRepo.saveTranscriptWords(videoId, rawWords);

      if (this.cancelledVideoIds.has(videoId)) return;

      // Stage 3: Cue generation
      this.emitEvent(videoId, {
        type: 'stage',
        stage: 'TRANSCRIBED',
        pct: 85,
        elapsedMs: Date.now() - startTime,
        wordCount: words.length,
        logMessage: 'Grouping words into structured subtitle cues...',
      });

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

      if (this.cancelledVideoIds.has(videoId)) return;

      await this.videoRepo.updateStatus(videoId, PipelineStatus.TRANSCRIBED);
      this.emitEvent(videoId, {
        type: 'stage',
        stage: 'TRANSCRIBED',
        pct: 100,
        elapsedMs: Date.now() - startTime,
        logMessage: 'Pipeline completed! All subtitle cues saved to database.',
      });
      this.emitEvent(videoId, {
        type: 'done',
        pct: 100,
        wordCount: words.length,
        elapsedMs: Date.now() - startTime,
      });
    } catch (error: any) {
      if (this.cancelledVideoIds.has(videoId)) {
        this.logger.log(`Pipeline error ignored for cancelled video ${videoId}: ${error.message}`);
        return;
      }
      this.logger.error(`Pipeline failed for ${videoId}: ${error.message}`, error.stack);
      try {
        const project = await this.videoRepo.findById(videoId);
        if (project) {
          await this.videoRepo.updateStatus(videoId, PipelineStatus.FAILED, error.message);
        }
      } catch (e) {
        // Ignore if video was deleted
      }
      this.emitEvent(videoId, {
        type: 'error',
        message: error.message,
        elapsedMs: Date.now() - startTime,
      });
    } finally {
      this.inFlight.delete(videoId);
      this.cancelledVideoIds.delete(videoId);
    }
  }
}
