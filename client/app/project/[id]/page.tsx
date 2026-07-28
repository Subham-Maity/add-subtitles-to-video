"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Subtitles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  Trash2,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { api, getApiUrl } from '@/lib/api';
import { VideoProject, SubtitleCue } from '@/types/studio.types';
import { VideoPreviewPlayer } from './_components/video-preview-player';
import { CanvasFloatingToolbar } from './_components/canvas-floating-toolbar';
import { TranscriptEditorPanel } from './_components/transcript-editor-panel';
import { ExportPanel } from './_components/export-panel';
import { PipelineProgressBanner } from './_components/pipeline-progress-banner';

export default function StudioProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [project, setProject] = useState<VideoProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [activeCueOverride, setActiveCueOverride] = useState<SubtitleCue | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const fetchProjectDetail = async () => {
    try {
      const res = await api.get(`/videos/${id}`);
      setProject(res.data);
    } catch (err) {
      console.error('Failed to fetch project detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProjectDetail();
  }, [id]);

  const handleSeek = (ms: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = ms / 1000;
      setCurrentTimeMs(ms);
    }
  };

  const handleRetry = async () => {
    try {
      setProject((prev) => (prev ? { ...prev, status: 'TRANSCRIBING', errorMessage: null } : null));
      await api.post(`/videos/${id}/retry`);
    } catch (err) {
      console.error('Failed to retry pipeline:', err);
    }
  };

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/videos/${id}`);
      router.push('/');
    } catch (err) {
      console.error('Failed to delete project:', err);
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        <span className="font-semibold text-slate-700">Loading Interactive Canvas Studio...</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-6 space-y-4">
        <p className="text-slate-500">Project not found.</p>
        <Link href="/" className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-bold text-white shadow-md">
          Back to Projects
        </Link>
      </div>
    );
  }

  const activePlaybackCue =
    project.cues?.find((c) => currentTimeMs >= c.startMs && currentTimeMs <= c.endMs) ||
    project.cues?.[0] ||
    null;

  const currentDisplayCue = activeCueOverride || activePlaybackCue;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Studio Header Bar */}
      <header className="px-6 py-3 border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Subtitles className="w-4 h-4 text-indigo-600" />
              {project.originalFilename}
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">
              {project.width}x{project.height} &bull; {project.fps} FPS &bull; {(project.durationMs / 1000).toFixed(1)}s &bull; Canva Canvas Studio
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" /> Add Video
          </Link>

          <button
            onClick={() => setShowExportModal(!showExportModal)}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Video
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </button>

          {(project.status === 'FAILED' || (!project.cues?.length && project.status === 'TRANSCRIBED')) && (
            <button
              onClick={handleRetry}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry Pipeline
            </button>
          )}

          {project.status === 'TRANSCRIBED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Transcribed
            </span>
          )}
          {project.status === 'FAILED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
              <AlertCircle className="w-3.5 h-3.5" /> {project.errorMessage || 'Failed'}
            </span>
          )}
          {project.status !== 'TRANSCRIBED' && project.status !== 'FAILED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {project.status}...
            </span>
          )}
        </div>
      </header>

      {/* Delete Project Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 border border-red-200 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-bold text-slate-900">Delete Video Project?</h4>
            </div>
            <p className="text-xs text-slate-600">
              This will permanently remove <strong className="text-slate-900">{project.originalFilename}</strong> and all its transcribed cues, custom styles, and export files.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-md"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full relative">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center shadow-xl z-10 hover:bg-slate-100"
            >
              ✕
            </button>
            <ExportPanel videoId={project.id} />
          </div>
        </div>
      )}

      {/* Center Studio Workspace: Visual Interactive Canvas & Floating Bar */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 flex flex-col items-center justify-center space-y-2">
        {/* CapCut/Canva Interactive Video Canvas */}
        <div className="w-full flex justify-center">
          <VideoPreviewPlayer
            videoId={project.id}
            cues={project.cues || []}
            style={project.style || null}
            currentTimeMs={currentTimeMs}
            onTimeUpdate={setCurrentTimeMs}
            videoRef={videoRef}
            width={project.width}
            height={project.height}
            onStyleUpdated={fetchProjectDetail}
            onCueUpdated={fetchProjectDetail}
            activeCueOverride={activeCueOverride}
            words={project.words || []}
          />
        </div>

        {/* Floating CapCut/Canva Action Toolbar */}
        <CanvasFloatingToolbar
          videoId={project.id}
          currentCue={currentDisplayCue}
          style={project.style || null}
          onStyleUpdated={fetchProjectDetail}
          onCueUpdated={fetchProjectDetail}
          onTriggerEdit={() => {
            if (activePlaybackCue) setActiveCueOverride(activePlaybackCue);
          }}
        />

        {/* Real-time SSE Pipeline Progress Banner */}
        <div className="w-full max-w-5xl">
          <PipelineProgressBanner
            videoId={project.id}
            status={project.status}
            errorMessage={project.errorMessage}
            onCompleted={fetchProjectDetail}
          />
        </div>

        {/* Bottom Transcript Cues Drawer */}
        <div className="w-full max-w-5xl pt-2">
          <TranscriptEditorPanel
            videoId={project.id}
            cues={project.cues || []}
            currentTimeMs={currentTimeMs}
            onSeek={(ms) => {
              handleSeek(ms);
              setActiveCueOverride(null);
            }}
            onCuesUpdated={fetchProjectDetail}
            wordsPerCue={project.style?.wordsPerCue || 6}
          />
        </div>
      </main>

      <footer className="text-center text-xs text-slate-400 py-3 border-t border-slate-200 font-medium">
        Canva Interactive Subtitle Studio &bull; Next.js & NestJS Backend
      </footer>
    </div>
  );
}
