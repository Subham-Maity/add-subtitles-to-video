/**
 * Base fields auto-enriched by BaseBullService.addJob() before every enqueue.
 * Callers NEVER manually set jobId or createdAt.
 */
export interface BaseJobData {
  jobId: string;
  createdAt: Date;
  type?: 'manual' | 'auto';
}

// ─── Subtitle & Transcription ─────────────────────────────────────────────

export interface SubtitleTranscriptionJobData extends BaseJobData {
  videoProjectId: string;
}
