import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ExportMode, ExportFormat } from '@prisma/client';

export class CreateExportDto {
  @IsEnum(ExportMode)
  mode!: ExportMode;

  @IsEnum(ExportFormat)
  format!: ExportFormat;

  @IsOptional()
  @IsString()
  backgroundHex?: string;

  @IsOptional()
  @IsBoolean()
  includeAudio?: boolean;
}
