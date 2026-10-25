/**
 * Batch Subtitle & Translation Engine
 * 
 * Takes all videos in storage/others,
 * processes them one by one in queue through the AI transcription service,
 * detects language (translating Hindi/non-English to English),
 * exports individual .txt subtitle files to storage/others/transcript/,
 * and merges all English translations into storage/others/transcript/main/merged_all_translations_en.txt.
 * 
 * Usage:
 *   node batch-translator/batch_transcribe_translate.js                      # Interactive format prompt
 *   node batch-translator/batch_transcribe_translate.js --with-timestamps    # Output with subtitle timestamps
 *   node batch-translator/batch_transcribe_translate.js --without-timestamps # Output clean English text without timestamps
 *   node batch-translator/batch_transcribe_translate.js --both               # Output both timed cues and full text
 *   node batch-translator/batch_transcribe_translate.js --limit 5            # Process only 5 videos
 *   node batch-translator/batch_transcribe_translate.js --force              # Re-process from video 1
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { spawn, execFile } = require('child_process');

// --- Configuration & Paths ---
// Resolves project root regardless of whether script is run from root or batch-translator/
const ROOT_DIR = fs.existsSync(path.resolve(__dirname, 'storage'))
  ? __dirname
  : path.resolve(__dirname, '..');

const OTHERS_DIR = path.resolve(ROOT_DIR, 'storage', 'others');
const TRANSCRIPT_DIR = path.resolve(OTHERS_DIR, 'transcript');
const MAIN_DIR = path.resolve(TRANSCRIPT_DIR, 'main');
const TEMP_AUDIO_DIR = path.resolve(ROOT_DIR, 'storage', 'temp');

const INDEX_JSON_PATH = path.resolve(TRANSCRIPT_DIR, 'index.json');
const ROOT_INDEX_JSON_PATH = path.resolve(OTHERS_DIR, 'index.json');
const MERGED_TXT_PATH = path.resolve(MAIN_DIR, 'merged_all_translations_en.txt');

const DEFAULT_SERVER_URL = process.env.TRANSCRIPTION_SERVICE_URL || 'http://127.0.0.1:8001';
const PYTHON_VENV_PATH = path.resolve(ROOT_DIR, 'transcription-service', 'venv', 'Scripts', 'python.exe');
const PYTHON_SERVICE_DIR = path.resolve(ROOT_DIR, 'transcription-service');

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm', '.flv', '.wmv', '.m4v']);

// Parse CLI flags
const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx !== -1 && args[limitIdx + 1] ? parseInt(args[limitIdx + 1], 10) : Infinity;
let FORCE = args.includes('--force');
const serverIdx = args.indexOf('--server');
const SERVER_URL = serverIdx !== -1 && args[serverIdx + 1] ? args[serverIdx + 1] : DEFAULT_SERVER_URL;

// Parse Timestamp Option from flags
let TIMESTAMP_MODE = null;
if (args.includes('--without-timestamps') || args.includes('--no-timestamps') || args.includes('--plain-text') || args.includes('--clean')) {
  TIMESTAMP_MODE = 'without';
} else if (args.includes('--with-timestamps') || args.includes('--timestamps')) {
  TIMESTAMP_MODE = 'with';
} else if (args.includes('--both')) {
  TIMESTAMP_MODE = 'both';
}
const formatIdx = args.indexOf('--format');
if (formatIdx !== -1 && args[formatIdx + 1]) {
  const f = args[formatIdx + 1].toLowerCase();
  if (f === 'without' || f === 'plain' || f === 'clean') TIMESTAMP_MODE = 'without';
  else if (f === 'with' || f === 'timed') TIMESTAMP_MODE = 'with';
  else if (f === 'both') TIMESTAMP_MODE = 'both';
}

// Ensure directories exist
for (const dir of [OTHERS_DIR, TRANSCRIPT_DIR, MAIN_DIR, TEMP_AUDIO_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// --- Terminal Formatting Helpers ---
const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bgBlue: '\x1b[44m',
  clearLine: '\x1b[2K\r',
};

function askQuestion(query, defaultValue = '') {
  if (!process.stdin.isTTY) {
    return Promise.resolve(defaultValue);
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

function formatMs(ms) {
  const safeMs = typeof ms === 'number' && !isNaN(ms) ? Math.max(0, Math.floor(ms)) : 0;
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = safeMs % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function renderProgressBar(current, total, width = 30) {
  const pct = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0;
  const filled = Math.round(width * pct);
  const empty = width - filled;
  const bar = '='.repeat(filled) + (filled < width ? '>' : '') + '-'.repeat(Math.max(0, empty - 1));
  return `[${bar}] ${(pct * 100).toFixed(1)}%`;
}

// --- Server Liveness & Auto-Start ---
async function isServerHealthy(url) {
  try {
    const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === 'ok' && data.model_loaded === true;
  } catch (e) {
    return false;
  }
}

async function ensureTranscriptionServer() {
  process.stdout.write(`${ANSI.cyan}[1/4] Checking AI Transcription Service (${SERVER_URL})...${ANSI.reset} `);
  const healthy = await isServerHealthy(SERVER_URL);
  if (healthy) {
    console.log(`${ANSI.green}CONNECTED (Active & Ready)${ANSI.reset}`);
    return null;
  }

  console.log(`${ANSI.yellow}Service not ready. Launching in background...${ANSI.reset}`);
  if (!fs.existsSync(PYTHON_VENV_PATH)) {
    throw new Error(`Python virtual environment not found at: ${PYTHON_VENV_PATH}. Please set up transcription-service.`);
  }

  const child = spawn(
    PYTHON_VENV_PATH,
    ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8001'],
    {
      cwd: PYTHON_SERVICE_DIR,
      detached: true,
      stdio: 'ignore',
    }
  );
  child.unref();

  process.stdout.write(`Waiting for Whisper model to load on GPU`);
  for (let attempt = 1; attempt <= 60; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    process.stdout.write('.');
    if (await isServerHealthy(SERVER_URL)) {
      console.log(` ${ANSI.green}READY!${ANSI.reset}`);
      return child;
    }
  }

  throw new Error(`Timed out waiting for transcription service to start on ${SERVER_URL}`);
}

// --- Audio Extraction with FFmpeg ---
function extractAudioWav(videoPath, tempWavPath) {
  return new Promise((resolve, reject) => {
    // 16kHz Mono PCM WAV — optimal for Whisper
    const ffmpegArgs = [
      '-y',
      '-i', videoPath,
      '-vn',
      '-acodec', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      tempWavPath,
    ];

    execFile('ffmpeg', ffmpegArgs, { maxBuffer: 10 * 1024 * 1024 }, (err) => {
      if (err) return reject(new Error(`FFmpeg audio extraction failed: ${err.message}`));
      resolve(tempWavPath);
    });
  });
}

// --- Language Detection & Translation API Calls ---
async function detectLanguage(audioPath, retries = 6) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const formData = new FormData();
    formData.append('audio_path', audioPath);

    const res = await fetch(`${SERVER_URL}/detect_language`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(60000),
    });

    if (res.status === 503 && attempt < retries) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Language detection failed (${res.status}): ${errText}`);
    }

    return res.json();
  }
}

async function transcribeAndTranslateStream(audioPath, task, onSegment, retries = 6) {
  let response;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const formData = new FormData();
    formData.append('audio_path', audioPath);
    formData.append('task', task);

    response = await fetch(`${SERVER_URL}/transcribe_stream`, {
      method: 'POST',
      body: formData,
    });

    if (response.status === 503 && attempt < retries) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Transcription stream failed (${response.status}): ${errText}`);
    }
    break;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completePayload = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';

    for (const chunk of chunks) {
      const line = chunk.trim();
      if (!line.startsWith('data: ')) continue;
      try {
        const payload = JSON.parse(line.replace('data: ', ''));
        if (payload.type === 'segment') {
          if (onSegment) onSegment(payload);
        } else if (payload.type === 'complete') {
          completePayload = payload;
        } else if (payload.type === 'error') {
          throw new Error(payload.message || 'Stream error');
        }
      } catch (err) {
        if (err.message && err.message.includes('Stream error')) throw err;
      }
    }
  }

  if (!completePayload) {
    throw new Error('Transcription ended without completion payload');
  }

  return completePayload;
}

// --- Cue Structuring Helper ---
function structureCuesFromWords(rawWords, fullText = '', wordsPerCue = 7) {
  const words = (rawWords || [])
    .map((w) => ({
      word: (w.word || '').trim(),
      startMs: typeof w.start_ms === 'number' ? w.start_ms : (typeof w.startMs === 'number' ? w.startMs : 0),
      endMs: typeof w.end_ms === 'number' ? w.end_ms : (typeof w.endMs === 'number' ? w.endMs : 0),
    }))
    .filter((w) => w.word.length > 0);

  if (words.length === 0) {
    if (fullText && fullText.trim()) {
      return [{
        order: 1,
        startMs: 0,
        endMs: 5000,
        timeFormatted: `[${formatMs(0)} --> ${formatMs(5000)}]`,
        text: fullText.trim(),
      }];
    }
    return [];
  }

  const cues = [];
  let currentWords = [];
  let cueIndex = 1;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    currentWords.push(w);

    const isLastWord = i === words.length - 1;
    const nextStartMs = !isLastWord ? words[i + 1].startMs : w.endMs;
    const pauseToNext = nextStartMs - w.endMs;
    const naturalBreak = pauseToNext > 600 || /[.?!]$/.test(w.word);

    if (currentWords.length >= wordsPerCue || naturalBreak || isLastWord) {
      const text = currentWords.map((cw) => cw.word).join(' ').trim();
      const startMs = currentWords[0].startMs;
      const endMs = currentWords[currentWords.length - 1].endMs;

      cues.push({
        order: cueIndex++,
        startMs,
        endMs,
        timeFormatted: `[${formatMs(startMs)} --> ${formatMs(endMs)}]`,
        text,
      });

      currentWords = [];
    }
  }

  return cues;
}

// --- Text File Content Builder (With or Without Timestamps) ---
function buildTxtContent(item, completeResult, cues, detectedLang, isHindi, confidence, task, timestampMode) {
  let txtContent = '';
  txtContent += `================================================================================\n`;
  txtContent += `FILE: ${item.filename}\n`;
  txtContent += `ORIGINAL LANGUAGE: ${detectedLang.toUpperCase()} (${isHindi ? 'Hindi' : detectedLang}) [Confidence: ${confidence}%]\n`;
  txtContent += `TASK: ${task === 'translate' ? 'Translated from ' + detectedLang + ' to English' : 'Direct English Transcription'}\n`;
  txtContent += `TOTAL WORDS: ${completeResult.words.length}\n`;
  if (timestampMode !== 'without') {
    txtContent += `TOTAL CUES: ${cues.length}\n`;
  }
  txtContent += `FORMAT: ${timestampMode === 'without' ? 'Without Timestamps (Clean Text)' : timestampMode === 'with' ? 'With Timestamps (Timed Cues)' : 'Both (Timed Cues + Full Text)'}\n`;
  txtContent += `PROCESSED AT: ${new Date().toISOString()}\n`;
  txtContent += `================================================================================\n\n`;

  const fullText = (completeResult.text || cues.map((c) => c.text).join(' ')).trim();

  if (timestampMode === 'without') {
    txtContent += `--- ENGLISH TRANSLATION (CLEAN TEXT) ---\n`;
    txtContent += `${fullText}\n`;
  } else if (timestampMode === 'with') {
    txtContent += `--- SUBTITLE CUES (TIMED) ---\n`;
    cues.forEach((cue) => {
      txtContent += `${cue.timeFormatted} ${cue.text}\n`;
    });
    txtContent += `\n`;
  } else {
    // Both
    txtContent += `--- SUBTITLE CUES (TIMED) ---\n`;
    cues.forEach((cue) => {
      txtContent += `${cue.timeFormatted} ${cue.text}\n`;
    });
    txtContent += `\n`;
    txtContent += `--- FULL ENGLISH TRANSCRIPT ---\n`;
    txtContent += `${fullText}\n`;
  }

  return txtContent;
}

// --- Index File Management ---
function loadOrCreateIndex() {
  let existing = [];
  if (fs.existsSync(INDEX_JSON_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(INDEX_JSON_PATH, 'utf-8'));
    } catch (e) {}
  }

  const existingMap = new Map(existing.map((item) => [item.filename, item]));

  const files = fs.readdirSync(OTHERS_DIR);
  const videoFiles = files
    .filter((f) => {
      const ext = path.extname(f).toLowerCase();
      const stat = fs.statSync(path.join(OTHERS_DIR, f));
      return stat.isFile() && VIDEO_EXTENSIONS.has(ext);
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const updatedList = videoFiles.map((filename, idx) => {
    const fullPath = path.join(OTHERS_DIR, filename);
    const stat = fs.statSync(fullPath);
    const prev = existingMap.get(filename);

    if (prev) {
      return {
        ...prev,
        id: idx + 1,
        filePath: fullPath,
        sizeBytes: stat.size,
      };
    }

    return {
      id: idx + 1,
      filename,
      filePath: fullPath,
      sizeBytes: stat.size,
      status: 'pending',
      detectedLanguage: null,
      isHindi: false,
      translatedToEnglish: false,
      transcriptTxtPath: null,
      cueCount: 0,
      wordCount: 0,
      error: null,
      processedAt: null,
    };
  });

  saveIndex(updatedList);
  return updatedList;
}

function saveIndex(list) {
  const jsonContent = JSON.stringify(list, null, 2);
  fs.writeFileSync(INDEX_JSON_PATH, jsonContent, 'utf-8');
  try {
    fs.writeFileSync(ROOT_INDEX_JSON_PATH, jsonContent, 'utf-8');
  } catch (e) {}
}

// --- Master Merged File Generator ---
function updateMergedFile(indexList, timestampMode) {
  const completed = indexList.filter((item) => item.status === 'completed' && item.transcriptTxtPath);

  let mergedContent = '';
  mergedContent += `================================================================================\n`;
  mergedContent += `SUBTITLESTUDIO — MASTER ENGLISH TRANSLATIONS REPOSITORY\n`;
  mergedContent += `Source Directory: ${OTHERS_DIR}\n`;
  mergedContent += `Total Videos Discovered: ${indexList.length}\n`;
  mergedContent += `Total Completed: ${completed.length}\n`;
  mergedContent += `Format Mode: ${timestampMode === 'without' ? 'Without Timestamps (Clean Text)' : timestampMode === 'with' ? 'With Timestamps' : 'Both'}\n`;
  mergedContent += `Last Updated: ${new Date().toISOString()}\n`;
  mergedContent += `================================================================================\n\n`;

  mergedContent += `TABLE OF CONTENTS / INDEX:\n`;
  completed.forEach((c, idx) => {
    mergedContent += `  ${idx + 1}. [${c.filename}] - Original: ${c.detectedLanguage || 'unknown'} (Hindi: ${c.isHindi ? 'YES' : 'NO'}) -> English | Words: ${c.wordCount}\n`;
  });
  mergedContent += `\n${'='.repeat(80)}\n\n`;

  for (let i = 0; i < completed.length; i++) {
    const item = completed[i];
    if (fs.existsSync(item.transcriptTxtPath)) {
      const fileText = fs.readFileSync(item.transcriptTxtPath, 'utf-8');
      mergedContent += `\n################################################################################\n`;
      mergedContent += `### VIDEO [${i + 1}/${completed.length}]: ${item.filename}\n`;
      mergedContent += `################################################################################\n\n`;
      mergedContent += fileText;
      mergedContent += `\n\n`;
    }
  }

  fs.writeFileSync(MERGED_TXT_PATH, mergedContent, 'utf-8');
}

// --- Main Queue Processing Loop ---
async function main() {
  console.clear();
  console.log(`${ANSI.bold}${ANSI.bgBlue} SUBTITLESTUDIO — BATCH VIDEO TRANSLATION & SUBTITLE GENERATOR ${ANSI.reset}\n`);

  // 1. Choose Timestamp Mode (interactive prompt if not passed as CLI argument)
  if (!TIMESTAMP_MODE) {
    console.log(`${ANSI.cyan}[Output Format Selection]${ANSI.reset}`);
    console.log(`  ${ANSI.bold}[1] With Timestamps${ANSI.reset}     - Subtitle cues with timing: [00:00:01.000 --> 00:00:04.000]`);
    console.log(`  ${ANSI.bold}[2] Without Timestamps${ANSI.reset}  - Clean English translation text only (no timestamps)`);
    console.log(`  ${ANSI.bold}[3] Both${ANSI.reset}                - Timed subtitle cues + full continuous text\n`);
    const answer = await askQuestion(`${ANSI.yellow}Choose format [1/2/3] (Press Enter for 1 - With Timestamps): ${ANSI.reset}`, '1');
    if (answer === '2') TIMESTAMP_MODE = 'without';
    else if (answer === '3') TIMESTAMP_MODE = 'both';
    else TIMESTAMP_MODE = 'with';
  }
  console.log(`Selected Output Format: ${ANSI.bold}${ANSI.green}${TIMESTAMP_MODE === 'without' ? 'WITHOUT Timestamps (Clean Text Only)' : TIMESTAMP_MODE === 'with' ? 'WITH Timestamps (Timed Cues)' : 'BOTH (Timed Cues + Full Text)'}${ANSI.reset}\n`);

  // 2. Ensure server is running
  await ensureTranscriptionServer();

  // 3. Build index
  console.log(`\n${ANSI.cyan}[2/4] Indexing all videos from: ${OTHERS_DIR}${ANSI.reset}`);
  const indexList = loadOrCreateIndex();
  console.log(`Found ${ANSI.bold}${indexList.length}${ANSI.reset} video(s) in index. Index saved to: ${INDEX_JSON_PATH}`);

  const completedCount = indexList.filter((item) => item.status === 'completed').length;
  const pendingCount = indexList.length - completedCount;

  // Ask resume vs restart if videos were previously completed and no explicit flag given
  if (completedCount > 0 && !FORCE && !args.includes('--resume') && LIMIT === Infinity) {
    console.log(`\n${ANSI.cyan}[Queue Status]${ANSI.reset} Found ${ANSI.green}${completedCount} already completed${ANSI.reset} and ${ANSI.yellow}${pendingCount} pending${ANSI.reset} video(s).`);
    const resumeAns = await askQuestion(`${ANSI.yellow}Resume remaining ${pendingCount} video(s)? (Y/n) [Default: Y]: ${ANSI.reset}`, 'Y');
    if (resumeAns.toLowerCase() === 'n' || resumeAns.toLowerCase() === 'no') {
      const forceAns = await askQuestion(`${ANSI.red}Restart fresh and re-process all ${indexList.length} videos from video 1? (y/N): ${ANSI.reset}`, 'N');
      if (forceAns.toLowerCase() === 'y' || forceAns.toLowerCase() === 'yes') {
        FORCE = true;
      }
    }
  }

  // Filter items to process
  let queue = indexList;
  if (!FORCE) {
    queue = queue.filter((item) => item.status !== 'completed');
  }
  if (LIMIT < queue.length) {
    queue = queue.slice(0, LIMIT);
    console.log(`${ANSI.yellow}CLI limit active: processing next ${queue.length} video(s).${ANSI.reset}`);
  }

  if (queue.length === 0) {
    console.log(`\n${ANSI.green}All ${indexList.length} videos are already completed!${ANSI.reset}`);
    console.log(`Master merged file: ${MERGED_TXT_PATH}`);
    console.log(`(To re-process all videos, run: node batch-translator/batch_transcribe_translate.js --force)`);
    return;
  }

  console.log(`\n${ANSI.cyan}[3/4] Processing Queue: ${queue.length} video(s) to translate${ANSI.reset}\n`);

  let completedInRun = 0;
  const startTime = Date.now();

  for (let qIdx = 0; qIdx < queue.length; qIdx++) {
    const item = queue[qIdx];
    const overallProgressStr = renderProgressBar(qIdx, queue.length, 25);
    const remainingCount = queue.length - qIdx;

    console.log(`${ANSI.bold}--------------------------------------------------------------------------------${ANSI.reset}`);
    console.log(
      `${ANSI.bold}${ANSI.cyan}Video ${qIdx + 1}/${queue.length}${ANSI.reset} ${ANSI.dim}(${remainingCount} remaining in this run)${ANSI.reset} ` +
      `| Overall: ${overallProgressStr}`
    );
    console.log(`File: ${ANSI.bold}${item.filename}${ANSI.reset} (${(item.sizeBytes / (1024 * 1024)).toFixed(1)} MB)`);

    const tempWav = path.join(TEMP_AUDIO_DIR, `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.wav`);

    try {
      item.status = 'in-progress';
      saveIndex(indexList);

      // Stage A: Audio extraction
      process.stdout.write(`  [1/4] Extracting 16kHz audio with FFmpeg... `);
      const audioStart = Date.now();
      await extractAudioWav(item.filePath, tempWav);
      console.log(`${ANSI.green}Done (${Date.now() - audioStart}ms)${ANSI.reset}`);

      // Stage B: Language Detection
      process.stdout.write(`  [2/4] Detecting language with Faster-Whisper AI... `);
      const detectResult = await detectLanguage(tempWav);
      const detectedLang = detectResult.language;
      const isHindi = detectResult.is_hindi;
      const confidence = (detectResult.probability * 100).toFixed(0);

      const langColor = isHindi ? ANSI.magenta : ANSI.green;
      console.log(`${langColor}${detectedLang.toUpperCase()} (${confidence}% confidence)${ANSI.reset} - ${isHindi ? ANSI.bold + 'Hindi detected! Translating to English.' + ANSI.reset : 'Transcribing in English.'}`);

      // Determine task: translate to English if Hindi or non-English, transcribe if already English
      const task = (isHindi || detectedLang !== 'en') ? 'translate' : 'transcribe';

      // Stage C: Transcription / Translation Streaming
      console.log(`  [3/4] Streaming AI ${task.toUpperCase()} with word-level timestamps:`);

      const transStart = Date.now();
      let lastPct = 0;
      let lastTextSnippet = '';

      const completeResult = await transcribeAndTranslateStream(tempWav, task, (segment) => {
        lastPct = segment.pct;
        lastTextSnippet = segment.text.trim().replace(/\s+/g, ' ');
        if (lastTextSnippet.length > 45) {
          lastTextSnippet = lastTextSnippet.substring(0, 42) + '...';
        }
        const fileProgressBar = renderProgressBar(lastPct, 100, 20);
        process.stdout.write(
          `${ANSI.clearLine}    ${fileProgressBar} [${segment.start.toFixed(1)}s -> ${segment.end.toFixed(1)}s] "${ANSI.dim}${lastTextSnippet}${ANSI.reset}"`
        );
      });

      process.stdout.write(
        `${ANSI.clearLine}    ${renderProgressBar(100, 100, 20)} ${ANSI.green}Complete in ${((Date.now() - transStart) / 1000).toFixed(1)}s!${ANSI.reset}\n`
      );

      // Stage D: Export Individual .txt File according to chosen timestamp format
      process.stdout.write(`  [4/4] Exporting individual .txt file (${TIMESTAMP_MODE === 'without' ? 'without timestamps' : 'with timestamps'})... `);
      const cues = structureCuesFromWords(completeResult.words, completeResult.text, 7);
      const baseName = path.basename(item.filename, path.extname(item.filename));
      const individualTxtPath = path.join(TRANSCRIPT_DIR, `${baseName}.txt`);

      const txtContent = buildTxtContent(
        item,
        completeResult,
        cues,
        detectedLang,
        isHindi,
        confidence,
        task,
        TIMESTAMP_MODE
      );

      fs.writeFileSync(individualTxtPath, txtContent, 'utf-8');
      console.log(`${ANSI.green}SAVED${ANSI.reset} -> ${path.relative(ROOT_DIR, individualTxtPath)}`);

      // Update Index Item
      item.status = 'completed';
      item.detectedLanguage = detectedLang;
      item.isHindi = isHindi;
      item.translatedToEnglish = true;
      item.transcriptTxtPath = individualTxtPath;
      item.cueCount = cues.length;
      item.wordCount = completeResult.words.length;
      item.error = null;
      item.processedAt = new Date().toISOString();
      saveIndex(indexList);

      // Incrementally update master merged file
      updateMergedFile(indexList, TIMESTAMP_MODE);

      completedInRun++;
    } catch (err) {
      console.log(`\n  ${ANSI.red}ERROR processing ${item.filename}: ${err.message}${ANSI.reset}`);
      item.status = 'failed';
      item.error = err.message;
      saveIndex(indexList);
    } finally {
      // Clean up temporary audio file
      try {
        if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
      } catch (e) {}
    }
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${ANSI.bold}${ANSI.green}================================================================================${ANSI.reset}`);
  console.log(`${ANSI.bold}${ANSI.green} BATCH COMPLETE! Processed ${completedInRun} video(s) in ${elapsedSec}s.${ANSI.reset}`);
  console.log(`- Format: ${TIMESTAMP_MODE === 'without' ? 'Without Timestamps (Clean Text Only)' : TIMESTAMP_MODE === 'with' ? 'With Timestamps' : 'Both'}`);
  console.log(`- Individual transcripts saved in: ${TRANSCRIPT_DIR}`);
  console.log(`- Master merged English translation: ${MERGED_TXT_PATH}`);
  console.log(`- Master index updated: ${INDEX_JSON_PATH}`);
  console.log(`${ANSI.bold}${ANSI.green}================================================================================${ANSI.reset}\n`);
}

main().catch((err) => {
  console.error(`\n${ANSI.red}FATAL ERROR: ${err.message}${ANSI.reset}`, err.stack);
  process.exit(1);
});
