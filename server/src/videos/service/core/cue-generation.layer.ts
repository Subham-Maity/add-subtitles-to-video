import { Injectable } from '@nestjs/common';
import { PAUSE_BREAK_MS, TAIL_PADDING_MS } from 'src/videos/constants';

export interface GeneratedCue {
  text: string;
  startMs: number;
  endMs: number;
  order: number;
}

@Injectable()
export class CueGenerationLayer {
  generateCues(
    words: Array<{ word: string; startMs: number; endMs: number }>,
    wordsPerCue: number = 6,
  ): GeneratedCue[] {
    if (!words || words.length === 0) return [];

    const cuesRaw: Array<{ words: typeof words; startMs: number; endMs: number }> = [];
    let currentBatch: typeof words = [];

    for (const word of words) {
      const lastWord = currentBatch.length > 0 ? currentBatch[currentBatch.length - 1] : null;
      const gapMs = lastWord ? word.startMs - lastWord.endMs : 0;

      const reachedCap = currentBatch.length >= wordsPerCue;
      const reachedPause = currentBatch.length > 0 && gapMs > PAUSE_BREAK_MS;

      if (reachedCap || reachedPause) {
        cuesRaw.push({
          words: currentBatch,
          startMs: currentBatch[0].startMs,
          endMs: currentBatch[currentBatch.length - 1].endMs + TAIL_PADDING_MS,
        });
        currentBatch = [];
      }
      currentBatch.push(word);
    }

    if (currentBatch.length > 0) {
      cuesRaw.push({
        words: currentBatch,
        startMs: currentBatch[0].startMs,
        endMs: currentBatch[currentBatch.length - 1].endMs + TAIL_PADDING_MS,
      });
    }

    // Clamp endMs to avoid overlapping next cue's startMs
    return cuesRaw.map((cue, idx) => {
      const nextCue = cuesRaw[idx + 1];
      let endMs = cue.endMs;
      if (nextCue && endMs > nextCue.startMs) {
        endMs = Math.max(cue.startMs + 100, nextCue.startMs - 20);
      }

      const text = cue.words.map((w) => w.word).join(' ');

      return {
        text,
        startMs: cue.startMs,
        endMs,
        order: idx,
      };
    });
  }
}
