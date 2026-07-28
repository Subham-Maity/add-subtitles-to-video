"use client";

import React, { useEffect, useState } from 'react';
import { Type, FolderPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { FontOption } from '@/types/studio.types';

interface FontSelectProps {
  value: string;
  onChange: (fileName: string) => void;
}

export function FontSelect({ value, onChange }: FontSelectProps) {
  const [fonts, setFonts] = useState<FontOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFonts() {
      try {
        const res = await api.get('/fonts');
        setFonts(res.data || []);
      } catch (err) {
        console.error('Failed to load fonts:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFonts();
  }, []);

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5 text-indigo-400" /> Font Family
        </span>
        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
          <FolderPlus className="w-3 h-3" /> Drop .ttf into public/lang/
        </span>
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full bg-zinc-900/80 border border-zinc-700/60 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
      >
        <option value="Inter-Bold.ttf">Inter Bold (Default System)</option>
        {fonts.map((f) => (
          <option key={f.fileName} value={f.fileName}>
            {f.displayName} ({f.fileName})
          </option>
        ))}
      </select>
    </div>
  );
}
