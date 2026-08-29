"use client";

import React, { useState, useEffect } from 'react';
import { SubtitleCue, SubtitleStyle, FontOption } from '@/types/studio.types';
import {
  Palette,
  ChevronDown,
  Edit3,
  Sparkles,
  Zap,
  MoreHorizontal,
  Bold,
  Italic,
  Type,
  Check,
  Flame,
  Square,
  RotateCcw,
  Ban,
} from 'lucide-react';
import { api } from '@/lib/api';

interface CanvasFloatingToolbarProps {
  videoId: string;
  currentCue: SubtitleCue | null;
  style: SubtitleStyle | null;
  onStyleUpdated: () => void;
  onCueUpdated?: () => void;
  onTriggerEdit?: () => void;
}

export function CanvasFloatingToolbar({
  videoId,
  currentCue,
  style,
  onStyleUpdated,
  onCueUpdated,
  onTriggerEdit,
}: CanvasFloatingToolbarProps) {
  const [fonts, setFonts] = useState<FontOption[]>([]);
  const [showStylePresets, setShowStylePresets] = useState(false);
  const [showAnimationPresets, setShowAnimationPresets] = useState(false);
  const [showBorderMenu, setShowBorderMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isUpdatingWords, setIsUpdatingWords] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        const res = await api.get('/fonts');
        setFonts(res.data);
      } catch (err) {
        console.error('Failed to load fonts:', err);
      }
    }
    loadFonts();
  }, []);

  if (!style) return null;

  const updateStyle = async (patch: Partial<SubtitleStyle>) => {
    try {
      await api.patch(`/subtitles/${videoId}/style`, patch);
      onStyleUpdated();
    } catch (err) {
      console.error('Failed to update style:', err);
    }
  };

  const handleWordsPerCueChange = async (wordsPerCue: number) => {
    setIsUpdatingWords(true);
    try {
      await api.post(`/subtitles/${videoId}/cues/regenerate`, { wordsPerCue });
      await api.patch(`/subtitles/${videoId}/style`, { wordsPerCue });
      onStyleUpdated();
      if (onCueUpdated) onCueUpdated();
    } catch (err) {
      console.error('Failed to regenerate word-by-word cues:', err);
    } finally {
      setIsUpdatingWords(false);
    }
  };

  const updateCueColor = async (colorHex: string | null) => {
    if (!currentCue) return;
    try {
      await api.patch(`/subtitles/${videoId}/cues/${currentCue.id}`, { colorHex });
      if (onCueUpdated) onCueUpdated();
    } catch (err) {
      console.error('Failed to update cue color:', err);
    }
  };

  const handleResetToDefaults = () => {
    updateStyle({
      fontColorHex: '#FFFFFF',
      outlineWidthPx: 0,
      outlineColorHex: '#000000',
      backgroundBoxOn: false,
      backgroundColorHex: '#000000',
      backgroundOpacity: 0.5,
      bold: false,
      italic: false,
      uppercase: false,
      fontSizePx: 42,
      positionX: 50,
      positionY: 80,
      rotationDeg: 0,
      animation: 'pop',
      wordsPerCue: 6,
    });
    setShowMoreMenu(false);
    setShowStylePresets(false);
    setShowBorderMenu(false);
  };

  const activeColor = currentCue?.colorHex || style.fontColorHex || '#FFFFFF';

  const applyStylePreset = (preset: 'minimal' | 'karaoke' | 'outline' | 'box' | 'neon') => {
    if (preset === 'minimal') {
      updateStyle({
        fontColorHex: '#FFFFFF',
        outlineWidthPx: 0,
        backgroundBoxOn: false,
        bold: false,
        italic: false,
      });
    } else if (preset === 'karaoke') {
      updateStyle({
        fontColorHex: '#FFE600',
        outlineColorHex: '#000000',
        outlineWidthPx: 3,
        backgroundBoxOn: false,
        bold: true,
      });
    } else if (preset === 'outline') {
      updateStyle({
        fontColorHex: '#FFFFFF',
        outlineColorHex: '#000000',
        outlineWidthPx: 4,
        backgroundBoxOn: false,
        bold: true,
      });
    } else if (preset === 'box') {
      updateStyle({
        fontColorHex: '#FFFFFF',
        backgroundBoxOn: true,
        backgroundColorHex: '#000000',
        backgroundOpacity: 0.75,
        outlineWidthPx: 0,
      });
    } else if (preset === 'neon') {
      updateStyle({
        fontColorHex: '#00E5FF',
        outlineColorHex: '#0055FF',
        outlineWidthPx: 3,
        backgroundBoxOn: false,
        bold: true,
        italic: true,
      });
    }
    setShowStylePresets(false);
  };

  const applyAnimation = (anim: string) => {
    updateStyle({ animation: anim });
    setShowAnimationPresets(false);
  };

  return (
    <div className="relative z-40 my-4 flex flex-col items-center">
      {/* Sleek Floating Horizontal Bar */}
      <div className="flex items-center gap-1.5 p-2 rounded-2xl bg-zinc-900/95 border border-zinc-700/80 shadow-2xl backdrop-blur-xl text-white">
        {/* Text Color Picker */}
        <div className="relative group px-2 py-1 flex items-center gap-1 hover:bg-zinc-800 rounded-xl cursor-pointer">
          <input
            type="color"
            value={activeColor}
            onChange={(e) => {
              if (currentCue) updateCueColor(e.target.value);
              else updateStyle({ fontColorHex: e.target.value });
            }}
            className="w-6 h-6 rounded-full border-2 border-white/60 cursor-pointer bg-transparent p-0"
            title="Text Color"
          />
        </div>

        <div className="w-px h-6 bg-zinc-800 mx-1" />

        {/* Words / Cue Slider (1 to 15 Words) */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-zinc-800 border border-zinc-700/60 text-xs">
          <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[11px] font-bold text-amber-300 w-16 text-center whitespace-nowrap">
            {style.wordsPerCue || 6} {style.wordsPerCue === 1 ? 'Word' : 'Words'}
          </span>
          <input
            type="range"
            min={1}
            max={15}
            value={style.wordsPerCue || 6}
            onChange={(e) => handleWordsPerCueChange(parseInt(e.target.value))}
            disabled={isUpdatingWords}
            className="w-20 accent-amber-400 cursor-pointer"
            title="Slide to change words per cue (1 to 15)"
          />
        </div>

        <div className="w-px h-6 bg-zinc-800 mx-1" />

        {/* Font Family Dropdown */}
        <div className="relative">
          <select
            value={style.fontFileName}
            onChange={(e) => updateStyle({ fontFileName: e.target.value })}
            className="appearance-none bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold px-3 py-2 pr-7 rounded-xl cursor-pointer border border-zinc-700/60 focus:outline-none max-w-[150px] truncate"
          >
            {fonts.map((f) => (
              <option key={f.fileName} value={f.fileName}>
                {f.displayName}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Font Size Input */}
        <div className="relative flex items-center bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded-xl border border-zinc-700/60">
          <input
            type="number"
            min={10}
            max={200}
            value={style.fontSizePx || 42}
            onChange={(e) => {
              const val = parseInt(e.target.value) || 42;
              const clamped = Math.min(200, Math.max(10, val));
              updateStyle({ fontSizePx: clamped });
            }}
            className="w-10 bg-transparent text-white text-xs font-bold text-center focus:outline-none font-mono"
          />
          <span className="text-[10px] text-zinc-400 mr-1">px</span>
        </div>

        <div className="w-px h-6 bg-zinc-800 mx-1" />

        {/* Border / Outline Stroke Menu */}
        <div className="relative">
          <button
            onClick={() => {
              setShowBorderMenu(!showBorderMenu);
              setShowStylePresets(false);
              setShowAnimationPresets(false);
              setShowMoreMenu(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              showBorderMenu ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-zinc-800 text-zinc-200'
            }`}
          >
            <Square className="w-3.5 h-3.5 text-cyan-400" />
            <span>Border</span>
          </button>

          {/* Border Popover */}
          {showBorderMenu && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-64 p-3 bg-zinc-900 border border-zinc-700/90 rounded-2xl shadow-2xl z-50 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Text Border / Stroke
                </span>
                <button
                  onClick={() => updateStyle({ outlineWidthPx: 0 })}
                  className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold flex items-center gap-1 hover:bg-red-500/30"
                >
                  <Ban className="w-3 h-3" /> No Border
                </button>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-zinc-300 text-[11px]">
                  <span>Stroke Width</span>
                  <span className="font-mono font-bold text-cyan-400">{style.outlineWidthPx || 0}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={style.outlineWidthPx || 0}
                  onChange={(e) => updateStyle({ outlineWidthPx: parseInt(e.target.value) || 0 })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Stroke Alignment Position (Outside / Inside / Center) */}
              <div className="space-y-1.5 pt-1 border-t border-zinc-800">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Stroke Position
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { id: 'outside', label: 'Outside' },
                    { id: 'inside', label: 'Inside' },
                    { id: 'center', label: 'Center' },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => updateStyle({ strokePosition: pos.id })}
                      className={`py-1 text-[10px] font-bold rounded-lg transition-all ${
                        (style.strokePosition || 'outside') === pos.id
                          ? 'bg-cyan-500 text-black shadow-md'
                          : 'bg-zinc-800 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                <span className="text-zinc-300 text-[11px]">Stroke Color</span>
                <input
                  type="color"
                  value={style.outlineColorHex || '#000000'}
                  onChange={(e) => updateStyle({ outlineColorHex: e.target.value })}
                  className="w-6 h-6 rounded-full border border-white/40 cursor-pointer bg-transparent p-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Styles Modal Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowStylePresets(!showStylePresets);
              setShowAnimationPresets(false);
              setShowBorderMenu(false);
              setShowMoreMenu(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              showStylePresets ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-zinc-800 text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Styles</span>
          </button>

          {/* Styles Preset Popover */}
          {showStylePresets && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-64 p-3 bg-zinc-900 border border-zinc-700/90 rounded-2xl shadow-2xl z-50 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Preset Styles
              </span>
              <button
                onClick={() => applyStylePreset('minimal')}
                className="w-full text-left p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-between text-white"
              >
                <span>Clean Minimalist</span>
                <span className="text-[10px] text-zinc-400">No Border</span>
              </button>
              <button
                onClick={() => applyStylePreset('karaoke')}
                className="w-full text-left p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-between text-amber-400 font-bold"
              >
                <span>Yellow Karaoke Pop</span>
                <span className="text-[10px] text-amber-400">Highlight</span>
              </button>
              <button
                onClick={() => applyStylePreset('outline')}
                className="w-full text-left p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-between text-white font-extrabold uppercase"
              >
                <span>Bold Outline</span>
                <span className="text-[10px] text-zinc-400">Heavy Stroke</span>
              </button>
              <button
                onClick={() => applyStylePreset('box')}
                className="w-full text-left p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-between text-white"
              >
                <span>Dark Boxed Subtitle</span>
                <span className="text-[10px] text-zinc-400">Box Overlay</span>
              </button>
              <button
                onClick={() => applyStylePreset('neon')}
                className="w-full text-left p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-between text-cyan-400 font-bold italic"
              >
                <span>Cyan Neon Glow</span>
                <span className="text-[10px] text-cyan-400">Vibrant</span>
              </button>
            </div>
          )}
        </div>

        {/* Animation Button */}
        <div className="relative">
          <button
            onClick={() => {
              setShowAnimationPresets(!showAnimationPresets);
              setShowStylePresets(false);
              setShowBorderMenu(false);
              setShowMoreMenu(false);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              showAnimationPresets ? 'bg-indigo-600 text-white shadow-lg' : 'hover:bg-zinc-800 text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span>Animation</span>
          </button>

          {/* Animation Popover */}
          {showAnimationPresets && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-56 p-3 bg-zinc-900 border border-zinc-700/90 rounded-2xl shadow-2xl z-50 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Text Animations
              </span>
              {[
                { id: 'pop', label: 'Pop In (Default)' },
                { id: 'fade', label: 'Smooth Fade In' },
                { id: 'slide', label: 'Slide Up' },
                { id: 'typewriter', label: 'Typewriter' },
                { id: 'word-reveal', label: 'Word By Word' },
              ].map((anim) => (
                <button
                  key={anim.id}
                  onClick={() => applyAnimation(anim.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between ${
                    (style.animation || 'pop') === anim.id
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <span>{anim.label}</span>
                  {(style.animation || 'pop') === anim.id && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* More Options Button (...) */}
        <div className="relative">
          <button
            onClick={() => {
              setShowMoreMenu(!showMoreMenu);
              setShowStylePresets(false);
              setShowAnimationPresets(false);
              setShowBorderMenu(false);
            }}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-300 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* More Menu Popover */}
          {showMoreMenu && (
            <div className="absolute top-12 right-0 w-52 p-3 bg-zinc-900 border border-zinc-700/90 rounded-2xl shadow-2xl z-50 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => updateStyle({ bold: !style.bold })}
                  className={`p-2 rounded-lg border flex items-center justify-center ${
                    style.bold ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => updateStyle({ italic: !style.italic })}
                  className={`p-2 rounded-lg border flex items-center justify-center ${
                    style.italic ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => updateStyle({ uppercase: !style.uppercase })}
                  className={`p-2 rounded-lg border flex items-center justify-center ${
                    style.uppercase ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="pt-2 border-t border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-zinc-300">
                  <span>Background Box</span>
                  <input
                    type="checkbox"
                    checked={style.backgroundBoxOn || false}
                    onChange={(e) => updateStyle({ backgroundBoxOn: e.target.checked })}
                    className="accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* 1-Click Reset to Default Button */}
              <div className="pt-2 border-t border-zinc-800">
                <button
                  onClick={handleResetToDefaults}
                  className="w-full p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reset All to Defaults</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
