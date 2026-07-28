import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { SubtitleCue, SubtitleStyle } from '@prisma/client';
import { hexToAssColor } from './helpers/hex-to-ass-color.helper';

const REFERENCE_HEIGHT = 540;

@Injectable()
export class AssBuilderLayer {
  private readonly logger = new Logger(AssBuilderLayer.name);

  buildAssFile(
    cues: SubtitleCue[],
    style: SubtitleStyle | null,
    outputDir: string,
    dimensions?: { width: number; height: number },
  ): string {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const assPath = path.join(outputDir, 'subtitles.ass');
    const fontName = style?.fontFileName
      ? path.basename(style.fontFileName, path.extname(style.fontFileName))
      : 'Arial';

    const resX = dimensions?.width || 1920;
    const resY = dimensions?.height || 1080;

    // Scale font size & stroke width relative to reference height 540px for 1:1 WYSIWYG parity
    const baseFontSize = style?.fontSizePx || 42;
    const scaleFactor = resY / REFERENCE_HEIGHT;

    const assFontSize = Math.max(12, Math.round(baseFontSize * scaleFactor));
    const baseOutline = style?.outlineWidthPx ?? 2;
    const assOutlineWidth = Math.max(0, Math.round(baseOutline * scaleFactor));

    const primaryColor = hexToAssColor(style?.fontColorHex || '#FFFFFF', 1.0);
    const outlineColor = hexToAssColor(style?.outlineColorHex || '#000000', 1.0);

    const backColor = hexToAssColor(
      style?.backgroundColorHex || '#000000',
      style?.backgroundOpacity ?? 0.5,
    );
    const borderStyle = style?.backgroundBoxOn ? 3 : 1;

    const bold = style?.bold ? 1 : 0;
    const italic = style?.italic ? 1 : 0;

    const posX = style?.positionX !== undefined ? Math.round((style.positionX / 100) * resX) : Math.round(resX / 2);
    const posY = style?.positionY !== undefined ? Math.round((style.positionY / 100) * resY) : Math.round(resY * 0.8);
    const rotDeg = style?.rotationDeg || 0;

    const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${resX}
PlayResY: ${resY}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${assFontSize},${primaryColor},&H00000000,${outlineColor},${backColor},${bold},${italic},0,0,100,100,0,0,${borderStyle},${assOutlineWidth},0,5,10,10,10,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    const dialogueLines = cues.map((cue) => {
      const startStr = this.formatAssTime(cue.startMs);
      const endStr = this.formatAssTime(cue.endMs);
      let text = cue.text;
      if (style?.uppercase) {
        text = text.toUpperCase();
      }

      let tags = `{\\an5\\pos(${posX},${posY})`;
      if (rotDeg !== 0) {
        tags += `\\frz(${rotDeg})`;
      }

      // Per-cue color override tag if specified
      if (cue.colorHex) {
        const assCueColor = hexToAssColor(cue.colorHex, 1.0).replace('&H00', '&H');
        tags += `\\c${assCueColor}&`;
      }
      tags += `}`;

      return `Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${tags}${text}`;
    });

    const content = header + dialogueLines.join('\n') + '\n';
    fs.writeFileSync(assPath, content, 'utf-8');
    this.logger.log(
      `Generated ASS subtitle file at ${assPath} (PlayRes ${resX}x${resY}, FontSize ${assFontSize}px [scale ${scaleFactor.toFixed(2)}x], Pos (${posX},${posY}))`,
    );

    return assPath;
  }

  private formatAssTime(ms: number): string {
    const totalSeconds = Math.max(0, ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const cs = Math.floor((ms % 1000) / 10);

    const pad = (n: number, z = 2) => n.toString().padStart(z, '0');
    return `${hours}:${pad(minutes)}:${pad(seconds)}.${pad(cs)}`;
  }
}
