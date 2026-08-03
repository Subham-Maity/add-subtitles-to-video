import { Injectable, Logger } from '@nestjs/common';
import { TranscriptionClientProvider, TranscribeWordResult } from './utility';

@Injectable()
export class TranscriptionLayer {
  private readonly logger = new Logger(TranscriptionLayer.name);

  constructor(private readonly client: TranscriptionClientProvider) {}

  async transcribe(
    audioPath: string,
    language?: string,
    onProgress?: (pct: number, logMessage: string) => void,
  ): Promise<TranscribeWordResult[]> {
    this.logger.log(`Starting transcription for ${audioPath} (language: ${language || 'auto'})`);
    return this.client.transcribe(audioPath, language, onProgress);
  }
}
