"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Film, Loader2, Sparkles, Plus } from 'lucide-react';
import { api } from '@/lib/api';

export function UploadDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file (.mp4, .mov, .mkv, .webm)');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const video = response.data;
      router.push(`/project/${video.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload video. Please try again.');
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-3xl p-12 md:p-16 text-center cursor-pointer transition-all duration-300 bg-white border-2 ${
          isDragging
            ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01] shadow-2xl ring-4 ring-indigo-500/20'
            : 'border-slate-200 hover:border-indigo-500 shadow-xl hover:shadow-2xl'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleUpload(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Big Icon Circle */}
          <div className="w-24 h-24 rounded-3xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-indigo-600 shadow-lg shadow-indigo-500/10 group-hover:scale-110 transition-transform">
            {isUploading ? (
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
            ) : (
              <Upload className="w-12 h-12 text-indigo-600" />
            )}
          </div>

          <div className="space-y-2 max-w-lg">
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
              {isUploading ? 'Uploading & Preparing Video...' : 'Drag & Drop Video Here'}
              {!isUploading && <Sparkles className="w-6 h-6 text-amber-500" />}
            </h3>
            <p className="text-sm md:text-base text-slate-500 font-medium">
              Upload any MP4, MOV, or WEBM video to automatically generate & style AI captions
            </p>
          </div>

          {/* HUGE Prominent Upload Button */}
          {!isUploading && (
            <button
              type="button"
              className="mt-4 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-lg shadow-xl shadow-indigo-600/30 flex items-center gap-3 transition-all cursor-pointer"
            >
              <Plus className="w-6 h-6 stroke-[3]" />
              <span>Select Video File</span>
            </button>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-500 pt-2">
            <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200">MP4, MOV, WEBM</span>
            <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200">Whisper AI Large-v3</span>
            <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200">Word Timestamps</span>
          </div>

          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
