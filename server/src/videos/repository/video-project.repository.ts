import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PipelineStatus } from '@prisma/client';

@Injectable()
export class VideoProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    originalFilename: string;
    storagePath: string;
    durationMs: number;
    width: number;
    height: number;
    fps: number;
  }) {
    return this.prisma.videoProject.create({
      data: {
        ...data,
        status: PipelineStatus.UPLOADED,
        style: {
          create: {
            fontFileName: 'Inter-Bold.ttf',
            fontSizePx: 42,
            fontColorHex: '#FFFFFF',
            outlineColorHex: '#000000',
            outlineWidthPx: 2,
            backgroundBoxOn: false,
            backgroundColorHex: '#000000',
            backgroundOpacity: 0.5,
            position: 'bottom',
            wordsPerCue: 6,
            uppercase: false,
            bold: false,
            italic: false,
          },
        },
      },
      include: {
        style: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.videoProject.findUnique({
      where: { id },
      include: {
        words: { orderBy: { order: 'asc' } },
        cues: { orderBy: { order: 'asc' } },
        style: true,
        exportJobs: { orderBy: { createdAt: 'desc' } },
      },
    });
  }

  async findAll() {
    return this.prisma.videoProject.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        style: true,
        _count: { select: { cues: true } },
      },
    });
  }

  async updateStatus(id: string, status: PipelineStatus, errorMessage?: string) {
    return this.prisma.videoProject.update({
      where: { id },
      data: {
        status,
        errorMessage: errorMessage || null,
      },
    });
  }

  async saveTranscriptWords(
    videoId: string,
    words: Array<{ word: string; startMs: number; endMs: number }>,
  ) {
    await this.prisma.transcriptWord.deleteMany({
      where: { videoProjectId: videoId },
    });

    const wordData = words.map((w, index) => ({
      videoProjectId: videoId,
      word: w.word,
      startMs: w.startMs,
      endMs: w.endMs,
      order: index,
    }));

    await this.prisma.transcriptWord.createMany({
      data: wordData,
    });

    return this.prisma.transcriptWord.findMany({
      where: { videoProjectId: videoId },
      orderBy: { order: 'asc' },
    });
  }

  async delete(id: string) {
    return this.prisma.videoProject.delete({
      where: { id },
    });
  }
}
