"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  FileVideo,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  Layers,
  CheckSquare,
  Square,
  FileText,
  Clock,
  Sparkles,
  X,
  FileCheck,
  Languages,
  Terminal,
  Cpu,
  Zap,
  Activity,
  SquareX,
} from 'lucide-react';
import { api, getApiUrl } from '@/lib/api';
import { VideoProject } from '@/types/studio.types';

export type SubtitleFormat = 'srt' | 'text';

const BATCH_LANGUAGE_OPTIONS = [
  { code: 'en', name: '🇬🇧 Translate Audio to English (Hindi/Any -> English Subtitles - en)' },
  { code: 'hi-strict', name: '🇮🇳 Strict Hindi (100% Devanagari - hi-strict)' },
  { code: 'hi', name: '🇮🇳 Standard Hindi (Devanagari - hi)' },
  { code: 'hi-roman', name: '🔤 Hinglish (Roman Script - hi-roman)' },
  { code: 'auto', name: '🌐 Auto-detect Original Language' },
  { code: 'ur', name: '🇵🇰 Urdu (ur)' },
  { code: 'es', name: '🇪🇸 Spanish (es)' },
  { code: 'fr', name: '🇫🇷 French (fr)' },
];

interface BatchClip {
  project: VideoProject;
  status: 'queued' | 'extracting' | 'completed' | 'failed';
  pct: number;
  stage: string;
  logMessage: string;
  latestText: string;
  logs: string[];
  error?: string;
  srtContent?: string;
  textContent?: string;
}

export function BatchExtractor() {
  const [selectedFormat, setSelectedFormat] = useState<SubtitleFormat>('srt');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('hi');
  const [clips, setClips] = useState<BatchClip[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isUploading, setIsUploading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedResult, setMergedResult] = useState<{ content: string; filename: string; format: SubtitleFormat } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeConsoleId, setActiveConsoleId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe active queued / extracting clips to real-time SSE progress stream
  useEffect(() => {
    const activeClips = clips.filter((c) => c.status === 'queued' || c.status === 'extracting');
    if (activeClips.length === 0) return;

    const eventSources: { [id: string]: EventSource } = {};

    activeClips.forEach((clip) => {
      const sseUrl = getApiUrl(`/videos/${clip.project.id}/progress`);
      const es = new EventSource(sseUrl);
      eventSources[clip.project.id] = es;

      es.onmessage = async (event) => {
        try {
          const payload = JSON.parse(event.data);
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          setClips((prevClips) =>
            prevClips.map((c) => {
              if (c.project.id !== clip.project.id) return c;

              const isCompleted = payload.type === 'done' || payload.stage === 'TRANSCRIBED' || payload.pct === 100;
              const isError = payload.type === 'error';

              let newLogs = [...c.logs];
              if (payload.logMessage) {
                newLogs.push(`[${timestamp}] > ${payload.logMessage}`);
              } else if (payload.message) {
                newLogs.push(`[${timestamp}] > ${payload.message}`);
              }

              let latestText = c.latestText;
              if (payload.logMessage && payload.logMessage.includes(']: "')) {
                latestText = payload.logMessage;
              }

              return {
                ...c,
                pct: payload.pct !== undefined ? payload.pct : c.pct,
                stage: payload.stage || c.stage,
                logMessage: payload.logMessage || payload.message || c.logMessage,
                latestText: latestText,
                logs: newLogs.slice(-100),
                status: isCompleted ? 'completed' : isError ? 'failed' : 'extracting',
                error: isError ? payload.message : c.error,
              };
            }),
          );

          if (payload.type === 'done' || payload.stage === 'TRANSCRIBED' || payload.pct === 100) {
            es.close();
            // Fetch completed subtitle contents
            try {
              const srtRes = await api.get(`/subtitles/project/${clip.project.id}/export?format=srt`);
              const textRes = await api.get(`/subtitles/project/${clip.project.id}/export?format=text`);
              setClips((prevClips) =>
                prevClips.map((c) =>
                  c.project.id === clip.project.id
                    ? {
                        ...c,
                        status: 'completed',
                        pct: 100,
                        srtContent: typeof srtRes.data === 'string' ? srtRes.data : JSON.stringify(srtRes.data),
                        textContent: typeof textRes.data === 'string' ? textRes.data : JSON.stringify(textRes.data),
                      }
                    : c,
                ),
              );
            } catch (e) {}
          } else if (payload.type === 'error') {
            es.close();
          }
        } catch (err) {}
      };

      es.onerror = () => {
        es.close();
      };
    });

    return () => {
      Object.values(eventSources).forEach((es) => es.close());
    };
  }, [clips.map((c) => `${c.project.id}:${c.status}`).join(',')]);

  const handleMultipleFiles = async (files: FileList | File[]) => {
    const videoFiles = Array.from(files).filter((f) => f.type.startsWith('video/'));
    if (videoFiles.length === 0) return;

    setIsUploading(true);
    const newBatchClips: BatchClip[] = [];

    for (const file of videoFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('language', selectedLanguage);

        const res = await api.post('/videos/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const project: VideoProject = res.data;
        newBatchClips.push({
          project,
          status: 'queued',
          pct: 5,
          stage: 'UPLOADED',
          logMessage: 'Enqueued clip into Redis processing queue...',
          latestText: '',
          logs: [`[${new Date().toLocaleTimeString()}] > Enqueued ${file.name} into Redis BullMQ queue (Language: ${selectedLanguage})`],
        });
      } catch (err) {
        console.error(`Failed to upload file ${file.name}:`, err);
      }
    }

    setClips((prev) => [...prev, ...newBatchClips]);
    setSelectedIds((prev) => {
      const updated = new Set(prev);
      newBatchClips.forEach((c) => updated.add(c.project.id));
      return updated;
    });

    setIsUploading(false);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === clips.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(clips.map((c) => c.project.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleClearQueue = async () => {
    if (!confirm('Stop all active Python AI tasks, purge Redis queue, and cancel active clip processing?')) return;
    try {
      await api.post('/videos/queue/clear-all');
      setClips((prev) =>
        prev.map((c) => ({
          ...c,
          status: c.status === 'completed' ? 'completed' : 'failed',
          error: 'Processing stopped by user',
        })),
      );
    } catch (err) {
      console.error('Failed to clear queue:', err);
    }
  };

  const handleMergeSelected = async () => {
    const selectedArray = Array.from(selectedIds);
    if (selectedArray.length === 0) return;

    setIsMerging(true);
    setMergedResult(null);

    try {
      const res = await api.post('/subtitles/batch/merge', {
        videoProjectIds: selectedArray,
        format: selectedFormat,
      });

      setMergedResult({
        content: res.data.content,
        filename: res.data.filename,
        format: selectedFormat,
      });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to merge subtitles.');
    } finally {
      setIsMerging(false);
    }
  };

  const handleCopyText = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleDownloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeCount = clips.filter((c) => c.status === 'extracting' || c.status === 'queued').length;
  const completedCount = clips.filter((c) => c.status === 'completed').length;

  return (
    <div className="w-full max-w-5xl mx-auto my-8 space-y-6">
      {/* Container Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 p-6 md:p-8 text-white shadow-2xl border border-indigo-900/50 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black tracking-widest uppercase shadow-inner">
            <Layers className="w-4 h-4 text-indigo-400" /> Multi-Video Chunk Processing
          </div>

          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white">
            Extract Subtitles Across Multiple Movie Clips
          </h2>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed font-normal">
            Upload multiple video or movie clips to process clip-by-clip in background queues. Observe real-time FFmpeg &amp; Faster-Whisper live telemetry progress, preview extracted segments, and merge all clip subtitles into a single consolidated file directly inside the app.
          </p>

          {/* Controls Bar */}
          <div className="pt-4 space-y-4 border-t border-indigo-800/50">
            {/* Target Language Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-indigo-700/50 p-3 rounded-2xl">
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-indigo-200">
                  Target Speech Language (Before Extraction):
                </span>
              </div>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-indigo-950/80 text-white text-xs font-bold border border-indigo-700 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
              >
                {BATCH_LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Output Format Selector */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Select Output Format:
              </span>

              <div className="inline-flex p-1 rounded-2xl bg-slate-900/90 border border-indigo-700/50 shadow-inner">
                <button
                  type="button"
                  onClick={() => setSelectedFormat('srt')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                    selectedFormat === 'srt'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>SRT Format (with Timestamps)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormat('text')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                    selectedFormat === 'text'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Normal Plain Text (without Timestamps)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Dropzone for Multiple Video Files */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-3xl p-8 text-center cursor-pointer bg-white transition-all shadow-sm hover:shadow-md group"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleMultipleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
          </div>

          <div className="space-y-1">
            <h4 className="text-lg font-extrabold text-slate-900">
              {isUploading ? 'Uploading Multiple Clips...' : 'Click or Drag & Drop Multiple Video Clips'}
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              Select multiple MP4, MOV, or WEBM clips at once to process in Redis queue
            </p>
          </div>
        </div>
      </div>

      {/* Extracted Chunks Table & Live Progress View */}
      {clips.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden space-y-4 p-6">
          {/* Global Telemetry Header Bar */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 border border-slate-800 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Activity className="w-5 h-5 animate-pulse text-indigo-400" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                  Redis Queue &amp; Real-time AI Telemetry Stream
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  {clips.length} Clips Enqueued &bull; {activeCount} Active Processing &bull; {completedCount} Completed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearQueue}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-200 text-xs font-bold transition-all cursor-pointer border border-rose-800"
                title="Stop all active Python AI tasks & purge Redis queue immediately"
              >
                <SquareX className="w-4 h-4 text-rose-400" />
                <span>Stop &amp; Clear Queue</span>
              </button>

              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all cursor-pointer border border-slate-700"
              >
                {selectedIds.size === clips.length ? (
                  <CheckSquare className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>{selectedIds.size === clips.length ? 'Deselect All' : 'Select All'}</span>
              </button>

              <button
                type="button"
                onClick={handleMergeSelected}
                disabled={selectedIds.size === 0 || isMerging}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isMerging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                <span>Merge Selected Subtitles ({selectedIds.size})</span>
              </button>
            </div>
          </div>

          {/* Structured Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                  <th className="p-3.5 w-10 text-center">Select</th>
                  <th className="p-3.5">Clip / Video</th>
                  <th className="p-3.5 w-48">Processing Status &amp; Progress</th>
                  <th className="p-3.5 w-20">Format</th>
                  <th className="p-3.5">Live Subtitle Telemetry / Preview</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {clips.map((clip) => {
                  const isSelected = selectedIds.has(clip.project.id);
                  const activeContent =
                    selectedFormat === 'text' ? clip.textContent || '' : clip.srtContent || '';

                  return (
                    <React.Fragment key={clip.project.id}>
                      <tr
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isSelected ? 'bg-indigo-50/30' : ''
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3.5 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(clip.project.id)}
                            className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* Clip / Video Info */}
                        <td className="p-3.5 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <FileVideo className="w-4 h-4 text-indigo-500 shrink-0" />
                            <span className="truncate max-w-[170px]" title={clip.project.originalFilename}>
                              {clip.project.originalFilename}
                            </span>
                          </div>
                        </td>

                        {/* Processing Status & Progress Bar */}
                        <td className="p-3.5 space-y-1.5">
                          {clip.status === 'completed' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Extracted (100%)
                            </span>
                          )}

                          {clip.status === 'extracting' && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-200">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                                {clip.stage === 'EXTRACTING_AUDIO' ? 'Audio Extracting' : 'Whisper AI'} ({clip.pct}%)
                              </span>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300"
                                  style={{ width: `${Math.max(5, clip.pct)}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {clip.status === 'queued' && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[11px] font-bold border border-amber-200">
                                <Clock className="w-3.5 h-3.5 animate-pulse text-amber-600" /> Queued (5%)
                              </span>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400 w-1/12 animate-pulse" />
                              </div>
                            </div>
                          )}

                          {clip.status === 'failed' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Failed
                            </span>
                          )}
                        </td>

                        {/* Format Badge */}
                        <td className="p-3.5 font-bold uppercase text-[10px] text-slate-500">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {selectedFormat}
                          </span>
                        </td>

                        {/* Live Subtitle Telemetry / Preview */}
                        <td className="p-3.5 text-slate-600 max-w-[280px]">
                          {activeContent ? (
                            <p className="truncate font-mono text-[11px] text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
                              {activeContent.substring(0, 85)}...
                            </p>
                          ) : clip.latestText ? (
                            <div className="flex items-center gap-1.5 bg-indigo-950 text-indigo-200 px-2.5 py-1 rounded-xl border border-indigo-800 font-mono text-[11px] truncate animate-pulse">
                              <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">{clip.latestText}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] italic">
                              <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                              <span>{clip.logMessage || 'Processing queue...'}</span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 text-right space-x-1.5">
                          {/* Live Console Drawer Toggle */}
                          <button
                            type="button"
                            onClick={() => setActiveConsoleId(activeConsoleId === clip.project.id ? null : clip.project.id)}
                            className={`p-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                              activeConsoleId === clip.project.id
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                            }`}
                            title="View Real-time Terminal Log Console"
                          >
                            <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Log</span>
                          </button>

                          {activeContent && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyText(activeContent, clip.project.id)}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer border border-slate-200"
                                title="Copy Subtitles"
                              >
                                {copiedId === clip.project.id ? (
                                  <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadFile(
                                    activeContent,
                                    `${clip.project.originalFilename}_subtitles.${selectedFormat}`,
                                  )
                                }
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 transition-colors inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer border border-slate-200"
                                title="Download Subtitles"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Live Console Drawer Row */}
                      {activeConsoleId === clip.project.id && (
                        <tr className="bg-slate-950 text-slate-200">
                          <td colSpan={6} className="p-4 space-y-2 font-mono text-[11px]">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <span className="font-bold text-indigo-400 flex items-center gap-2">
                                <Terminal className="w-4 h-4 text-indigo-400" />
                                Live Telemetry Stream: {clip.project.originalFilename}
                              </span>
                              <span className="text-[10px] text-slate-500 uppercase">
                                Stage: {clip.stage} &bull; Progress: {clip.pct}%
                              </span>
                            </div>
                            <div className="bg-slate-900 p-3 rounded-xl max-h-48 overflow-y-auto space-y-1 border border-slate-800">
                              {clip.logs.length === 0 ? (
                                <p className="text-slate-500 italic">Waiting for telemetry log events...</p>
                              ) : (
                                clip.logs.map((log, idx) => (
                                  <p key={idx} className="text-emerald-400/90 whitespace-pre-wrap">
                                    {log}
                                  </p>
                                ))
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Merged Results Modal */}
      {mergedResult && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200 relative">
            <button
              onClick={() => setMergedResult(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Merged Subtitles Output</h3>
                <p className="text-xs text-slate-500 font-medium uppercase">
                  Format: {mergedResult.format.toUpperCase()} &bull; File: {mergedResult.filename}
                </p>
              </div>
            </div>

            {/* Preview Box */}
            <div className="bg-slate-950 text-slate-100 p-4 rounded-2xl font-mono text-xs max-h-96 overflow-y-auto leading-relaxed border border-slate-800">
              <pre className="whitespace-pre-wrap">{mergedResult.content}</pre>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleCopyText(mergedResult.content, 'merged')}
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
              >
                {copiedId === 'merged' ? (
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedId === 'merged' ? 'Copied!' : 'Copy to Clipboard'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadFile(mergedResult.content, mergedResult.filename)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Merged Subtitles ({mergedResult.format.toUpperCase()})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
