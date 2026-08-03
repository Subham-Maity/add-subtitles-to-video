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

  async transcribe(
    audioPath: string,
    language?: string,
    onProgress?: (pct: number, logMessage: string) => void,
  ): Promise<TranscribeWordResult[]> {
    const url = `${this.baseUrl}/transcribe_stream`;
    this.logger.log(`Requesting transcription stream from ${url} for ${audioPath} (language: ${language || 'auto'})`);

    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(audioPath));
      if (language) {
        formData.append('language', language);
      }

      const response = await axios.post(url, formData, {
        headers: formData.getHeaders(),
        responseType: 'stream',
        timeout: 600000,
      });

      return new Promise<TranscribeWordResult[]>((resolve, reject) => {
        let allWords: TranscribeWordResult[] = [];
        let buffer = '';

        response.data.on('data', (chunk: Buffer) => {
          buffer += chunk.toString('utf-8');
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const payload = JSON.parse(trimmed.replace('data: ', ''));
                if (payload.type === 'segment') {
                  const scaledPct = 45 + Math.floor((payload.pct / 100) * 40);
                  const msg = `[${payload.start.toFixed(1)}s -> ${payload.end.toFixed(1)}s]: "${payload.text.trim()}"`;
                  if (onProgress) {
                    onProgress(scaledPct, msg);
                  }
                } else if (payload.type === 'complete') {
                  allWords = (payload.words || []).map((w: any) => ({
                    word: w.word,
                    startMs: w.start_ms,
                    endMs: w.end_ms,
                  }));
                } else if (payload.type === 'error') {
                  reject(new Error(payload.message));
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        });

        response.data.on('end', () => {
          resolve(allWords);
        });

        response.data.on('error', (err: any) => {
          this.logger.error(`Transcription stream error: ${err.message}`, err.stack);
          reject(err);
        });
      });
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

  async cancelActiveTranscription(): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/cancel`);
      this.logger.log('Sent cancel signal to Python transcription service.');
    } catch (e) {
      // Ignore error if service is unreachable
    }
  }
}
