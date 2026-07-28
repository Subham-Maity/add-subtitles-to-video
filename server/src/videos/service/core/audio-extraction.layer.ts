import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { FfmpegRunnerHelper } from './utility';

@Injectable()
export class AudioExtractionLayer {
  private readonly logger = new Logger(AudioExtractionLayer.name);

  constructor(private readonly ffmpeg: FfmpegRunnerHelper) {}

  async extract(videoPath: string, outputDir: string): Promise<string> {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const audioPath = path.join(outputDir, 'audio.wav');
    this.logger.log(`Extracting mono 16kHz WAV from ${videoPath} to ${audioPath}`);

    const args = [
      '-y',
      '-i', `"${videoPath}"`,
      '-vn',
      '-acodec', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      `"${audioPath}"`,
    ];

    await this.ffmpeg.run(args);
    return audioPath;
  }
}
