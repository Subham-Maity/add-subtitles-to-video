import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateStyleDto } from '../dto';

@Injectable()
export class SubtitleStyleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByVideoId(videoProjectId: string) {
    return this.prisma.subtitleStyle.findUnique({
      where: { videoProjectId },
    });
  }

  async updateStyle(videoProjectId: string, data: UpdateStyleDto) {
    return this.prisma.subtitleStyle.upsert({
      where: { videoProjectId },
      create: {
        videoProjectId,
        fontFileName: data.fontFileName || 'Inter-Bold.ttf',
        fontSizePx: data.fontSizePx ?? 42,
        fontColorHex: data.fontColorHex || '#FFFFFF',
        outlineColorHex: data.outlineColorHex || '#000000',
        outlineWidthPx: data.outlineWidthPx ?? 2,
        backgroundBoxOn: data.backgroundBoxOn ?? false,
        backgroundColorHex: data.backgroundColorHex || '#000000',
        backgroundOpacity: data.backgroundOpacity ?? 0.5,
        position: data.position || 'bottom',
        wordsPerCue: data.wordsPerCue ?? 6,
        uppercase: data.uppercase ?? false,
        bold: data.bold ?? false,
        italic: data.italic ?? false,
      },
      update: data,
    });
  }
}
