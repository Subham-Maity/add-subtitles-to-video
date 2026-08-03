import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { SubtitleService } from '../service';
import {
  CreateCueDto,
  UpdateCueDto,
  RegenerateCuesDto,
  UpdateStyleDto,
  BatchExtractDto,
  MergeSubtitlesDto,
  SubtitleExportFormat,
} from '../dto';

@Controller('subtitles')
export class SubtitlesController {
  constructor(private readonly subtitleService: SubtitleService) {}

  @Post('batch/extract')
  async extractBatch(@Body() dto: BatchExtractDto) {
    return this.subtitleService.extractBatch(dto.videoProjectIds, dto.language);
  }

  @Post('batch/merge')
  async mergeBatch(@Body() dto: MergeSubtitlesDto) {
    return this.subtitleService.mergeBatchSubtitles(dto.videoProjectIds, dto.format);
  }

  @Get('project/:id/export')
  @ApiQuery({ name: 'format', enum: SubtitleExportFormat, enumName: 'SubtitleExportFormat', required: false })
  async exportSubtitles(
    @Param('id') id: string,
    @Query('format') format: SubtitleExportFormat,
    @Res() res: Response,
  ) {
    const selectedFormat = format || SubtitleExportFormat.SRT;
    const result = await this.subtitleService.exportSubtitles(id, selectedFormat);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.content);
  }

  @Post(':id/cues')
  async createCue(
    @Param('id') id: string,
    @Body() dto: CreateCueDto,
  ) {
    return this.subtitleService.createCue(id, dto);
  }

  @Patch(':id/cues/:cueId')
  async updateCue(
    @Param('cueId') cueId: string,
    @Body() dto: UpdateCueDto,
  ) {
    return this.subtitleService.updateCue(cueId, dto);
  }

  @Delete(':id/cues/:cueId')
  async deleteCue(
    @Param('cueId') cueId: string,
  ) {
    return this.subtitleService.deleteCue(cueId);
  }

  @Post(':id/cues/regenerate')
  async regenerateCues(
    @Param('id') id: string,
    @Body() dto: RegenerateCuesDto,
  ) {
    return this.subtitleService.regenerateCues(id, dto.wordsPerCue);
  }

  @Patch(':id/style')
  async updateStyle(
    @Param('id') id: string,
    @Body() dto: UpdateStyleDto,
  ) {
    return this.subtitleService.updateStyle(id, dto);
  }
}
