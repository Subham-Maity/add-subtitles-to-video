export type PipelineStage = 'UPLOADED' | 'EXTRACTING_AUDIO' | 'TRANSCRIBING' | 'TRANSCRIBED' | 'FAILED';

export interface PipelineProgressEvent {
  type: 'stage' | 'progress' | 'done' | 'error';
  stage?: PipelineStage;
  pct?: number;
  wordCount?: number;
  message?: string;
}

export interface VideoMetadata {
  durationMs: number;
  width: number;
  height: number;
  fps: number;
}
