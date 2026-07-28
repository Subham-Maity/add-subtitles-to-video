"use client";

import React, { useState, useEffect } from 'react';
import { Download, Film, Layers, CheckCircle2, Loader2, Video, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { api, getApiUrl } from '@/lib/api';
import { ExportMode, ExportFormat, ExportJob } from '@/types/studio.types';

interface ExportPanelProps {
  videoId: string;
}

export function ExportPanel({ videoId }: ExportPanelProps) {
  const [mode, setMode] = useState<ExportMode>('OVERLAY');
  const [format, setFormat] = useState<ExportFormat>('MP4_H265');
  const [backgroundHex, setBackgroundHex] = useState('#000000');
  const [includeAudio, setIncludeAudio] = useState(true);

  const [activeJob, setActiveJob] = useState<ExportJob | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartExport = async () => {
    setIsExporting(true);
    setProgressPct(5);
    setDownloadUrl(null);
    setErrorMessage(null);

    try {
      const res = await api.post(`/videos/${videoId}/export`, {
        mode,
        format,
        backgroundHex,
        includeAudio,
      });

      const job = res.data;
      setActiveJob(job);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Export request failed');
      setIsExporting(false);
    }
  };

  // Subscribe to SSE progress for active export job
  useEffect(() => {
    if (!activeJob) return;

    const sseUrl = getApiUrl(`/exports/${activeJob.id}/progress`);
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'progress') {
          setProgressPct(data.progressPct || 5);
        } else if (data.type === 'done') {
          setProgressPct(100);
          setIsExporting(false);
          setDownloadUrl(getApiUrl(`/exports/${activeJob.id}/download`));
          eventSource.close();
        } else if (data.type === 'error') {
          setErrorMessage(data.message || 'Export rendering failed');
          setIsExporting(false);
          eventSource.close();
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [activeJob]);

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Film className="w-4 h-4 text-indigo-400" /> Fast Export Render Settings
        </h3>
        <span className="text-[10px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> NVENC GPU Accelerated
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Render Mode Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" /> Export Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('OVERLAY')}
              className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                mode === 'OVERLAY'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="font-semibold flex items-center gap-1">
                <Video className="w-3.5 h-3.5" /> Overlay
              </div>
              <div className="text-[10px] text-zinc-400">Burned onto video</div>
            </button>

            <button
              onClick={() => setMode('CAPTIONS_ONLY')}
              className={`p-2.5 rounded-xl border text-xs text-left transition-all ${
                mode === 'CAPTIONS_ONLY'
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="font-semibold flex items-center gap-1">
                <Film className="w-3.5 h-3.5" /> Captions-Only
              </div>
              <div className="text-[10px] text-zinc-400">Solid BG + Audio</div>
            </button>
          </div>
        </div>

        {/* Format Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5 text-indigo-400" /> Container Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFormat('MP4_H265')}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                format === 'MP4_H265'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              MP4 (.mp4)
            </button>

            <button
              onClick={() => setFormat('MOV')}
              className={`p-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                format === 'MOV'
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400'
              }`}
            >
              MOV (.mov)
            </button>
          </div>
        </div>
      </div>

      {/* Captions Only Options */}
      {mode === 'CAPTIONS_ONLY' && (
        <div className="p-3.5 rounded-xl glass-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300 font-medium">Solid Background Color</span>
            <div className="flex items-center gap-2">
              {['#000000', '#FFFFFF'].map((hex) => (
                <button
                  key={hex}
                  onClick={() => setBackgroundHex(hex)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    backgroundHex === hex ? 'scale-110 border-indigo-500' : 'border-zinc-700'
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <span className="text-xs text-zinc-300 flex items-center gap-1.5 font-medium">
              {includeAudio ? <Volume2 className="w-3.5 h-3.5 text-indigo-400" /> : <VolumeX className="w-3.5 h-3.5 text-zinc-500" />}
              Include Original Audio
            </span>
            <input
              type="checkbox"
              checked={includeAudio}
              onChange={(e) => setIncludeAudio(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Progress & Trigger Actions */}
      <div className="pt-2">
        {isExporting ? (
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-indigo-500/30 space-y-3 shadow-xl">
            <div className="flex items-center justify-between text-xs text-zinc-200">
              <span className="flex items-center gap-2 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                {progressPct < 25 ? 'Generating ASS Subtitle File...' : 'GPU Hardware Video Encoding...'}
              </span>
              <span className="font-mono font-bold text-indigo-400 text-sm">{progressPct}%</span>
            </div>
            <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/60 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 transition-all duration-300 rounded-full shadow-lg"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        ) : downloadUrl ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" /> Video Export Complete! Ready for download.
            </div>
            <a
              href={downloadUrl}
              download
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.01]"
            >
              <Download className="w-4 h-4" /> Download Exported Video
            </a>
          </div>
        ) : (
          <button
            onClick={handleStartExport}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.01]"
          >
            <Film className="w-4 h-4" /> Render & Export Video
          </button>
        )}

        {errorMessage && (
          <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
            {errorMessage}
          </div>
        )}
      </div>
    </div>
  );
}
