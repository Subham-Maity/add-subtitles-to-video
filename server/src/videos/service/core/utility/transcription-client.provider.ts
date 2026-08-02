import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';
import FormData from 'form-data';

export interface TranscribeWordResult {
  word: string;
  startMs: number;
  endMs: number;
}

@Injectable()
export class TranscriptionClientProvider {
  private readonly logger = new Logger(TranscriptionClientProvider.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>(
      'TRANSCRIPTION_SERVICE_URL',
      'http://localhost:8001',
    );
  }

  async transcribe(audioPath: string): Promise<TranscribeWordResult[]> {
    const url = `${this.baseUrl}/transcribe`;
    this.logger.log(`Requesting transcription from ${url} for ${audioPath}`);

    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioPath));

      const response = await axios.post(url, formData, {
        headers: formData.getHeaders(),
        timeout: 600000,
      });

      const words = response.data?.words || [];
      return words.map((w: any) => ({
        word: w.word,
        startMs: w.start_ms,
        endMs: w.end_ms,
      }));
    } catch (error: any) {
      this.logger.error(`Transcription request failed: ${error.message}`, error.stack);
      if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
        throw new Error(
          `Transcription service is not running on ${this.baseUrl}. Please start the Python service in transcription-service.`,
        );
      }
      throw new Error(
        `Transcription service error: ${error.response?.data?.detail || error.message}`,
      );
    }
  }
}
