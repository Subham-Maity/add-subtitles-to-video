export type PipelineStatus =
  | 'UPLOADED'
  | 'EXTRACTING_AUDIO'
  | 'TRANSCRIBING'
  | 'TRANSCRIBED'
  | 'FAILED';

export type ExportMode = 'OVERLAY' | 'CAPTIONS_ONLY';
export type ExportFormat = 'MP4_H265' | 'MOV';
export type ExportStatus = 'QUEUED' | 'RENDERING' | 'DONE' | 'FAILED';

export interface SubtitleCue {
  id: string;
  videoProjectId: string;
  text: string;
  startMs: number;
  endMs: number;
  order: number;
  colorHex?: string | null;
  edited: boolean;
}

export interface SubtitleStyle {
  id: string;
  videoProjectId: string;
  fontFileName: string;
  fontSizePx: number;
  fontColorHex: string;
  outlineColorHex: string;
  outlineWidthPx: number;
  backgroundBoxOn: boolean;
  backgroundColorHex: string;
  backgroundOpacity: number;
  position: 'top' | 'center' | 'bottom' | string;
  verticalOffsetPct?: number;
  positionX?: number;
  positionY?: number;
  rotationDeg?: number;
  animation?: string;
  wordsPerCue: number;
  uppercase: boolean;
  bold: boolean;
  italic: boolean;
  strokePosition?: 'outside' | 'inside' | 'center' | string;
}

export interface ExportJob {
  id: string;
  videoProjectId: string;
  mode: ExportMode;
  backgroundHex?: string | null;
  includeAudio: boolean;
  format: ExportFormat;
  status: ExportStatus;
  progressPct: number;
  outputPath?: string | null;
  errorMessage?: string | null;
  createdAt: string;
}

export interface VideoProject {
  id: string;
  originalFilename: string;
  storagePath: string;
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  status: PipelineStatus;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  words?: Array<{ id: string; word: string; startMs: number; endMs: number; order: number }>;
  cues?: SubtitleCue[];
  style?: SubtitleStyle | null;
  exportJobs?: ExportJob[];
  _count?: { cues: number };
}

export interface FontOption {
  fileName: string;
  displayName: string;
  url: string;
}
