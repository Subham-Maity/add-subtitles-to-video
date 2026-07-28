"use client";

import React, { useState } from 'react';
import { SubtitleCue } from '@/types/studio.types';
import { Play, Edit3, AlertTriangle, RefreshCw, Check, Plus, Trash2, Palette, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface TranscriptEditorPanelProps {
  videoId: string;
  cues: SubtitleCue[];
  currentTimeMs: number;
  onSeek: (ms: number) => void;
  onCuesUpdated: () => void;
  wordsPerCue: number;
}

export function TranscriptEditorPanel({
  videoId,
  cues,
  currentTimeMs,
  onSeek,
  onCuesUpdated,
  wordsPerCue,
}: TranscriptEditorPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
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

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const decimal = Math.floor((ms % 1000) / 100);
    return `${m}:${s.toString().padStart(2, '0')}.${decimal}`;
  };

  return (
    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex flex-col h-[560px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-indigo-600" />
            Transcript Cues ({cues.length})
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">Click a cue to seek video or double click to edit text</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-xs font-bold text-indigo-600 border border-indigo-200 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Cue</span>
          </button>
          <button
            onClick={handleRegenerateClick}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-200 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate</span>
          </button>
        </div>
      </div>

      {/* Loading Bar when Regenerating Cues */}
      {isRegenerating && (
        <div className="py-3 px-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 my-2 animate-pulse">
          <div className="flex items-center justify-between text-xs text-indigo-700 font-bold">
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              Regenerating cues from whisper timestamps...
            </span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full w-full animate-subtle-pulse" />
          </div>
        </div>
      )}

      {/* Add New Cue Form Modal/Inline */}
      {isAdding && (
        <div className="p-3.5 bg-slate-50 border border-indigo-200 rounded-xl space-y-2.5 my-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-900">
            <span>Add New Subtitle Cue</span>
            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">✕</button>
          </div>
          <input
            type="text"
            placeholder="Type cue text..."
            value={newCueText}
            onChange={(e) => setNewCueText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCue()}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-600"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-200 text-xs font-semibold text-slate-700"
            >
              Cancel
            </button>
            <button
              onClick={handleAddCue}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-sm"
            >
              Save Cue
            </button>
          </div>
        </div>
      )}

      {/* Warning Modal for Discarding Edited Cues */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4 border border-amber-200 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-bold text-slate-900">Overwrite Manual Edits?</h4>
            </div>
            <p className="text-xs text-slate-600">
              You have previously edited subtitle cues. Regenerating cues with words-per-cue will overwrite your custom text edits. Are you sure?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={executeRegenerate}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-sm"
              >
                Yes, Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrollable Cue List */}
      <div className="flex-1 overflow-y-auto pt-3 space-y-2 pr-1">
        {cues.map((cue) => {
          const isActive = currentTimeMs >= cue.startMs && currentTimeMs <= cue.endMs;
          const isEditing = editingId === cue.id;

          return (
            <div
              key={cue.id}
              onClick={() => onSeek(cue.startMs)}
              className={`p-3.5 rounded-xl border text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 border-indigo-500 shadow-md ring-1 ring-indigo-500/20 text-slate-900'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] text-indigo-700 font-bold bg-indigo-100/70 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-1">
                  <Play className="w-2.5 h-2.5 fill-current" />
                  {formatMs(cue.startMs)} &rarr; {formatMs(cue.endMs)}
                </span>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Per-Cue Color Picker */}
                  <div className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    <Palette className="w-3 h-3 text-slate-500" />
                    <input
                      type="color"
                      value={cue.colorHex || '#000000'}
                      onChange={(e) => handleColorChange(cue, e.target.value)}
                      title="Custom text color for this cue"
                      className="w-4 h-4 rounded border-none cursor-pointer bg-transparent"
                    />
                    {cue.colorHex && (
                      <button
                        onClick={() => handleColorChange(cue, null)}
                        title="Reset to default style color"
                        className="text-[9px] text-slate-400 hover:text-slate-600 ml-0.5"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteCue(cue.id)}
                    title="Delete cue"
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isEditing ? (
                <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(cue.id)}
                    className="flex-1 bg-white border border-indigo-500 rounded px-2.5 py-1 text-xs text-slate-900 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(cue.id)}
                    className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <p
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit(cue);
                  }}
                  className="font-medium leading-relaxed hover:text-slate-900"
                  style={{ color: cue.colorHex || undefined }}
                >
                  {cue.text}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
