import { Injectable, NotFoundException } from '@nestjs/common';
import { SubtitleCueRepository, SubtitleStyleRepository } from '../repository';
import { VideoProjectRepository } from 'src/videos/repository';
import { CueGenerationLayer } from 'src/videos/service';
import { CreateCueDto, UpdateCueDto, UpdateStyleDto, SubtitleExportFormat } from '../dto';
import { SubtitleTranscriptionQueueService } from 'src/queue';

function formatMsToSrtTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const millis = ms % 1000;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(millis).padStart(3, '0');

  return `${hh}:${mm}:${ss},${mmm}`;
}

@Injectable()
export class SubtitleService {
  constructor(
    private readonly cueRepo: SubtitleCueRepository,
    private readonly styleRepo: SubtitleStyleRepository,
    private readonly videoRepo: VideoProjectRepository,
    private readonly cueGeneration: CueGenerationLayer,
    private readonly queueService: SubtitleTranscriptionQueueService,
  ) {}

  async createCue(videoProjectId: string, dto: CreateCueDto) {
    return this.cueRepo.createCue(videoProjectId, dto);
  }

  async updateCue(cueId: string, dto: UpdateCueDto) {
    return this.cueRepo.updateCue(cueId, dto);
  }

  async deleteCue(cueId: string) {
    return this.cueRepo.deleteCue(cueId);
  }

  async regenerateCues(videoProjectId: string, wordsPerCue: number) {
    const project = await this.videoRepo.findById(videoProjectId);
    if (!project) throw new NotFoundException('Video project not found');

    const words = project.words || [];

    // If no words exist yet (transcription failed or not executed), trigger pipeline execution via Redis queue!
    if (words.length === 0) {
      await this.queueService.addTranscriptionJob({ videoProjectId });
      return { message: 'Pipeline re-triggered for transcription in Redis queue', cues: [] };
    }

    const newCues = this.cueGeneration.generateCues(words, wordsPerCue);
    await this.styleRepo.updateStyle(videoProjectId, { wordsPerCue });
    return this.cueRepo.replaceCues(videoProjectId, newCues);
  }

  async updateStyle(videoProjectId: string, dto: UpdateStyleDto) {
    const updatedStyle = await this.styleRepo.updateStyle(videoProjectId, dto);

    if (dto.wordsPerCue !== undefined) {
      await this.regenerateCues(videoProjectId, dto.wordsPerCue);
    }

    return updatedStyle;
  }

  /**
   * Export single project subtitles in SRT format or Plain Text format.
   */
  async exportSubtitles(videoProjectId: string, format: SubtitleExportFormat = SubtitleExportFormat.SRT) {
    const project = await this.videoRepo.findById(videoProjectId);
    if (!project) throw new NotFoundException('Video project not found');

    const cues = project.cues || [];

    if (format === SubtitleExportFormat.TEXT) {
      const content = cues.map((c) => c.text.trim()).join('\n');
      return {
        filename: `${project.originalFilename.replace(/\.[^/.]+$/, '')}_subtitles.txt`,
        content,
        format: 'text',
      };
    } else {
      const srtBlocks = cues.map((cue, idx) => {
        const start = formatMsToSrtTime(cue.startMs);
        const end = formatMsToSrtTime(cue.endMs);
        return `${idx + 1}\n${start} --> ${end}\n${cue.text}`;
      });
      const content = srtBlocks.join('\n\n');
      return {
        filename: `${project.originalFilename.replace(/\.[^/.]+$/, '')}_subtitles.srt`,
        content,
        format: 'srt',
      };
    }
  }

  /**
   * Enqueue a batch of video projects for subtitle extraction.
   */
  async extractBatch(videoProjectIds: string[], language?: string) {
    const queued: string[] = [];
    for (const id of videoProjectIds) {
      const project = await this.videoRepo.findById(id);
      if (project) {
        await this.queueService.addTranscriptionJob({ videoProjectId: id, language });
        queued.push(id);
      }
    }
    return {
      message: `Enqueued ${queued.length} clips for subtitle extraction in Redis queue`,
      videoProjectIds: queued,
    };
  }

  /**
   * Merge subtitles across multiple video projects into a single SRT or Plain Text string.
   */
  async mergeBatchSubtitles(videoProjectIds: string[], format: SubtitleExportFormat = SubtitleExportFormat.SRT) {
    const projects = await Promise.all(videoProjectIds.map((id) => this.videoRepo.findById(id)));
    const validProjects = projects.filter((p) => p !== null);

    if (validProjects.length === 0) {
      throw new NotFoundException('No valid video projects found for merging');
    }

    if (format === SubtitleExportFormat.TEXT) {
      const sections: string[] = [];
      for (const project of validProjects) {
        const cues = project!.cues || [];
        if (cues.length > 0) {
          const text = cues.map((c) => c.text.trim()).join(' ');
          sections.push(`--- [${project!.originalFilename}] ---\n${text}`);
        }
      }
      const content = sections.join('\n\n');
      return {
        filename: `merged_subtitles_${Date.now()}.txt`,
        content,
        format: 'text',
        clipCount: validProjects.length,
      };
    } else {
      let globalCueIndex = 1;
      let timeOffsetMs = 0;
      const srtBlocks: string[] = [];

      for (const project of validProjects) {
        const cues = project!.cues || [];
        for (const cue of cues) {
          const start = formatMsToSrtTime(cue.startMs + timeOffsetMs);
          const end = formatMsToSrtTime(cue.endMs + timeOffsetMs);
          srtBlocks.push(`${globalCueIndex++}\n${start} --> ${end}\n${cue.text}`);
        }
        // Shift time offset by project duration (or max cue end time)
        const duration = project!.durationMs || (cues.length > 0 ? cues[cues.length - 1].endMs + 1000 : 0);
        timeOffsetMs += duration;
      }

      const content = srtBlocks.join('\n\n');
      return {
        filename: `merged_subtitles_${Date.now()}.srt`,
        content,
        format: 'srt',
        clipCount: validProjects.length,
      };
    }
  }
}
