import { Injectable, NotFoundException } from '@nestjs/common';
import { SubtitleCueRepository, SubtitleStyleRepository } from '../repository';
import { VideoProjectRepository } from 'src/videos/repository';
import { CueGenerationLayer, VideoPipelineOrchestrator } from 'src/videos/service';
import { CreateCueDto, UpdateCueDto, UpdateStyleDto } from '../dto';

@Injectable()
export class SubtitleService {
  constructor(
    private readonly cueRepo: SubtitleCueRepository,
    private readonly styleRepo: SubtitleStyleRepository,
    private readonly videoRepo: VideoProjectRepository,
    private readonly cueGeneration: CueGenerationLayer,
    private readonly orchestrator: VideoPipelineOrchestrator,
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

    // If no words exist yet (transcription failed or not executed), trigger pipeline execution!
    if (words.length === 0) {
      this.orchestrator.runPipeline(videoProjectId).catch(() => {});
      return { message: 'Pipeline re-triggered for transcription', cues: [] };
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
}
