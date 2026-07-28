import { Injectable, Logger } from '@nestjs/common';
import { FfmpegRunnerHelper } from 'src/videos/service/core';
import { FontScannerService } from 'src/fonts/service';

@Injectable()
export class OverlayRenderLayer {
  private readonly logger = new Logger(OverlayRenderLayer.name);

  constructor(
    private readonly ffmpeg: FfmpegRunnerHelper,
    private readonly fontScanner: FontScannerService,
  ) {}

  async render(
    videoPath: string,
    assPath: string,
    outputPath: string,
    durationMs?: number,
    onProgress?: (pct: number) => void,
  ): Promise<void> {
    const fontsDir = this.fontScanner.getFontsDir();
    const escAss = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    const escFonts = fontsDir.replace(/\\/g, '/').replace(/:/g, '\\:');

    this.logger.log(`Rendering overlay export to ${outputPath}`);

    // Try NVIDIA NVENC GPU hardware acceleration first (200+ FPS)
    const gpuArgs = [
      '-y',
      '-i', videoPath,
      '-vf', `subtitles='${escAss}':fontsdir='${escFonts}'`,
      '-c:v', 'h264_nvenc',
      '-preset', 'p1',
      '-cq', '20',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      outputPath,
    ];

    try {
      this.logger.log('Attempting GPU NVENC fast video export...');
      await this.ffmpeg.runWithProgress(gpuArgs, onProgress, durationMs);
      this.logger.log('GPU NVENC export completed successfully.');
      return;
    } catch (gpuErr: any) {
      this.logger.warn(`GPU NVENC failed or unavailable, falling back to CPU ultrafast: ${gpuErr.message}`);
    }

    // CPU Fallback (-preset ultrafast)
    const cpuArgs = [
      '-y',
      '-i', videoPath,
      '-vf', `subtitles='${escAss}':fontsdir='${escFonts}'`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      outputPath,
    ];

    await this.ffmpeg.runWithProgress(cpuArgs, onProgress, durationMs);
    this.logger.log('CPU ultrafast export completed successfully.');
  }
}
