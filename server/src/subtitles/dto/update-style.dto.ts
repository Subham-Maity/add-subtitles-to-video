import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateStyleDto {
  @IsOptional()
  @IsString()
  fontFileName?: string;

  @IsOptional()
  @IsInt()
  @Min(8)
  @Max(400)
  fontSizePx?: number;

  @IsOptional()
  @IsString()
  fontColorHex?: string;

  @IsOptional()
  @IsString()
  outlineColorHex?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  outlineWidthPx?: number;

  @IsOptional()
  @IsBoolean()
  backgroundBoxOn?: boolean;

  @IsOptional()
  @IsString()
  backgroundColorHex?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  backgroundOpacity?: number;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  verticalOffsetPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  positionX?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  positionY?: number;

  @IsOptional()
  @IsNumber()
  rotationDeg?: number;

  @IsOptional()
  @IsString()
  animation?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  wordsPerCue?: number;

  @IsOptional()
  @IsBoolean()
  uppercase?: boolean;

  @IsOptional()
  @IsBoolean()
  bold?: boolean;

  @IsOptional()
  @IsBoolean()
  italic?: boolean;

  @IsOptional()
  @IsString()
  strokePosition?: string;
}
