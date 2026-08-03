"use client";

import React, { useState } from 'react';
import { SubtitleCue } from '@/types/studio.types';
import { Play, Edit3, AlertTriangle, RefreshCw, Check, Plus, Trash2, Palette, Loader2, Globe, Languages } from 'lucide-react';
import { api } from '@/lib/api';

interface TranscriptEditorPanelProps {
  videoId: string;
  cues: SubtitleCue[];
  currentTimeMs: number;
  onSeek: (ms: number) => void;
  onCuesUpdated: () => void;
  onPipelineStarted?: () => void;
  wordsPerCue: number;
}

const LANGUAGE_OPTIONS = [
  { code: 'en', name: '🇬🇧 Translate Audio to English (Hindi/Any -> English Subtitles - en)' },
  { code: 'hi-strict', name: '🇮🇳 Strict Hindi (100% Devanagari - hi-strict)' },
  { code: 'hi', name: '🇮🇳 Standard Hindi (Devanagari - hi)' },
  { code: 'hi-roman', name: '🔤 Hinglish (Roman Script - hi-roman)' },
  { code: 'auto', name: '🌐 Auto-detect Original Language' },
  { code: 'ur', name: '🇵🇰 Urdu (ur)' },
  { code: 'es', name: '🇪🇸 Spanish (es)' },
  { code: 'fr', name: '🇫🇷 French (fr)' },
];

export function TranscriptEditorPanel({
  videoId,
  cues,
  currentTimeMs,
  onSeek,
  onCuesUpdated,
  onPipelineStarted,
  wordsPerCue,
}: TranscriptEditorPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isRetranscribing, setIsRetranscribing] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('hi');
  const [isAdding, setIsAdding] = useState(false);
  const [newCueText, setNewCueText] = useState('');

  const hasEditedCues = cues.some((c) => c.edited);

  const handleStartEdit = (cue: SubtitleCue) => {
    setEditingId(cue.id);
    setEditText(cue.text);
  };

  const handleSaveEdit = async (cueId: string, extraData?: { colorHex?: string | null }) => {
    try {
      await api.patch(`/videos/${videoId}/cues/${cueId}`, {
        text: editText,
        ...extraData,
      });
      setEditingId(null);
      onCuesUpdated();
    } catch (err) {
      console.error('Failed to save cue edit:', err);
    }
  };

  const handleColorChange = async (cue: SubtitleCue, colorHex: string | null) => {
    try {
      await api.patch(`/videos/${videoId}/cues/${cue.id}`, { colorHex });
      onCuesUpdated();
    } catch (err) {
      console.error('Failed to update cue color:', err);
    }
  };

  const handleDeleteCue = async (cueId: string) => {
    try {
      await api.delete(`/videos/${videoId}/cues/${cueId}`);
      onCuesUpdated();
    } catch (err) {
      console.error('Failed to delete cue:', err);
    }
  };

  const handleAddCue = async () => {
    if (!newCueText.trim()) return;
    try {
      const lastCue = cues[cues.length - 1];
      const startMs = lastCue ? lastCue.endMs + 100 : 0;
      const endMs = startMs + 2000;
      await api.post(`/videos/${videoId}/cues`, {
        text: newCueText.trim(),
        startMs,
        endMs,
      });
      setNewCueText('');
      setIsAdding(false);
      onCuesUpdated();
    } catch (err) {
      console.error('Failed to add cue:', err);
    }
  };

  const handleRegenerateClick = () => {
    if (hasEditedCues) {
      setShowWarningModal(true);
    } else {
      executeRegenerate();
    }
  };

  const executeRegenerate = async () => {
    setIsRegenerating(true);
    setShowWarningModal(false);
    try {
      await api.post(`/videos/${videoId}/cues/regenerate`, { wordsPerCue });
      onCuesUpdated();
    } catch (err) {
      console.error('Failed to regenerate cues:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleRetranscribeWithLanguage = async () => {
    setIsRetranscribing(true);
    if (onPipelineStarted) onPipelineStarted();
    try {
      await api.post(`/videos/${videoId}/retranscribe`, { language: selectedLanguage });
      onCuesUpdated();
    } catch (err) {
      console.error('Failed to retranscribe video:', err);
    } finally {
      setIsRetranscribing(false);
    }
  };

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const decimal = Math.floor((ms % 1000) / 100);
    return `${m}:${s.toString().padStart(2, '0')}.${decimal}`;
  };

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col h-[620px] relative">
      {/* Top Controls Header */}
      <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-indigo-600" /> Transcript Cues ({cues.length})
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Click a cue to seek video or double click to edit text
          </p>
        </div>

        {/* Action Controls & Language Selector */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1">
            <Languages className="w-3.5 h-3.5 text-indigo-600" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 border-none outline-none cursor-pointer pr-1"
              title="Select target speech language to prevent misdetection (e.g. Hindi vs Urdu)"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>

          {/* Re-transcribe with Language Button */}
          <button
            onClick={handleRetranscribeWithLanguage}
            disabled={isRetranscribing}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Re-run AI transcription with forced language (Fixes Urdu/Russian misdetection)"
          >
            {isRetranscribing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Globe className="w-3.5 h-3.5" />
            )}
            <span>Re-transcribe</span>
          </button>

          {/* Add Cue Button */}
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Cue</span>
          </button>

          {/* Regenerate Cues Button */}
          <button
            onClick={handleRegenerateClick}
            disabled={isRegenerating}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
          >
            {isRegenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      {/* Add New Cue Drawer Bar */}
      {isAdding && (
        <div className="my-3 p-3 rounded-xl bg-indigo-50/50 border border-indigo-200 flex items-center gap-2 animate-fadeIn">
          <input
            type="text"
            value={newCueText}
            onChange={(e) => setNewCueText(e.target.value)}
            placeholder="Type new cue text..."
            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900 outline-none focus:border-indigo-500"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCue()}
          />
          <button
            onClick={handleAddCue}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
          >
            Save Cue
          </button>
        </div>
      )}

      {/* Cues List Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1">
        {cues.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <p className="text-xs font-semibold">No transcript cues found yet.</p>
            <p className="text-[11px] text-slate-400">
              Select <strong>Hindi</strong> or <strong>Auto-detect</strong> above and click <strong>Re-transcribe</strong>.
            </p>
          </div>
        ) : (
          cues.map((cue) => {
            const isActive = currentTimeMs >= cue.startMs && currentTimeMs <= cue.endMs;
            const isEditing = editingId === cue.id;

            return (
              <div
                key={cue.id}
                onDoubleClick={() => handleStartEdit(cue)}
                className={`p-3.5 rounded-2xl border transition-all ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50/40 shadow-sm ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                  <button
                    onClick={() => onSeek(cue.startMs)}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-indigo-100 hover:text-indigo-700 transition-colors text-[11px] font-mono"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>
                      {formatMs(cue.startMs)} &rarr; {formatMs(cue.endMs)}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Highlight Color Picker */}
                    <input
                      type="color"
                      value={cue.colorHex || '#FFFFFF'}
                      onChange={(e) => handleColorChange(cue, e.target.value)}
                      className="w-5 h-5 rounded border-none cursor-pointer"
                      title="Set custom highlight color for this cue"
                    />

                    <button
                      onClick={() => handleDeleteCue(cue.id)}
                      className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                      title="Delete Cue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 p-2 rounded-xl border border-indigo-400 bg-white text-xs font-semibold text-slate-900 outline-none resize-none"
                      rows={2}
                    />
                    <button
                      onClick={() => handleSaveEdit(cue.id)}
                      className="p-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <p
                    className="text-xs font-bold text-slate-800 leading-relaxed cursor-pointer"
                    style={{ color: cue.colorHex || undefined }}
                  >
                    {cue.text}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Warning Modal for edited cues */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
              <h4 className="text-base font-extrabold text-slate-900">Overwrite Manual Edits?</h4>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              You have manual edits in your cues. Regenerating will reset cue text to the original AI transcript words.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={executeRegenerate}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md"
              >
                Confirm Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
