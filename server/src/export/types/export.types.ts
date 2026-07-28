export type ExportMode = 'OVERLAY' | 'CAPTIONS_ONLY';
export type ExportFormat = 'MP4_H265' | 'MOV';
export type ExportStatus = 'QUEUED' | 'RENDERING' | 'DONE' | 'FAILED';

export interface ExportProgressEvent {
  type: 'progress' | 'done' | 'error';
  progressPct?: number;
  outputPath?: string;
  message?: string;
}
