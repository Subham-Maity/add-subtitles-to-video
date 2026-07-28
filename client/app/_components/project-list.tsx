"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Film, Clock, CheckCircle2, AlertCircle, Loader2, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { VideoProject } from '@/types/studio.types';
import { api } from '@/lib/api';

interface ProjectListProps {
  projects: VideoProject[];
  isLoading: boolean;
  onProjectDeleted?: () => void;
}

export function ProjectList({ projects, isLoading, onProjectDeleted }: ProjectListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<VideoProject | null>(null);

  const handleDelete = async () => {
    if (!projectToDelete) return;
    setDeletingId(projectToDelete.id);
    try {
      await api.delete(`/videos/${projectToDelete.id}`);
      setProjectToDelete(null);
      if (onProjectDeleted) onProjectDeleted();
    } catch (err) {
      console.error('Failed to delete project:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">Loading subtitle projects...</span>
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return null;
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-10 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Film className="w-5 h-5 text-indigo-600" />
          Recent Subtitle Projects ({projects.length})
        </h2>
      </div>

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 border border-red-200 shadow-2xl">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-bold text-slate-900">Delete Subtitle Project?</h4>
            </div>
            <p className="text-xs text-slate-600">
              Are you sure you want to permanently remove <strong className="text-slate-900">{projectToDelete.originalFilename}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setProjectToDelete(null)}
                disabled={deletingId === projectToDelete.id}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deletingId === projectToDelete.id}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                {deletingId === projectToDelete.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{deletingId === projectToDelete.id ? 'Deleting...' : 'Delete Project'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((p) => {
          const durationSec = Math.round(p.durationMs / 1000);
          const minutes = Math.floor(durationSec / 60);
          const seconds = durationSec % 60;
          const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

          return (
            <div
              key={p.id}
              className="bg-white border border-slate-200 hover:border-indigo-400 p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 overflow-hidden pr-2">
                  <h3 className="text-base font-bold text-slate-900 truncate" title={p.originalFilename}>
                    {p.originalFilename}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {timeFormatted}
                    </span>
                    <span>{p.width}x{p.height} &bull; {p.fps}fps</span>
                  </div>
                </div>

                <div>
                  {p.status === 'TRANSCRIBED' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                    </span>
                  )}
                  {p.status === 'FAILED' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-200">
                      <AlertCircle className="w-3.5 h-3.5" /> Failed
                    </span>
                  )}
                  {p.status !== 'TRANSCRIBED' && p.status !== 'FAILED' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-200">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                    </span>
                  )}
                </div>
              </div>

              {/* Action Bar: Edit Subtitles + Delete Button */}
              <div className="flex items-center gap-2 pt-1">
                <Link
                  href={`/project/${p.id}`}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-indigo-600 text-slate-800 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm group"
                >
                  <Edit3 className="w-4 h-4 text-indigo-600 group-hover:text-white transition-colors" />
                  <span>Edit Subtitles</span>
                </Link>

                <button
                  onClick={() => setProjectToDelete(p)}
                  title="Delete Project"
                  className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
