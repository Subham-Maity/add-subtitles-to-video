"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Loader2, AlertCircle, RefreshCw, Cpu, Music, Terminal, Clock, ShieldCheck, Sparkles } from 'lucide-react';
import { getApiUrl, api } from '@/lib/api';

interface PipelineProgressBannerProps {
  videoId: string;
  status: string;
  errorMessage?: string | null;
  onCompleted: () => void;
}

interface LogEntry {
  timestamp: string;
  message: string;
  stage?: string;
}

export function PipelineProgressBanner({
  videoId,
  status: initialStatus,
  errorMessage: initialErrorMessage,
  onCompleted,
}: PipelineProgressBannerProps) {
  const [currentStage, setCurrentStage] = useState<string>(initialStatus);
  const [errorMsg, setErrorMsg] = useState<string | null>(initialErrorMessage || null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [progressPct, setProgressPct] = useState<number>(25);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [deviceInfo, setDeviceInfo] = useState<string>('Local AI Engine (CPU / GPU)');
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentStage(initialStatus);
  }, [initialStatus]);

  // Elapsed timer ticker
  useEffect(() => {
    if (currentStage === 'TRANSCRIBED' || currentStage === 'FAILED') return;
    const startTime = Date.now() - elapsedMs;

    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(timer);
  }, [currentStage]);

  // Backup status polling ticker
  useEffect(() => {
    if (currentStage === 'TRANSCRIBED' || currentStage === 'FAILED') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await api.get(`/videos/${videoId}`);
        const proj = res.data;
        if (proj.status === 'TRANSCRIBED') {
          setCurrentStage('TRANSCRIBED');
          setProgressPct(100);
          onCompleted();
        } else if (proj.status === 'FAILED') {
          setCurrentStage('FAILED');
          setErrorMsg(proj.errorMessage || 'Transcription failed');
        }
      } catch (err) {
        console.error('Polling status error:', err);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [videoId, currentStage]);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (currentStage === 'TRANSCRIBED') return;

    const sseUrl = getApiUrl(`/videos/${videoId}/progress`);
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.pct) setProgressPct(data.pct);
        if (data.elapsedMs) setElapsedMs(data.elapsedMs);
        if (data.device) setDeviceInfo(data.device);
        if (data.language) setDetectedLang(data.language);

        if (data.logMessage) {
          const nowStr = new Date().toLocaleTimeString();
          setLogs((prev) => [...prev, { timestamp: nowStr, message: data.logMessage, stage: data.stage }]);
        }

        if (data.type === 'stage') {
          setCurrentStage(data.stage);
          if (data.stage === 'TRANSCRIBED') {
            onCompleted();
            eventSource.close();
          }
        } else if (data.type === 'done') {
          setCurrentStage('TRANSCRIBED');
          setProgressPct(100);
          onCompleted();
          eventSource.close();
        } else if (data.type === 'error') {
          setCurrentStage('FAILED');
          setErrorMsg(data.message || 'Pipeline processing failed');
          eventSource.close();
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [videoId, currentStage]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setErrorMsg(null);
    setCurrentStage('TRANSCRIBING');
    setProgressPct(30);
    setLogs([]);
    try {
      await api.post(`/videos/${videoId}/retry`);
    } catch (err) {
      console.error('Failed to retry pipeline:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleReset = async () => {
    try {
      await api.post(`/videos/${videoId}/reset`);
      setCurrentStage('TRANSCRIBED');
      onCompleted();
    } catch (err) {
      console.error('Failed to reset pipeline:', err);
    }
  };

  if (currentStage === 'TRANSCRIBED') return null;

  let stageTitle = 'Processing Video...';
  let stageDetail = 'Preparing media pipeline...';
  let Icon = Loader2;

  if (currentStage === 'UPLOADED') {
    stageTitle = 'Video Uploaded';
    stageDetail = 'Initializing audio extraction...';
    Icon = Music;
  } else if (currentStage === 'EXTRACTING_AUDIO') {
    stageTitle = 'Extracting Audio Stream';
    stageDetail = 'Extracting 16kHz mono WAV audio with FFmpeg...';
    Icon = Music;
  } else if (currentStage === 'TRANSCRIBING') {
    stageTitle = 'Faster-Whisper AI Transcription';
    stageDetail = `Detecting speech & word timestamps (Language: ${detectedLang || 'Auto-detect'})...`;
    Icon = Cpu;
  } else if (currentStage === 'FAILED') {
    stageTitle = 'Transcription Error';
    stageDetail = errorMsg || 'Transcription service failed to process audio.';
    Icon = AlertCircle;
  }

  const formatElapsedSec = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="w-full my-6 p-6 rounded-3xl bg-slate-900 text-white border border-indigo-500/30 shadow-2xl space-y-5">
      {/* Header Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          {currentStage === 'FAILED' ? (
            <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertCircle className="w-6 h-6" />
            </div>
          ) : (
            <div className="p-3 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Icon className="w-6 h-6 animate-spin" />
            </div>
          )}

          <div>
            <h4 className="text-base font-extrabold text-white flex items-center gap-3">
              {stageTitle}
              <span className="text-xs font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-sm">
                {progressPct}%
              </span>
            </h4>
            <p className="text-xs text-slate-400 font-medium pt-0.5">{stageDetail}</p>
          </div>
        </div>

        {/* Live Badges & Stop Action */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-indigo-300 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Elapsed: {formatElapsedSec(elapsedMs)}</span>
          </span>

          <span className="px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-emerald-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>{deviceInfo}</span>
          </span>

          <button
            onClick={handleReset}
            className="px-3.5 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-extrabold shadow-md transition-all cursor-pointer"
            title="Stop processing and clear overlay"
          >
            Stop &amp; Clear
          </button>

          {currentStage === 'FAILED' && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>Retry Pipeline</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {currentStage !== 'FAILED' && (
        <div className="space-y-1.5">
          <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700 p-0.5">
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500 ease-out shadow-lg"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Real-time Streaming Terminal Console */}
      <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="font-bold text-slate-300">Live SSE Processing Telemetry Stream</span>
          </div>
          <span className="text-[10px] text-slate-500">Real-time Pipeline Events</span>
        </div>

        <div
          ref={logContainerRef}
          className="font-mono text-xs max-h-32 overflow-y-auto space-y-1 text-slate-300 leading-relaxed pt-1"
        >
          {logs.length === 0 ? (
            <p className="text-slate-500 italic flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              Waiting for live pipeline events...
            </p>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-slate-500 text-[10px] select-none">[{log.timestamp}]</span>
                <span className="text-indigo-400 font-bold text-[11px]">&gt;</span>
                <span className="text-slate-200">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
