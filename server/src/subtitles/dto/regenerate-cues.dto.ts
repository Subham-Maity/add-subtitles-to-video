import { IsInt, Max, Min } from 'class-validator';

export class RegenerateCuesDto {
  @IsInt()
  @Min(1)
  @Max(15)
  wordsPerCue!: number;
}
