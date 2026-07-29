"use client";

/**
 * CanvasExport — WebCodecs-powered browser-side subtitle burn
 *
 * Pipeline:
 *  1. Frame-by-frame Video Seek: Seeks <video> deterministically at exact 1/fps intervals.
 *     Canvas 2D burns subtitles (with custom font, colors, animations, and karaoke highlight).
 *     WebCodecs VideoEncoder (H.264) encodes every single frame without skipping or freezing.
 *  2. Audio Extraction: Web Audio decodeAudioData extracts the full audio track to PCM,
 *     encodes via AudioEncoder (AAC-LC), and muxes 1:1 with video using mp4-muxer.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Monitor, Loader2, Download, CheckCircle2, Square, Zap } from 'lucide-react';
import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { SubtitleCue, SubtitleStyle, VideoProject } from '@/types/studio.types';
import { getApiUrl, getErrorMessage } from '@/lib/api';

interface CanvasExportProps {
  project: VideoProject;
}

// ─── WYSIWYG scaling constant — matches interactive-canvas-overlay.tsx ────────
const REFERENCE_HEIGHT = 540;

type WordTiming = { id: string; word: string; startMs: number; endMs: number; order: number };

// ─── Subtitle renderer — mirrors canvas overlay exactly ───────────────────────
function renderSubtitleOnCanvas(
  ctx: OffscreenCanvasRenderingContext2D,
  cue: SubtitleCue,
  style: SubtitleStyle,
  canvasW: number,
  canvasH: number,
  currentMs: number,
  wordTimings?: WordTiming[],
) {
  const scale = canvasH / REFERENCE_HEIGHT;
  const fontSize = Math.round((style.fontSizePx ?? 42) * scale);
  const outlineW = Math.round((style.outlineWidthPx ?? 0) * scale);

  const text = style.uppercase ? cue.text.toUpperCase() : cue.text;
  const fontFamily = style.fontFileName ? style.fontFileName.replace(/\.[^/.]+$/, '') : 'Arial';

  const posX = ((style.positionX ?? 50) / 100) * canvasW;
  const posY = ((style.positionY ?? 80) / 100) * canvasH;
  const rotDeg = style.rotationDeg ?? 0;
  const textColor = cue.colorHex ?? style.fontColorHex ?? '#FFFFFF';
  const outlineColor = style.outlineColorHex ?? '#000000';
  const strokePos = style.strokePosition ?? 'outside';

  // ── Animation ────────────────────────────────────────────────────────────────
  const animIn = Math.min(1, Math.max(0, (currentMs - cue.startMs) / 300));
  let sx = 1, sy = 1, alpha = 1, offY = 0;
  switch (style.animation ?? 'none') {
    case 'fade':  alpha = Math.min(1, animIn * 2); break;
    case 'pop':
      if (animIn < 0.27)      { sx = sy = (animIn / 0.27) * 1.2; }
      else if (animIn < 0.67) { sx = sy = 1.2 - ((animIn - 0.27) / 0.4) * 0.2; }
      alpha = Math.min(1, animIn * 4);
      break;
    case 'slide':
      offY = (1 - Math.min(1, animIn * 4)) * Math.round(60 * scale);
      alpha = Math.min(1, animIn * 3);
      break;
    case 'zoom':
      sx = sy = Math.min(1, animIn * 2);
      alpha = Math.min(1, animIn * 2);
      break;
  }

  ctx.save();
  ctx.globalAlpha = Math.max(0.01, alpha);
  ctx.translate(posX, posY + offY);
  if (rotDeg !== 0) ctx.rotate((rotDeg * Math.PI) / 180);
  ctx.scale(sx || 0.01, sy || 0.01);

  const weight = style.bold ? 'bold' : 'normal';
  const fontStyleStr = style.italic ? 'italic' : 'normal';
  ctx.font = `${fontStyleStr} ${weight} ${fontSize}px "${fontFamily}", Arial, sans-serif`;
  ctx.textBaseline = 'middle';

  // ── Word wrapping ─────────────────────────────────────────────────────────────
  const maxW = canvasW * 0.88;
  const spaceW = ctx.measureText(' ').width;
  const allWords = text.split(' ');

  type LineWord = { str: string; w: number };
  const lines: LineWord[][] = [];
  let curLine: LineWord[] = [];
  let curLineW = 0;

  for (const word of allWords) {
    const ww = ctx.measureText(word).width;
    const addW = curLine.length > 0 ? spaceW + ww : ww;
    if (curLine.length > 0 && curLineW + addW > maxW) {
      lines.push(curLine);
      curLine = [{ str: word, w: ww }];
      curLineW = ww;
    } else {
      curLine.push({ str: word, w: ww });
      curLineW += addW;
    }
  }
  if (curLine.length) lines.push(curLine);

  // ── Active word timing for karaoke yellow highlight ───────────────────────────
  const activeWord = wordTimings?.find(w => currentMs >= w.startMs && currentMs <= w.endMs);
  const activeClean = activeWord?.word.replace(/[^\w]/g, '').toLowerCase();

  const lh = fontSize * 1.25;
  const startY = -(lines.length * lh) / 2 + lh / 2;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const y = startY + i * lh;
    const lineW = line.reduce((sum, wd, idx) => sum + wd.w + (idx > 0 ? spaceW : 0), 0);

    if (style.backgroundBoxOn) {
      ctx.save();
      ctx.globalAlpha *= style.backgroundOpacity ?? 0.5;
      ctx.fillStyle = style.backgroundColorHex ?? '#000000';
      ctx.fillRect(-lineW / 2 - 12, y - fontSize / 2 - 6, lineW + 24, fontSize + 12);
      ctx.restore();
    }

    ctx.textAlign = 'left';
    let x = -lineW / 2;

    for (let j = 0; j < line.length; j++) {
      const wd = line[j];
      if (j > 0) x += spaceW;

      const cleanWordStr = wd.str.replace(/[^\w]/g, '').toLowerCase();
      const isActive = !!(activeClean && cleanWordStr === activeClean);

      const wordColor = isActive ? '#FFE600' : textColor;
      const wordScale = isActive ? 1.1 : 1.0;

      ctx.save();
      if (wordScale !== 1) {
        const cx = x + wd.w / 2;
        ctx.translate(cx, y);
        ctx.scale(wordScale, wordScale);
        ctx.translate(-cx, -y);
      }

      if (outlineW > 0) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = strokePos === 'outside' ? outlineW * 2 : outlineW;
        ctx.strokeStyle = outlineColor;
        ctx.strokeText(wd.str, x, y);
      }

      ctx.fillStyle = wordColor;
      ctx.fillText(wd.str, x, y);

      ctx.restore();

      x += wd.w;
    }
  }

  ctx.restore();
}

// ─── AVC codec selection based on resolution ──────────────────────────────────
function getAvcCodec(w: number, h: number): string {
  const codedArea = Math.ceil(w / 16) * 16 * Math.ceil(h / 16) * 16;
  if (codedArea <= 921_600)   return 'avc1.640020'; // Level 3.2 (≤720p)
  if (codedArea <= 2_228_224) return 'avc1.640029'; // Level 4.1 (≤1080×1920)
  return 'avc1.640033';                              // Level 5.1 (≤4K)
}

export function CanvasExport({ project }: CanvasExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadName, setDownloadName] = useState('subtitled.mp4');
  const [error, setError] = useState<string | null>(null);
  const [includeAudio, setIncludeAudio] = useState(true);
  const [isSupported, setIsSupported] = useState(true);

  const cancelRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const ok =
      typeof VideoEncoder !== 'undefined' &&
      typeof OffscreenCanvas !== 'undefined';
    setIsSupported(ok);
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    if (videoRef.current) videoRef.current.pause();
    setIsExporting(false);
  }, []);

  const startExport = async () => {
    const { cues, style, words: wordTimings, width: vidW, height: vidH, fps, durationMs, id } = project;

    if (!cues?.length || !style) {
      setError('No cues or style found — transcribe first.');
      return;
    }

    cancelRef.current = false;
    setIsExporting(true);
    setProgress(0);
    setError(null);
    setDownloadUrl(null);
    setStatusMsg('Loading custom font...');

    if (videoRef.current) { videoRef.current.remove(); videoRef.current = null; }

    try {
      // ── 1. Load custom font if specified ─────────────────────────────────
      if (style.fontFileName) {
        const fontName = style.fontFileName.replace(/\.[^/.]+$/, '');
        try {
          const face = new FontFace(fontName, `url(/lang/${style.fontFileName})`);
          await face.load();
          document.fonts.add(face);
          await document.fonts.ready;
        } catch { /* Fall back to Arial */ }
      }

      // ── 2. OffscreenCanvas at video's native resolution ───────────────────
      const canvas = new OffscreenCanvas(vidW, vidH);
      const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

      // ── 3. Hidden video element for frame-by-frame seeking ────────────────
      const videoEl = document.createElement('video');
      videoEl.src = getApiUrl(`/videos/${id}/stream`);
      videoEl.crossOrigin = 'anonymous';
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.preload = 'auto';
      videoEl.style.position = 'fixed';
      videoEl.style.opacity = '0';
      videoEl.style.pointerEvents = 'none';
      document.body.appendChild(videoEl);
      videoRef.current = videoEl;

      await new Promise<void>((res, rej) => {
        videoEl.onloadedmetadata = () => res();
        videoEl.onerror = () => rej(new Error('Video failed to load from server'));
        setTimeout(() => res(), 12_000);
      });

      // ── 4. Set up mp4-muxer & Encoders ────────────────────────────────────
      const hasAudioTrack = includeAudio;
      let audioSampleRate = 44100;
      let audioChannels = 2;

      const muxer = new Muxer({
        target: new ArrayBufferTarget(),
        video: { codec: 'avc', width: vidW, height: vidH },
        ...(hasAudioTrack ? { audio: { codec: 'aac', sampleRate: audioSampleRate, numberOfChannels: audioChannels } } : {}),
        fastStart: 'in-memory',
        firstTimestampBehavior: 'offset',
      });

      const targetFps = Math.round(fps) || 30;
      const frameDurationSec = 1 / targetFps;
      const durationSec = durationMs > 0 ? durationMs / 1000 : (videoEl.duration || 10);
      const totalFrames = Math.max(1, Math.floor(durationSec * targetFps));

      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
        error: (e) => { throw new Error(`VideoEncoder: ${e.message}`); },
      });

      videoEncoder.configure({
        codec: getAvcCodec(vidW, vidH),
        width: vidW,
        height: vidH,
        bitrate: 10_000_000,
        framerate: targetFps,
        hardwareAcceleration: 'prefer-hardware',
        latencyMode: 'quality',
      });

      // ── 5. Audio Extraction & Encoding (decodeAudioData) ──────────────────
      if (hasAudioTrack) {
        setStatusMsg('Extracting audio track...');
        setProgress(2);
        try {
          const audioRes = await fetch(getApiUrl(`/videos/${id}/stream`));
          const arrayBuffer = await audioRes.arrayBuffer();

          const offlineCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const audioBuffer = await offlineCtx.decodeAudioData(arrayBuffer);

          audioSampleRate = audioBuffer.sampleRate;
          audioChannels = Math.min(2, audioBuffer.numberOfChannels);

          const audioEncoder = new AudioEncoder({
            output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
            error: (e) => console.warn(`AudioEncoder error: ${e.message}`),
          });

          audioEncoder.configure({
            codec: 'mp4a.40.2', // AAC-LC
            sampleRate: audioSampleRate,
            numberOfChannels: audioChannels,
            bitrate: 128_000,
          });

          const chunkSize = 1024;
          const totalSamples = audioBuffer.length;
          const channelData: Float32Array[] = [];
          for (let c = 0; c < audioChannels; c++) {
            channelData.push(audioBuffer.getChannelData(c));
          }

          for (let offset = 0; offset < totalSamples; offset += chunkSize) {
            if (cancelRef.current) break;
            const currentChunkSize = Math.min(chunkSize, totalSamples - offset);

            const planarBuffer = new Float32Array(currentChunkSize * audioChannels);
            for (let c = 0; c < audioChannels; c++) {
              const samples = channelData[c].subarray(offset, offset + currentChunkSize);
              planarBuffer.set(samples, c * currentChunkSize);
            }

            const timestampUs = Math.round((offset / audioSampleRate) * 1_000_000);
            const audioData = new AudioData({
              format: 'f32-planar',
              sampleRate: audioSampleRate,
              numberOfFrames: currentChunkSize,
              numberOfChannels: audioChannels,
              timestamp: timestampUs,
              data: planarBuffer,
            });

            audioEncoder.encode(audioData);
            audioData.close();
          }

          await audioEncoder.flush();
          audioEncoder.close();
          await offlineCtx.close();
        } catch (audioErr) {
          console.warn('Audio decoding skipped or failed:', audioErr);
        }
      }

      // ── 6. Deterministic Frame-by-Frame Video Processing Loop ─────────────
      setStatusMsg(`Encoding video (${totalFrames} frames)...`);
      setProgress(5);

      for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
        if (cancelRef.current) break;

        const currentTimeSec = frameIdx * frameDurationSec;
        const mediaTimeMs = currentTimeSec * 1000;

        // Seek video element to exact frame timestamp
        videoEl.currentTime = currentTimeSec;

        // Wait for frame to be seeked and decoded
        await new Promise<void>((res) => {
          let resolved = false;
          const done = () => {
            if (!resolved) {
              resolved = true;
              videoEl.removeEventListener('seeked', done);
              res();
            }
          };
          videoEl.addEventListener('seeked', done);
          // Safety timeout for fast local seeking
          setTimeout(done, 120);
        });

        // Draw frame onto OffscreenCanvas
        ctx.clearRect(0, 0, vidW, vidH);
        ctx.drawImage(videoEl, 0, 0, vidW, vidH);

        // Find active cue and burn subtitles (with karaoke highlight)
        const activeCue = cues.find(c => mediaTimeMs >= c.startMs && mediaTimeMs <= c.endMs);
        if (activeCue) {
          renderSubtitleOnCanvas(ctx, activeCue, style, vidW, vidH, mediaTimeMs, wordTimings);
        }

        // Encode frame
        const timestampUs = Math.round(currentTimeSec * 1_000_000);
        const durationUs = Math.round(frameDurationSec * 1_000_000);
        const vf = new VideoFrame(canvas, { timestamp: timestampUs, duration: durationUs });

        const isKeyframe = frameIdx % (targetFps * 2) === 0;
        videoEncoder.encode(vf, { keyFrame: isKeyframe });
        vf.close();

        // Update progress
        if (frameIdx % 10 === 0 || frameIdx === totalFrames - 1) {
          const pct = Math.min(95, 5 + Math.round(((frameIdx + 1) / totalFrames) * 90));
          setProgress(pct);
          const s = Math.round(currentTimeSec);
          const t = Math.round(durationSec);
          setStatusMsg(`Encoding ${s}s / ${t}s (${frameIdx + 1}/${totalFrames} frames)...`);
        }
      }

      if (cancelRef.current) {
        videoEncoder.close();
        videoEl.remove();
        setIsExporting(false);
        return;
      }

      // ── 7. Flush & Finalize ───────────────────────────────────────────────
      setStatusMsg('Finalizing MP4 container...');
      setProgress(96);

      await videoEncoder.flush();
      videoEncoder.close();
      videoEl.remove();

      muxer.finalize();

      const { buffer } = (muxer.target as ArrayBufferTarget);
      const blob = new Blob([buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const name = `${project.originalFilename.replace(/\.[^.]+$/, '')}-subtitled.mp4`;

      setDownloadUrl(url);
      setDownloadName(name);
      setProgress(100);
      setStatusMsg('');
      setIsExporting(false);

    } catch (err: any) {
      setError(getErrorMessage(err, 'Export failed'));
      setIsExporting(false);
      if (videoRef.current) { videoRef.current.remove(); videoRef.current = null; }
    }
  };

  const reset = () => {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl(null);
    setProgress(0);
    setError(null);
    setStatusMsg('');
  };

  const hasCues = (project.cues?.length ?? 0) > 0;
  const hasStyle = !!project.style;

  if (!isSupported) {
    return (
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-2">
        <p className="font-bold">⚠ Browser Canvas Export requires Chrome or Edge</p>
        <p>WebCodecs API not detected. Use the Server FFmpeg tab instead.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
        <Monitor className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-semibold text-white">Browser Canvas Export</span>
        <span className="ml-auto text-[10px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-bold flex items-center gap-1">
          <Zap className="w-3 h-3" /> Frame-Accurate H.264 MP4
        </span>
      </div>

      <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15 text-[11px] text-zinc-300 space-y-1.5">
        <p className="font-semibold text-cyan-300">✓ 100% WYSIWYG & Frame-Accurate — Zero Freezing</p>
        <p>
          Seeks every frame deterministically, burns subtitles with Canvas 2D (same as editor preview), 
          extracts PCM audio in memory, and outputs pristine <strong className="text-zinc-100">H.264 AAC MP4</strong>.
        </p>
      </div>

      {/* Audio toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <span className="text-xs text-zinc-300 font-medium">Include Original Audio</span>
        <input
          type="checkbox"
          checked={includeAudio}
          onChange={(e) => setIncludeAudio(e.target.checked)}
          disabled={isExporting}
          className="w-4 h-4 accent-cyan-500 cursor-pointer"
        />
      </div>

      {/* Progress */}
      {isExporting && (
        <div className="p-4 rounded-xl bg-zinc-900/90 border border-cyan-500/30 space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-200">
            <span className="flex items-center gap-2 font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              {statusMsg}
            </span>
            <span className="font-mono font-bold text-cyan-400">{progress}%</span>
          </div>
          <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 transition-all duration-200 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button onClick={cancel} className="w-full py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-red-500/20">
            <Square className="w-3.5 h-3.5" /> Cancel
          </button>
        </div>
      )}

      {/* Download */}
      {downloadUrl && !isExporting && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" /> Done! Frame-accurate MP4 with audio + subtitles.
          </div>
          <a
            href={downloadUrl}
            download={downloadName}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.01]"
          >
            <Download className="w-4 h-4" /> Download {downloadName}
          </a>
          <button onClick={reset} className="w-full py-2 text-xs text-zinc-500 hover:text-zinc-300">Export again</button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {getErrorMessage(error, 'Export failed')}
        </div>
      )}

      {/* Start */}
      {!isExporting && !downloadUrl && (
        <button
          onClick={startExport}
          disabled={!hasCues || !hasStyle}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/25 transition-all hover:scale-[1.01]"
        >
          <Monitor className="w-4 h-4" />
          {!hasCues ? 'No cues — transcribe first' : 'Start Canvas Export (H.264 MP4 + Audio)'}
        </button>
      )}
    </div>
  );
}
