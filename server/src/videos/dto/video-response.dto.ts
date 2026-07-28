export class VideoResponseDto {
  id!: string;
  originalFilename!: string;
  storagePath!: string;
  durationMs!: number;
  width!: number;
  height!: number;
  fps!: number;
  status!: string;
  errorMessage?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
