import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCueDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  startMs?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  endMs?: number;

  @IsOptional()
  @IsString()
  colorHex?: string | null;
}

export class CreateCueDto {
  @IsString()
  text!: string;

  @IsInt()
  @Min(0)
  startMs!: number;

  @IsInt()
  @Min(0)
  endMs!: number;

  @IsOptional()
  @IsString()
  colorHex?: string;
}
