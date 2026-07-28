import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { VideoMetadata } from 'src/videos/types';

const execAsync = promisify(exec);

@Injectable()
export class FfprobeHelper {
  private readonly logger = new Logger(FfprobeHelper.name);

  async extractMetadata(videoPath: string): Promise<VideoMetadata> {
    const cmd = `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`;
    try {
      const { stdout } = await execAsync(cmd);
      const data = JSON.parse(stdout);

      const videoStream = data.streams?.find((s: any) => s.codec_type === 'video');
      const durationSeconds = parseFloat(data.format?.duration || data.streams?.[0]?.duration || '0');
      const durationMs = Math.round(durationSeconds * 1000);

      const rawWidth = videoStream?.width || 1920;
      const rawHeight = videoStream?.height || 1080;

      // Check rotation in stream tags or side_data_list
      const rotationTag =
        videoStream?.tags?.rotate ||
        videoStream?.side_data_list?.find((sd: any) => sd.rotation !== undefined)?.rotation;
      const rotation = parseInt(String(rotationTag || 0), 10);

      let width = rawWidth;
      let height = rawHeight;
      if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
        width = rawHeight;
        height = rawWidth;
      }

      let fps = 30;
      if (videoStream?.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split('/');
        if (parts.length === 2 && parseFloat(parts[1]) > 0) {
          fps = parseFloat(parts[0]) / parseFloat(parts[1]);
        } else {
          fps = parseFloat(parts[0]);
        }
      }

      return {
        durationMs,
        width,
        height,
        fps: Math.round(fps * 100) / 100,
      };
    } catch (error: any) {
      this.logger.warn(`ffprobe failed for ${videoPath}, using fallback values: ${error.message}`);
      return {
        durationMs: 0,
        width: 1920,
        height: 1080,
        fps: 30,
      };
    }
  }
}
