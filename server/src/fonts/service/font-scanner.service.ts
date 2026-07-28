import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { FontOption } from '../types';

@Injectable()
export class FontScannerService {
  private readonly logger = new Logger(FontScannerService.name);
  private readonly fontsDir: string;

  constructor(config: ConfigService) {
    const relativeOrAbs = config.get<string>('FONTS_DIR', '../client/public/lang');
    this.fontsDir = path.resolve(relativeOrAbs);
  }

  scanFonts(): FontOption[] {
    if (!fs.existsSync(this.fontsDir)) {
      fs.mkdirSync(this.fontsDir, { recursive: true });
    }

    try {
      const files = fs.readdirSync(this.fontsDir);
      const fontFiles = files.filter((file) => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.ttf' || ext === '.otf';
      });

      return fontFiles.map((file) => {
        const ext = path.extname(file);
        const basename = path.basename(file, ext);
        const displayName = basename
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());

        return {
          fileName: file,
          displayName,
          url: `/lang/${file}`,
        };
      });
    } catch (error: any) {
      this.logger.error(`Failed to scan fonts directory: ${error.message}`);
      return [];
    }
  }

  getFontsDir(): string {
    return this.fontsDir;
  }
}
