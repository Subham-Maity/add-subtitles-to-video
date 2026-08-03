"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, Sparkles, Plus, Languages, Check, X, FileVideo } from 'lucide-react';
import { api } from '@/lib/api';

const LANGUAGE_OPTIONS = [
  { code: 'en', name: '🇬🇧 Translate Audio to English (en)', desc: 'Translates Hindi or any spoken language into English subtitles' },
  { code: 'hi-strict', name: '🇮🇳 Strict Hindi (100% Devanagari - hi-strict)', desc: 'Transliterates all words (even English ones) to 100% Devanagari' },
  { code: 'hi', name: '🇮🇳 Standard Hindi (Devanagari - hi)', desc: 'Guarantees Devanagari (हिंदी) script for Hindi' },
  { code: 'hi-roman', name: '🔤 Hinglish (Roman Script - hi-roman)', desc: 'Latin script for Hindi, e.g., Namaste dosto' },
  { code: 'auto', name: '🌐 Auto-detect Language', desc: 'Automatic language identification' },
  { code: 'ur', name: '🇵🇰 Urdu (ur)', desc: 'Urdu script' },
  { code: 'es', name: '🇪🇸 Spanish (es)', desc: 'Spanish language' },
  { code: 'fr', name: '🇫🇷 French (fr)', desc: 'French language' },
];

export function UploadDropzone() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFilePicked = (file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file (.mp4, .mov, .mkv, .webm)');
      return;
    }
    setError(null);
    setStagedFile(file);
  };

  const handleConfirmUpload = async () => {
    if (!stagedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', stagedFile);
      formData.append('language', selectedLanguage);

      const response = await api.post('/videos/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const video = response.data;
      setStagedFile(null);
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
      handleFilePicked(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-6 relative">
      {/* Upload Dropzone Area */}
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
              handleFilePicked(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="w-24 h-24 rounded-3xl bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center text-indigo-600 shadow-lg shadow-indigo-500/10 group-hover:scale-110 transition-transform">
            {isUploading ? (
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
            ) : (
              <Upload className="w-12 h-12 text-indigo-600" />
            )}
          </div>

          <div className="space-y-2 max-w-lg">
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center justify-center gap-2">
              {isUploading ? 'Uploading Video & Extracting Subtitles...' : 'Drag & Drop Video Here'}
              {!isUploading && <Sparkles className="w-6 h-6 text-amber-500" />}
            </h3>
            <p className="text-sm md:text-base text-slate-500 font-medium">
              Upload any MP4, MOV, or WEBM video to automatically generate &amp; style AI captions
            </p>
          </div>

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

      {/* Target Speech Language Selection Modal */}
      {stagedFile && !isUploading && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-slate-200 space-y-6 relative">
            <button
              onClick={() => setStagedFile(null)}
              className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                <Languages className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Select Target Speech Language</h3>
                <p className="text-xs text-slate-500 font-medium">Declare the language spoken in your video before processing</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
              <FileVideo className="w-6 h-6 text-indigo-600 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">{stagedFile.name}</div>
                <div className="text-[11px] text-slate-500">{(stagedFile.size / (1024 * 1024)).toFixed(2)} MB</div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                Target Language
              </label>
              <div className="grid grid-cols-1 gap-2">
                {LANGUAGE_OPTIONS.map((lang) => {
                  const isSelected = selectedLanguage === lang.code;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => setSelectedLanguage(lang.code)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-bold ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{lang.name}</div>
                        <div className="text-[10px] text-slate-500 font-normal">{lang.desc}</div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStagedFile(null)}
                className="flex-1 py-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={isUploading}
                className="flex-1 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300" />}
                <span>Start AI Transcription</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
