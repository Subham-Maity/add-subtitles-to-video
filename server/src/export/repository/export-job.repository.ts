import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExportMode, ExportFormat, ExportStatus } from '@prisma/client';

@Injectable()
export class ExportJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    videoProjectId: string;
    mode: ExportMode;
    format: ExportFormat;
    backgroundHex?: string;
    includeAudio?: boolean;
  }) {
    return this.prisma.exportJob.create({
      data: {
        ...data,
        status: ExportStatus.QUEUED,
        progressPct: 0,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.exportJob.findUnique({
      where: { id },
      include: {
        video: {
          include: {
            cues: { orderBy: { order: 'asc' } },
            style: true,
          },
        },
      },
    });
  }

  async updateProgress(id: string, progressPct: number, status?: ExportStatus) {
    return this.prisma.exportJob.update({
      where: { id },
      data: {
        progressPct,
        ...(status ? { status } : {}),
      },
    });
  }

  async updateComplete(id: string, outputPath: string) {
    return this.prisma.exportJob.update({
      where: { id },
      data: {
        status: ExportStatus.DONE,
        progressPct: 100,
        outputPath,
      },
    });
  }

  async updateFailed(id: string, errorMessage: string) {
    return this.prisma.exportJob.update({
      where: { id },
      data: {
        status: ExportStatus.FAILED,
        errorMessage,
      },
    });
  }
}
