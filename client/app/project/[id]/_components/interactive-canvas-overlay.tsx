"use client";

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { SubtitleCue, SubtitleStyle } from '@/types/studio.types';
import { RotateCw, Check } from 'lucide-react';
import { api } from '@/lib/api';

const REFERENCE_HEIGHT = 540;

interface WordItem {
  word: string;
  startMs: number;
  endMs: number;
}

interface InteractiveCanvasOverlayProps {
  videoId: string;
  currentCue: SubtitleCue | null;
  style: SubtitleStyle | null;
  onStyleUpdated: () => void;
  onCueUpdated?: () => void;
  isSelected: boolean;
  onSelect: () => void;
  currentTimeMs?: number;
  words?: WordItem[];
}

export function InteractiveCanvasOverlay({
  videoId,
  currentCue,
  style,
  onStyleUpdated,
  onCueUpdated,
  isSelected,
  onSelect,
  currentTimeMs = 0,
  words = [],
}: InteractiveCanvasOverlayProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  const [isEditingInline, setIsEditingInline] = useState(false);
  const [inlineText, setInlineText] = useState('');

  // Dragging position state (percentage 0-100)
  const [posX, setPosX] = useState<number>(style?.positionX ?? 50);
  const [posY, setPosY] = useState<number>(style?.positionY ?? 80);
  const [fontSize, setFontSize] = useState<number>(style?.fontSizePx ?? 42);
  const [rotation, setRotation] = useState<number>(style?.rotationDeg ?? 0);
  const [containerScale, setContainerScale] = useState<number>(1);

  // Live Refs to prevent stale closures in event listeners
  const currentPosRef = useRef({ x: style?.positionX ?? 50, y: style?.positionY ?? 80 });
  const currentSizeRef = useRef(style?.fontSizePx ?? 42);
  const currentRotateRef = useRef(style?.rotationDeg ?? 0);

  const isDraggingPos = useRef(false);
  const isResizing = useRef(false);
  const isRotating = useRef(false);
  const startDragPos = useRef({ x: 0, y: 0, initialPosX: 50, initialPosY: 80 });
  const startResizePos = useRef({ y: 0, initialFontSize: 42 });
  const startRotatePos = useRef({ centerX: 0, centerY: 0 });

  useEffect(() => {
    const updateScale = () => {
      if (boxRef.current?.parentElement) {
        const parentRect = boxRef.current.parentElement.getBoundingClientRect();
        const currentHeight = parentRect.height || REFERENCE_HEIGHT;
        setContainerScale(currentHeight / REFERENCE_HEIGHT);
      }
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    if (style && !isDraggingPos.current && !isResizing.current && !isRotating.current) {
      const newX = style.positionX ?? 50;
      const newY = style.positionY ?? 80;
      const newSize = style.fontSizePx ?? 42;
      const newRot = style.rotationDeg ?? 0;

      setPosX(newX);
      setPosY(newY);
      setFontSize(newSize);
      setRotation(newRot);

      currentPosRef.current = { x: newX, y: newY };
      currentSizeRef.current = newSize;
      currentRotateRef.current = newRot;
    }
  }, [style]);

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

  const saveStyleBatch = async (patch: Partial<SubtitleStyle>) => {
    try {
      await api.patch(`/subtitles/${videoId}/style`, patch);
      onStyleUpdated();
    } catch (err) {
      console.error('Failed to update canvas style:', err);
    }
  };

  // Drag Position Handler
  const handleMouseDownPos = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    isDraggingPos.current = true;
    startDragPos.current = {
      x: e.clientX,
      y: e.clientY,
      initialPosX: currentPosRef.current.x,
      initialPosY: currentPosRef.current.y,
    };
    window.addEventListener('mousemove', handleMouseMovePos);
    window.addEventListener('mouseup', handleMouseUpPos);
  };

  const handleMouseMovePos = (e: MouseEvent) => {
    if (!isDraggingPos.current || !boxRef.current?.parentElement) return;
    const parentRect = boxRef.current.parentElement.getBoundingClientRect();

    const deltaX = e.clientX - startDragPos.current.x;
    const deltaY = e.clientY - startDragPos.current.y;

    const deltaPctX = (deltaX / parentRect.width) * 100;
    const deltaPctY = (deltaY / parentRect.height) * 100;

    const newX = Math.min(95, Math.max(5, startDragPos.current.initialPosX + deltaPctX));
    const newY = Math.min(95, Math.max(5, startDragPos.current.initialPosY + deltaPctY));

    const cleanX = Math.round(newX * 10) / 10;
    const cleanY = Math.round(newY * 10) / 10;

    setPosX(cleanX);
    setPosY(cleanY);
    currentPosRef.current = { x: cleanX, y: cleanY };
  };

  const handleMouseUpPos = () => {
    if (isDraggingPos.current) {
      isDraggingPos.current = false;
      const finalX = currentPosRef.current.x;
      const finalY = currentPosRef.current.y;
      saveStyleBatch({ positionX: finalX, positionY: finalY });
    }
    window.removeEventListener('mousemove', handleMouseMovePos);
    window.removeEventListener('mouseup', handleMouseUpPos);
  };

  // Handle Resize Corner Dragging
  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    isResizing.current = true;
    startResizePos.current = {
      y: e.clientY,
      initialFontSize: currentSizeRef.current,
    };
    window.addEventListener('mousemove', handleMouseMoveResize);
    window.addEventListener('mouseup', handleMouseUpResize);
  };

  const handleMouseMoveResize = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const deltaY = startResizePos.current.y - e.clientY;
    const newSize = Math.min(200, Math.max(10, Math.round(startResizePos.current.initialFontSize + deltaY * 0.5)));
    setFontSize(newSize);
    currentSizeRef.current = newSize;
  };

  const handleMouseUpResize = () => {
    if (isResizing.current) {
      isResizing.current = false;
      saveStyleBatch({ fontSizePx: currentSizeRef.current });
    }
    window.removeEventListener('mousemove', handleMouseMoveResize);
    window.removeEventListener('mouseup', handleMouseUpResize);
  };

  // Handle Rotation Dragging
  const handleMouseDownRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!boxRef.current) return;
    isRotating.current = true;
    const rect = boxRef.current.getBoundingClientRect();
    startRotatePos.current = {
      centerX: rect.left + rect.width / 2,
      centerY: rect.top + rect.height / 2,
    };
    window.addEventListener('mousemove', handleMouseMoveRotate);
    window.addEventListener('mouseup', handleMouseUpRotate);
  };

  const handleMouseMoveRotate = (e: MouseEvent) => {
    if (!isRotating.current) return;
    const dx = e.clientX - startRotatePos.current.centerX;
    const dy = e.clientY - startRotatePos.current.centerY;
    let rad = Math.atan2(dy, dx);
    let deg = Math.round(rad * (180 / Math.PI)) + 90;
    if (deg < 0) deg += 360;
    setRotation(deg);
    currentRotateRef.current = deg;
  };

  const handleMouseUpRotate = () => {
    if (isRotating.current) {
      isRotating.current = false;
      saveStyleBatch({ rotationDeg: currentRotateRef.current });
    }
    window.removeEventListener('mousemove', handleMouseMoveRotate);
    window.removeEventListener('mouseup', handleMouseUpRotate);
  };

  // Inline Cue Text Edit
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentCue) {
      setInlineText(currentCue.text);
      setIsEditingInline(true);
    }
  };

  const handleSaveInlineText = async () => {
    if (currentCue) {
      try {
        await api.patch(`/subtitles/${videoId}/cues/${currentCue.id}`, { text: inlineText });
        setIsEditingInline(false);
        if (onCueUpdated) onCueUpdated();
      } catch (err) {
        console.error('Failed to save inline text:', err);
      }
    }
  };

  if (!currentCue || !style) return null;

  const fontFamily = style.fontFileName
    ? style.fontFileName.replace(/\.[^/.]+$/, '')
    : 'sans-serif';

  let rawText = currentCue.text;
  if (style.uppercase) {
    rawText = rawText.toUpperCase();
  }

  const textColor = currentCue.colorHex || style.fontColorHex || '#FFFFFF';
  const outlineWidth = style.outlineWidthPx || 0;
  const outlineColor = style.outlineColorHex || '#000000';

  const strokePos = style.strokePosition || 'outside';
  let paintOrderCss = 'stroke fill markers';
  if (strokePos === 'inside') {
    paintOrderCss = 'fill stroke markers';
  } else if (strokePos === 'center') {
    paintOrderCss = 'normal';
  }

  const displayFontSize = Math.max(10, Math.round(fontSize * containerScale));
  const displayOutlineWidth = Math.round(outlineWidth * containerScale);

  const textCss: React.CSSProperties = {
    fontFamily: `'${fontFamily}', sans-serif`,
    fontSize: `${displayFontSize}px`,
    color: textColor,
    fontWeight: style.bold ? 'bold' : 'normal',
    fontStyle: style.italic ? 'italic' : 'normal',
    lineHeight: 1.2,
    textAlign: 'center',
    paintOrder: paintOrderCss,
    WebkitTextStroke: displayOutlineWidth > 0 ? `${displayOutlineWidth * (strokePos === 'outside' ? 2 : 1)}px ${outlineColor}` : '0px transparent',
    textShadow: displayOutlineWidth > 0 && strokePos === 'outside' ? `0 0 ${displayOutlineWidth * 2}px ${outlineColor}` : 'none',
  } as React.CSSProperties;

  const bgStyle = style.backgroundBoxOn
    ? {
        backgroundColor: style.backgroundColorHex || '#000000',
        opacity: style.backgroundOpacity ?? 0.5,
        padding: '0.4em 0.8em',
        borderRadius: '0.25em',
      }
    : {};

  // Karaoke Word Highlighting logic
  const cueWords = rawText.split(/\s+/);
  const activeWordInCue = words.find(
    (w) => currentTimeMs >= w.startMs && currentTimeMs <= w.endMs,
  );

  return (
    <>
      {fontFaceStyle && <style>{fontFaceStyle}</style>}
      <div
        ref={boxRef}
        onMouseDown={handleMouseDownPos}
        onDoubleClick={handleDoubleClick}
        className="absolute z-30 cursor-move select-none group"
        style={{
          left: `${posX}%`,
          top: `${posY}%`,
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          touchAction: 'none',
        }}
      >
        {/* Canva Bounding Box Outline */}
        <div
          className={`relative transition-all ${
            isSelected
              ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-transparent p-3 rounded-lg bg-cyan-500/10'
              : 'hover:ring-1 hover:ring-cyan-400/50 p-3 rounded-lg'
          }`}
        >
          {/* Rotate Handle Top */}
          {isSelected && (
            <div
              onMouseDown={handleMouseDownRotate}
              title="Rotate Text"
              className="absolute -top-10 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white border-2 border-cyan-500 shadow-xl flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-transform"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-600" />
            </div>
          )}

          {/* 4 Corner Resize Handles */}
          {isSelected && (
            <>
              <div
                onMouseDown={handleMouseDownResize}
                className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-white border-2 border-cyan-500 shadow-md cursor-nwse-resize hover:scale-125 transition-transform"
              />
              <div
                onMouseDown={handleMouseDownResize}
                className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-white border-2 border-cyan-500 shadow-md cursor-nesw-resize hover:scale-125 transition-transform"
              />
              <div
                onMouseDown={handleMouseDownResize}
                className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-white border-2 border-cyan-500 shadow-md cursor-nesw-resize hover:scale-125 transition-transform"
              />
              <div
                onMouseDown={handleMouseDownResize}
                className="absolute -bottom-2 -right-2 w-4 h-4 rounded-full bg-white border-2 border-cyan-500 shadow-md cursor-nwse-resize hover:scale-125 transition-transform"
              />
            </>
          )}

          {/* Inline Editor or Subtitle Text */}
          {isEditingInline ? (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={inlineText}
                onChange={(e) => setInlineText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveInlineText()}
                className="bg-black/90 border border-cyan-400 rounded px-3 py-1.5 text-white text-base focus:outline-none shadow-xl"
                autoFocus
              />
              <button
                onClick={handleSaveInlineText}
                className="p-1.5 rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 font-bold"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="relative max-w-3xl text-center">
              {style.backgroundBoxOn && (
                <div className="absolute inset-0 z-0 pointer-events-none" style={bgStyle} />
              )}
              <span className="relative z-10 block whitespace-pre-wrap drop-shadow-md" style={textCss}>
                {cueWords.map((wordStr, idx) => {
                  const cleanWord = wordStr.replace(/[^\w]/g, '').toLowerCase();
                  const cleanActive = activeWordInCue?.word.replace(/[^\w]/g, '').toLowerCase();
                  const isWordActive = cleanActive && cleanWord === cleanActive;

                  return (
                    <span
                      key={idx}
                      className={`inline-block mx-1 transition-all duration-75 ${
                        isWordActive
                          ? 'scale-110 font-black text-amber-300 drop-shadow-[0_0_12px_rgba(255,230,0,0.8)]'
                          : ''
                      }`}
                      style={{
                        color: isWordActive ? '#FFE600' : textColor,
                      }}
                    >
                      {wordStr}
                    </span>
                  );
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
