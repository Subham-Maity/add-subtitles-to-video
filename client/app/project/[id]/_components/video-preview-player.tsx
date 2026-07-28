"use client";

import React, { useState } from 'react';
import { SubtitleCue, SubtitleStyle } from '@/types/studio.types';
import { InteractiveCanvasOverlay } from './interactive-canvas-overlay';
import { getApiUrl } from '@/lib/api';

interface VideoPreviewPlayerProps {
  videoId: string;
  cues: SubtitleCue[];
  style: SubtitleStyle | null;
  currentTimeMs: number;
  onTimeUpdate: (ms: number) => void;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  width?: number;
  height?: number;
  onStyleUpdated: () => void;
  onCueUpdated?: () => void;
  activeCueOverride?: SubtitleCue | null;
  words?: Array<{ id: string; word: string; startMs: number; endMs: number; order: number }>;
}

export function VideoPreviewPlayer({
  videoId,
  cues,
  style,
  currentTimeMs,
  onTimeUpdate,
  videoRef,
  width,
  height,
  onStyleUpdated,
  onCueUpdated,
  activeCueOverride,
  words = [],
}: VideoPreviewPlayerProps) {
  const [isSelected, setIsSelected] = useState(true);

  // Find active cue based on timestamp or override
  const playbackCue = cues.find(
    (c) => currentTimeMs >= c.startMs && currentTimeMs <= c.endMs,
  ) || null;

  const currentCue = activeCueOverride || playbackCue || cues[0] || null;

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(Math.round(videoRef.current.currentTime * 1000));
    }
  };

  const videoStreamUrl = getApiUrl(`/videos/${videoId}/stream`);
  const containerAspectRatio = width && height ? `${width} / ${height}` : '16 / 9';

  return (
    <div
      onClick={() => setIsSelected(false)}
      className="relative w-full rounded-2xl overflow-hidden glass-panel border border-zinc-800/80 shadow-2xl flex items-center justify-center bg-black mx-auto"
      style={{
        aspectRatio: containerAspectRatio,
        maxHeight: '62vh',
      }}
    >
      <video
        ref={videoRef}
        src={videoStreamUrl}
        onTimeUpdate={handleTimeUpdate}
        controls
        className="w-full h-full object-contain"
      />

      <InteractiveCanvasOverlay
        videoId={videoId}
        currentCue={currentCue}
        style={style}
        onStyleUpdated={onStyleUpdated}
        onCueUpdated={onCueUpdated}
        isSelected={isSelected}
        onSelect={() => setIsSelected(true)}
        currentTimeMs={currentTimeMs}
        words={words}
      />
    </div>
  );
}
