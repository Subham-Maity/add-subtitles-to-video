"use client";

import React, { useMemo } from 'react';
import { SubtitleCue, SubtitleStyle } from '@/types/studio.types';

interface CaptionOverlayProps {
  currentCue: SubtitleCue | null;
  style: SubtitleStyle | null;
}

export function CaptionOverlay({ currentCue, style }: CaptionOverlayProps) {
  // Dynamically inject @font-face style tag for loaded font file
  const fontFaceStyle = useMemo(() => {
    if (!style?.fontFileName) return null;
    const fontName = style.fontFileName.replace(/\.[^/.]+$/, '');
    const fontUrl = `/lang/${style.fontFileName}`;

    return `
      @font-face {
        font-family: '${fontName}';
        src: url('${fontUrl}') format('truetype');
        font-weight: normal;
        font-style: normal;
      }
    `;
  }, [style?.fontFileName]);

  if (!currentCue || !style) return null;

  const fontFamily = style.fontFileName
    ? style.fontFileName.replace(/\.[^/.]+$/, '')
    : 'sans-serif';

  let text = currentCue.text;
  if (style.uppercase) {
    text = text.toUpperCase();
  }

  // Vertical position styling based on verticalOffsetPct (0-100%)
  const verticalOffset = style.verticalOffsetPct ?? 10;
  let positionStyle: React.CSSProperties = {};
  if (style.position === 'top') {
    positionStyle = { top: `${verticalOffset}%` };
  } else if (style.position === 'center') {
    positionStyle = { top: '50%', transform: 'translateY(-50%)' };
  } else {
    positionStyle = { bottom: `${verticalOffset}%` };
  }

  // Background Box styling
  const bgStyle = style.backgroundBoxOn
    ? {
        backgroundColor: style.backgroundColorHex || '#000000',
        opacity: style.backgroundOpacity ?? 0.5,
        padding: '0.4em 0.8em',
        borderRadius: '0.25em',
      }
    : {};

  // Outline styling
  const outlineWidth = style.outlineWidthPx || 0;
  const outlineColor = style.outlineColorHex || '#000000';

  // Per-cue color override fallback to style color
  const textColor = currentCue.colorHex || style.fontColorHex || '#FFFFFF';

  const textStyle: React.CSSProperties = {
    fontFamily: `'${fontFamily}', sans-serif`,
    fontSize: `${style.fontSizePx || 42}px`,
    color: textColor,
    fontWeight: style.bold ? 'bold' : 'normal',
    fontStyle: style.italic ? 'italic' : 'normal',
    lineHeight: 1.2,
    textAlign: 'center',
    ...(outlineWidth > 0
      ? {
          WebkitTextStroke: `${outlineWidth}px ${outlineColor}`,
          textShadow: `0 0 ${outlineWidth * 2}px ${outlineColor}`,
        }
      : {}),
  };

  return (
    <>
      {fontFaceStyle && <style>{fontFaceStyle}</style>}
      <div
        className="absolute inset-x-0 pointer-events-none flex justify-center px-6 z-20"
        style={positionStyle}
      >
        <div className="relative max-w-4xl text-center transition-all duration-150">
          {style.backgroundBoxOn && (
            <div
              className="absolute inset-0 z-0 pointer-events-none"
              style={bgStyle}
            />
          )}
          <span className="relative z-10 block drop-shadow-md" style={textStyle}>
            {text}
          </span>
        </div>
      </div>
    </>
  );
}
