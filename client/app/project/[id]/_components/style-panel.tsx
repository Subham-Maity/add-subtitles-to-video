"use client";

import React, { useState, useEffect } from 'react';
import { SubtitleStyle } from '@/types/studio.types';
import { FontSelect } from './font-select';
import { Sliders, Palette, AlignVerticalJustifyCenter, Box, Bold, Italic, Type, Sparkles, MoveVertical } from 'lucide-react';
import { api } from '@/lib/api';

interface StylePanelProps {
  videoId: string;
  style: SubtitleStyle | null;
  onStyleUpdated: () => void;
}

export function StylePanel({ videoId, style, onStyleUpdated }: StylePanelProps) {
  const [formData, setFormData] = useState<Partial<SubtitleStyle>>({
    fontFileName: '',
    fontSizePx: 42,
    fontColorHex: '#FFFFFF',
    outlineColorHex: '#000000',
    outlineWidthPx: 2,
    backgroundBoxOn: false,
    backgroundColorHex: '#000000',
    backgroundOpacity: 0.5,
    position: 'bottom',
    verticalOffsetPct: 10,
    wordsPerCue: 6,
    uppercase: false,
    bold: false,
    italic: false,
  });

  useEffect(() => {
    if (style) {
      setFormData(style);
    }
  }, [style]);

  const updateField = async (fields: Partial<SubtitleStyle>) => {
    const updated = { ...formData, ...fields };
    setFormData(updated);

    try {
      await api.patch(`/videos/${videoId}/style`, fields);
      onStyleUpdated();
    } catch (err) {
      console.error('Failed to update style:', err);
    }
  };

  return (
    <div className="glass-panel p-5 rounded-2xl space-y-5 h-[560px] overflow-y-auto">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" /> Subtitle Styling
        </h3>
        <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Live CSS Preview
        </span>
      </div>

      {/* Font Family */}
      <FontSelect
        value={formData.fontFileName || ''}
        onChange={(fontFileName) => updateField({ fontFileName })}
      />

      {/* Font Size (Freeform input + slider) & Words Per Cue */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
            <span>Font Size</span>
            <input
              type="number"
              min={10}
              max={200}
              value={formData.fontSizePx || 42}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 10;
                updateField({ fontSizePx: Math.min(200, Math.max(10, val)) });
              }}
              className="w-14 bg-zinc-900 border border-zinc-700/60 rounded px-1.5 py-0.5 text-xs text-white text-right font-mono"
            />
          </div>
          <input
            type="range"
            min={10}
            max={200}
            value={formData.fontSizePx || 42}
            onChange={(e) => updateField({ fontSizePx: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
            <span>Words / Cue ({formData.wordsPerCue})</span>
          </div>
          <input
            type="range"
            min={1}
            max={15}
            value={formData.wordsPerCue || 6}
            onChange={(e) => updateField({ wordsPerCue: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>

      {/* Colors: Font Color & Outline Color */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-indigo-400" /> Default Text Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={formData.fontColorHex || '#FFFFFF'}
              onChange={(e) => updateField({ fontColorHex: e.target.value })}
              className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={formData.fontColorHex || '#FFFFFF'}
              onChange={(e) => updateField({ fontColorHex: e.target.value })}
              className="flex-1 bg-zinc-900 border border-zinc-700/60 rounded px-2.5 py-1 text-xs text-white uppercase font-mono"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-indigo-400" /> Outline Color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={formData.outlineColorHex || '#000000'}
              onChange={(e) => updateField({ outlineColorHex: e.target.value })}
              className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={formData.outlineColorHex || '#000000'}
              onChange={(e) => updateField({ outlineColorHex: e.target.value })}
              className="flex-1 bg-zinc-900 border border-zinc-700/60 rounded px-2.5 py-1 text-xs text-white uppercase font-mono"
            />
          </div>
        </div>
      </div>

      {/* Outline Width */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
          <span>Outline Width ({formData.outlineWidthPx}px)</span>
        </div>
        <input
          type="range"
          min={0}
          max={8}
          value={formData.outlineWidthPx ?? 2}
          onChange={(e) => updateField({ outlineWidthPx: parseInt(e.target.value) })}
          className="w-full"
        />
      </div>

      {/* Position Toggle & Vertical Offset Slider */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
            <AlignVerticalJustifyCenter className="w-3.5 h-3.5 text-indigo-400" /> Position Alignment
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['top', 'center', 'bottom'].map((pos) => (
              <button
                key={pos}
                onClick={() => updateField({ position: pos })}
                className={`py-1.5 text-xs rounded-lg border font-medium capitalize transition-all ${
                  formData.position === pos
                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
            <span className="flex items-center gap-1.5">
              <MoveVertical className="w-3.5 h-3.5 text-indigo-400" /> Vertical Offset ({formData.verticalOffsetPct ?? 10}%)
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            value={formData.verticalOffsetPct ?? 10}
            onChange={(e) => updateField({ verticalOffsetPct: parseInt(e.target.value) })}
            className="w-full"
          />
        </div>
      </div>

      {/* Background Box Settings */}
      <div className="p-3.5 rounded-xl glass-card space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-indigo-400" /> Background Box
          </label>
          <input
            type="checkbox"
            checked={formData.backgroundBoxOn || false}
            onChange={(e) => updateField({ backgroundBoxOn: e.target.checked })}
            className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
          />
        </div>

        {formData.backgroundBoxOn && (
          <div className="space-y-3 pt-1 border-t border-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-zinc-300">Box Color</span>
              <input
                type="color"
                value={formData.backgroundColorHex || '#000000'}
                onChange={(e) => updateField({ backgroundColorHex: e.target.value })}
                className="w-6 h-6 rounded border-none cursor-pointer bg-transparent"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-300">
                <span>Box Opacity</span>
                <span>{Math.round((formData.backgroundOpacity || 0.5) * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={formData.backgroundOpacity || 0.5}
                onChange={(e) => updateField({ backgroundOpacity: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          </div>
        )}
      </div>

      {/* Text Style Toggles: Bold, Italic, Uppercase */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <button
          onClick={() => updateField({ bold: !formData.bold })}
          className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            formData.bold ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}
        >
          <Bold className="w-3.5 h-3.5" /> Bold
        </button>

        <button
          onClick={() => updateField({ italic: !formData.italic })}
          className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            formData.italic ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}
        >
          <Italic className="w-3.5 h-3.5" /> Italic
        </button>

        <button
          onClick={() => updateField({ uppercase: !formData.uppercase })}
          className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
            formData.uppercase ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
          }`}
        >
          <Type className="w-3.5 h-3.5" /> CAPS
        </button>
      </div>
    </div>
  );
}
