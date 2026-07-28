import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class FfmpegRunnerHelper {
  private readonly logger = new Logger(FfmpegRunnerHelper.name);
  private readonly ffmpegPath: string;

  constructor(config: ConfigService) {
    this.ffmpegPath = config.get<string>('FFMPEG_PATH', 'ffmpeg');
  }

  async run(args: string[]): Promise<{ stdout: string; stderr: string }> {
    const command = `"${this.ffmpegPath}" ${args.join(' ')}`;
    this.logger.debug(`Executing ffmpeg: ${command}`);

    try {
      const result = await execAsync(command, { maxBuffer: 1024 * 1024 * 50 });
      return result;
    } catch (error: any) {
      this.logger.error(`FFmpeg failed: ${error.message}`, error.stderr);
      throw new Error(`FFmpeg error: ${error.stderr || error.message}`);
    }
  }

  async runWithProgress(
    args: string[],
    onProgress?: (progressPct: number) => void,
    durationMs?: number,
  ): Promise<{ stdout: string; stderr: string }> {
    // Strip leading/trailing quotes from individual args for spawn
    const cleanArgs = args.map((arg) => arg.replace(/^"|"$/g, ''));
    this.logger.log(`Executing FFmpeg with progress tracking: ${this.ffmpegPath} ${cleanArgs.join(' ')}`);

    return new Promise((resolve, reject) => {
      const child = spawn(this.ffmpegPath, cleanArgs);
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        const str = data.toString();
        stderr += str;

        if (onProgress && durationMs && durationMs > 0) {
          // Parse time=HH:MM:SS.ms or time=00:01:23.45 from stderr
          const match = str.match(/time=(\d{2}):(\d{2}):(\d{2})\.(\d{2})/);
          if (match) {
            const hours = parseInt(match[1], 10);
            const mins = parseInt(match[2], 10);
            const secs = parseInt(match[3], 10);
            const ms = parseInt(match[4], 10) * 10;

            const currentMs = hours * 3600000 + mins * 60000 + secs * 1000 + ms;
            const pct = Math.min(98, Math.max(30, Math.round(30 + (currentMs / durationMs) * 65)));
            onProgress(pct);
          }
        }
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          this.logger.error(`FFmpeg process failed with code ${code}`, stderr);
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (err) => {
        this.logger.error(`FFmpeg spawn error: ${err.message}`);
        reject(err);
      });
    });
  }

  getExecutablePath(): string {
    return this.ffmpegPath;
  }
}
