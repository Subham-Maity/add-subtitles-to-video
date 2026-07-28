import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SubtitleCueRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByVideoId(videoProjectId: string) {
    return this.prisma.subtitleCue.findMany({
      where: { videoProjectId },
      orderBy: { order: 'asc' },
    });
  }

  async createCue(
    videoProjectId: string,
    data: { text: string; startMs: number; endMs: number; colorHex?: string },
  ) {
    const count = await this.prisma.subtitleCue.count({ where: { videoProjectId } });
    return this.prisma.subtitleCue.create({
      data: {
        videoProjectId,
        text: data.text,
        startMs: data.startMs,
        endMs: data.endMs,
        order: count,
        colorHex: data.colorHex || null,
        edited: true,
      },
    });
  }

  async updateCue(
    cueId: string,
    data: { text?: string; startMs?: number; endMs?: number; colorHex?: string | null },
  ) {
    return this.prisma.subtitleCue.update({
      where: { id: cueId },
      data: {
        ...data,
        edited: true,
      },
    });
  }

  async deleteCue(cueId: string) {
    return this.prisma.subtitleCue.delete({
      where: { id: cueId },
    });
  }

  async replaceCues(
    videoProjectId: string,
    cues: Array<{ text: string; startMs: number; endMs: number; order: number }>,
  ) {
    await this.prisma.subtitleCue.deleteMany({
      where: { videoProjectId },
    });

    await this.prisma.subtitleCue.createMany({
      data: cues.map((c) => ({
        videoProjectId,
        text: c.text,
        startMs: c.startMs,
        endMs: c.endMs,
        order: c.order,
        edited: false,
      })),
    });

    return this.findByVideoId(videoProjectId);
  }
}
