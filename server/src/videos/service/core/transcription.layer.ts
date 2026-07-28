import { Injectable, Logger } from '@nestjs/common';
import { TranscriptionClientProvider, TranscribeWordResult } from './utility';

@Injectable()
export class TranscriptionLayer {
  private readonly logger = new Logger(TranscriptionLayer.name);

  constructor(private readonly client: TranscriptionClientProvider) {}

  async transcribe(audioPath: string): Promise<TranscribeWordResult[]> {
    this.logger.log(`Starting transcription for ${audioPath}`);
    return this.client.transcribe(audioPath);
  }
}
