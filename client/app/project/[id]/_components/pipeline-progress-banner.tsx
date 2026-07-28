"use client";

import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, Cpu, Music } from 'lucide-react';
import { getApiUrl, api } from '@/lib/api';

interface PipelineProgressBannerProps {
  videoId: string;
  status: string;
  errorMessage?: string | null;
  onCompleted: () => void;
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

  useEffect(() => {
    setCurrentStage(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    if (currentStage === 'TRANSCRIBED') return;

    const sseUrl = getApiUrl(`/videos/${videoId}/progress`);
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'stage') {
          setCurrentStage(data.stage);
          if (data.stage === 'TRANSCRIBED') {
            onCompleted();
            eventSource.close();
          }
        } else if (data.type === 'done') {
          setCurrentStage('TRANSCRIBED');
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
    try {
      await api.post(`/videos/${videoId}/retry`);
    } catch (err) {
      console.error('Failed to retry pipeline:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  if (currentStage === 'TRANSCRIBED') return null;

  let progressPct = 25;
  let stageTitle = 'Processing Video...';
  let stageDetail = 'Preparing media pipeline...';
  let Icon = Loader2;

  if (currentStage === 'UPLOADED') {
    progressPct = 15;
    stageTitle = 'Video Uploaded';
    stageDetail = 'Initializing audio extraction...';
    Icon = Music;
  } else if (currentStage === 'EXTRACTING_AUDIO') {
    progressPct = 40;
    stageTitle = 'Extracting Audio Stream';
    stageDetail = 'Extracting 16kHz mono WAV audio with FFmpeg...';
    Icon = Music;
  } else if (currentStage === 'TRANSCRIBING') {
    progressPct = 75;
    stageTitle = 'Faster-Whisper AI Transcription';
    stageDetail = 'Detecting speech & word timestamps with Whisper AI...';
    Icon = Cpu;
  } else if (currentStage === 'FAILED') {
    progressPct = 100;
    stageTitle = 'Transcription Error';
    stageDetail = errorMsg || 'Transcription service failed to process audio.';
    Icon = AlertCircle;
  }

  return (
    <div className="w-full my-4 p-4 rounded-2xl bg-white border border-indigo-200 shadow-md text-slate-900 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {currentStage === 'FAILED' ? (
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Icon className="w-5 h-5 animate-spin" />
            </div>
          )}

          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              {stageTitle}
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {progressPct}%
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">{stageDetail}</p>
          </div>
        </div>

        {currentStage === 'FAILED' && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>Retry Pipeline</span>
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {currentStage !== 'FAILED' && (
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
          <div
            className="bg-indigo-600 h-full transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  );
}
