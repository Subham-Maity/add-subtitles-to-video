"use client";

import React, { useEffect, useState } from 'react';
import { UploadDropzone } from './_components/upload-dropzone';
import { ProjectList } from './_components/project-list';
import { BatchExtractor } from './_components/batch-extractor';
import { api } from '@/lib/api';
import { VideoProject } from '@/types/studio.types';
import { Subtitles, Zap, ShieldCheck, Cpu, Trash2, CheckCircle2, Loader2, SquareX } from 'lucide-react';

export default function HomePage() {
  const [projects, setProjects] = useState<VideoProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isClearingQueue, setIsClearingQueue] = useState(false);
  const [cleanNotice, setCleanNotice] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/videos');
      setProjects(res.data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCleanStorageJunk = async () => {
    if (!confirm('Clean temporary audio extracts, orphan ASS subtitles, and old export render junk?')) {
      return;
    }

    setIsCleaning(true);
    setCleanNotice(null);
    try {
      const res = await api.post('/videos/storage/clean-junk');
      setCleanNotice(res.data.message || `Cleaned ${res.data.freedMb} MB of storage junk!`);
      setTimeout(() => setCleanNotice(null), 6000);
    } catch (err) {
      console.error('Failed to clean storage junk:', err);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleClearAllQueue = async () => {
    if (!confirm('Stop all active Python AI tasks, purge Redis queue, and reset processing status immediately?')) {
      return;
    }

    setIsClearingQueue(true);
    setCleanNotice(null);
    try {
      const res = await api.post('/videos/queue/clear-all');
      setCleanNotice(res.data.message || 'Successfully stopped all AI tasks & purged Redis queue!');
      fetchProjects();
      setTimeout(() => setCleanNotice(null), 6000);
    } catch (err) {
      console.error('Failed to clear queue:', err);
    } finally {
      setIsClearingQueue(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-6 md:p-12 relative overflow-hidden">
      <div className="max-w-5xl mx-auto w-full space-y-8 relative z-10">
        {/* Header */}
        <header className="text-center space-y-3">
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider shadow-sm">
              <Subtitles className="w-4 h-4 text-indigo-600" /> Local AI Subtitle Studio
            </div>

            {/* Stop & Clear Queue Button */}
            <button
              onClick={handleClearAllQueue}
              disabled={isClearingQueue}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-extrabold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              title="Abort active Python AI tasks, clear Redis queues & stop processing immediately"
            >
              {isClearingQueue ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
              ) : (
                <SquareX className="w-3.5 h-3.5 text-rose-600" />
              )}
              <span>{isClearingQueue ? 'Stopping Queue...' : 'Stop & Clear Queue'}</span>
            </button>

            {/* 1-Click Clean Storage Junk Button */}
            <button
              onClick={handleCleanStorageJunk}
              disabled={isCleaning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition-all shadow-sm disabled:opacity-50 cursor-pointer"
              title="Clean temporary audio extracts, orphan subtitles & export render junk"
            >
              {isCleaning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              ) : (
                <Trash2 className="w-3.5 h-3.5 text-slate-600" />
              )}
              <span>{isCleaning ? 'Cleaning Junk...' : 'Clean Storage Junk'}</span>
            </button>
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">
            AI Subtitles for Your Videos
          </h1>
          <p className="text-slate-500 max-w-lg mx-auto text-sm md:text-base font-medium">
            100% Offline & Private &bull; Faster-Whisper Large-v3-Turbo &bull; Canva Studio Editor
          </p>

          {cleanNotice && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold animate-fadeIn shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {cleanNotice}
            </div>
          )}
        </header>

        {/* Single Video Upload Dropzone */}
        <UploadDropzone />

        {/* Feature Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto pt-2 text-center">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Zap className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-slate-900">Faster-Whisper GPU</h4>
              <p className="text-[11px] text-slate-500 font-medium">Local AI Model &bull; Large-v3-Turbo</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-slate-900">100% Offline &amp; Private</h4>
              <p className="text-[11px] text-slate-500 font-medium">No external API leaks &bull; Local SSD</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Cpu className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold text-slate-900">Canva Studio Editor</h4>
              <p className="text-[11px] text-slate-500 font-medium">Auto-captions, ASS styles &amp; exports</p>
            </div>
          </div>
        </div>

        {/* Batch Extractor Component */}
        <BatchExtractor />

        {/* Recent Subtitle Projects List */}
        <ProjectList projects={projects} isLoading={isLoading} onProjectDeleted={fetchProjects} />
      </div>
    </main>
  );
}