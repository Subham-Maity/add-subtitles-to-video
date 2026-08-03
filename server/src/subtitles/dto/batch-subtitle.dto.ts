import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export enum SubtitleExportFormat {
  SRT = 'srt',
  TEXT = 'text',
}

export class BatchExtractDto {
  @ApiProperty({ description: 'Array of video project IDs to extract subtitles for', example: ['vid_1', 'vid_2'] })
  @IsArray()
  @IsString({ each: true })
  videoProjectIds: string[];

  @ApiPropertyOptional({ enum: SubtitleExportFormat, enumName: 'SubtitleExportFormat', default: SubtitleExportFormat.SRT })
  @IsOptional()
  @IsEnum(SubtitleExportFormat)
  format?: SubtitleExportFormat;

  @ApiPropertyOptional({ description: 'Declared speech language (e.g. hi, hi-roman, en, ur, auto)', example: 'hi' })
  @IsOptional()
  @IsString()
  language?: string;
}

export class MergeSubtitlesDto {
  @ApiProperty({ description: 'Array of video project IDs to merge subtitles from', example: ['vid_1', 'vid_2'] })
  @IsArray()
  @IsString({ each: true })
  videoProjectIds: string[];

  @ApiPropertyOptional({ enum: SubtitleExportFormat, enumName: 'SubtitleExportFormat', default: SubtitleExportFormat.SRT })
  @IsOptional()
  @IsEnum(SubtitleExportFormat)
  format?: SubtitleExportFormat;
}
