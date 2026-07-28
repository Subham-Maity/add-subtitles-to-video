import { Injectable, Logger } from '@nestjs/common';
import { FfmpegRunnerHelper } from 'src/videos/service/core';
import { FontScannerService } from 'src/fonts/service';

@Injectable()
export class CaptionsOnlyRenderLayer {
  private readonly logger = new Logger(CaptionsOnlyRenderLayer.name);

  constructor(
    private readonly ffmpeg: FfmpegRunnerHelper,
    private readonly fontScanner: FontScannerService,
  ) {}

  async render(
    videoPath: string,
    assPath: string,
    outputPath: string,
    options: {
      width: number;
      height: number;
      fps: number;
      durationMs: number;
      backgroundHex?: string;
      includeAudio?: boolean;
    },
    onProgress?: (pct: number) => void,
  ): Promise<void> {
    const fontsDir = this.fontScanner.getFontsDir();
    const escAss = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    const escFonts = fontsDir.replace(/\\/g, '/').replace(/:/g, '\\:');

    const colorName = options.backgroundHex === '#FFFFFF' ? 'white' : 'black';
    const durationSec = (options.durationMs / 1000).toFixed(2);
    const lavfiSource = `color=c=${colorName}:s=${options.width}x${options.height}:r=${options.fps}:d=${durationSec}`;

    this.logger.log(`Rendering captions-only export to ${outputPath}`);

    // Try GPU NVENC first
    const gpuArgs = [
      '-y',
      '-f', 'lavfi',
      '-i', lavfiSource,
      '-i', videoPath,
      '-map', '0:v',
    ];

    if (options.includeAudio !== false) {
      gpuArgs.push('-map', '1:a?');
    }

    gpuArgs.push(
      '-vf', `subtitles='${escAss}':fontsdir='${escFonts}'`,
      '-c:v', 'h264_nvenc',
      '-preset', 'p1',
      '-cq', '20',
      '-pix_fmt', 'yuv420p',
    );

    if (options.includeAudio !== false) {
      gpuArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    }

    gpuArgs.push(outputPath);

    try {
      this.logger.log('Attempting GPU NVENC captions-only export...');
      await this.ffmpeg.runWithProgress(gpuArgs, onProgress, options.durationMs);
      this.logger.log('GPU NVENC captions-only export completed.');
      return;
    } catch (gpuErr: any) {
      this.logger.warn(`GPU NVENC failed or unavailable, falling back to CPU ultrafast: ${gpuErr.message}`);
    }

    // CPU Fallback
    const cpuArgs = [
      '-y',
      '-f', 'lavfi',
      '-i', lavfiSource,
      '-i', videoPath,
      '-map', '0:v',
    ];

    if (options.includeAudio !== false) {
      cpuArgs.push('-map', '1:a?');
    }

    cpuArgs.push(
      '-vf', `subtitles='${escAss}':fontsdir='${escFonts}'`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
    );

    if (options.includeAudio !== false) {
      cpuArgs.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    }

    cpuArgs.push(outputPath);

    await this.ffmpeg.runWithProgress(cpuArgs, onProgress, options.durationMs);
    this.logger.log('CPU ultrafast captions-only export completed.');
  }
}
