# Batch Video Translation & Subtitle Engine

> **Automated headless queue processor** for transcribing and translating bulk videos into English subtitles and clean plain text documents using the local Faster-Whisper AI engine.

---

## 📌 Purpose of This Script

This tool is designed for bulk processing without using the web UI:
1. **Scans** all videos placed in `storage/others/`.
2. **Maintains an index** (`storage/others/transcript/index.json`) tracking status, detected language, and timestamps.
3. **Extracts 16kHz audio** via FFmpeg in milliseconds.
4. **Detects Language**: Identifies whether the speech is Hindi, Urdu, or other languages.
5. **Translates to English**: If non-English (or Hindi/Urdu), translates speech directly into English using `faster-whisper` on your local GPU.
6. **Exports Individual `.txt` Files**: Saves clean, organized `.txt` files per video with or without timestamps.
7. **Merges All English Translations**: Consolidates every processed video translation into a single master document: `storage/others/transcript/main/merged_all_translations_en.txt`.

---

## 📂 Directory Structure & Responsibilities

| Directory / File | Role & Responsibility |
|---|---|
| [`storage/others/`](file:///c:/Github/add-subtitles-to-video/storage/others) | **INPUT FOLDER**: Put all your source video files here (`.mp4`, `.mov`, `.mkv`, `.avi`, `.webm`, etc.). |
| [`storage/others/transcript/`](file:///c:/Github/add-subtitles-to-video/storage/others/transcript) | **INDIVIDUAL OUTPUTS**: Each video gets its own generated `<filename>.txt` translation file here. |
| [`storage/others/transcript/main/`](file:///c:/Github/add-subtitles-to-video/storage/others/transcript/main) | **MERGED MASTER OUTPUT**: Contains `merged_all_translations_en.txt` merging all translated videos into one file. |
| [`storage/others/transcript/index.json`](file:///c:/Github/add-subtitles-to-video/storage/others/transcript/index.json) | **PROGRESS TRACKER**: Stores queue state, detected language, word count, cue count, and completion timestamps. |
| [`storage/temp/`](file:///c:/Github/add-subtitles-to-video/storage/temp) | **TEMP BUFFER**: FFmpeg extracts temporary mono 16kHz WAV files here; automatically cleaned after processing each video. |
| [`transcription-service/`](file:///c:/Github/add-subtitles-to-video/transcription-service) | **CORE AI BACKEND**: Python FastAPI service running Faster-Whisper with CUDA GPU acceleration on port `8001`. |

> **Note on `.gitignore`**: All video files in `storage/others`, temporary WAV files, generated individual transcripts, and master merged transcripts are ignored by Git so heavy media files never get pushed to GitHub. Only directory structure `.gitkeep` files are tracked.

---

## 🚀 How to Start

### 1. Interactive Mode (Recommended)

Run the script from the project root:

```powershell
node batch-translator/batch_transcribe_translate.js
# or from root:
node batch_transcribe_translate.js
```

When started, the script will prompt you:

```text
[Output Format Selection]
  [1] With Timestamps     - Subtitle cues with timing: [00:00:01.000 --> 00:00:04.000]
  [2] Without Timestamps  - Clean English translation text only (no timestamps)
  [3] Both                - Timed subtitle cues + full continuous text

Choose format [1/2/3] (Press Enter for 1 - With Timestamps): 
```

- Type **`1`** (or press **Enter**) for **With Timestamps**.
- Type **`2`** for **Without Timestamps** (clean plain text only).
- Type **`3`** for **Both** (timed cues + complete continuous transcript).

If previous videos were already completed, it will automatically ask:
```text
[Queue Status] Found 4 already completed and 679 pending video(s).
Resume remaining 679 video(s)? (Y/n) [Default: Y]: 
```
Press **Enter** to continue seamlessly where you left off.

---

### 2. Direct Command-Line Flags

Skip interactive prompts by passing flags directly:

#### A. Export Without Timestamps (Clean Plain English Text):
```powershell
node batch-translator/batch_transcribe_translate.js --without-timestamps
```

#### B. Export With Timestamps (Timed Subtitle Cues):
```powershell
node batch-translator/batch_transcribe_translate.js --with-timestamps
```

#### C. Export Both (Timed Cues + Full Continuous Transcript):
```powershell
node batch-translator/batch_transcribe_translate.js --both
```

#### D. Process a Limited Batch (e.g., test with next 5 videos):
```powershell
node batch-translator/batch_transcribe_translate.js --limit 5
```

#### E. Force Re-process All Videos from Index 1:
```powershell
node batch-translator/batch_transcribe_translate.js --force
```

---

## 📄 Output Formats

### Format 1: Without Timestamps (`--without-timestamps`)
Clean text for reading, documentation, and article summaries:
```text
================================================================================
FILE: sample_presentation.mp4
ORIGINAL LANGUAGE: HI (Hindi) [Confidence: 96%]
TASK: Translated from hi to English
TOTAL WORDS: 24
FORMAT: Without Timestamps (Clean Text)
================================================================================

--- ENGLISH TRANSLATION (CLEAN TEXT) ---
Welcome everyone to this tutorial. Today we will demonstrate how to build fast local AI video applications without third-party cloud subscriptions.
```

### Format 2: With Timestamps (`--with-timestamps`)
Standard timed cues for subtitle editors, players, and sync:
```text
================================================================================
FILE: sample_presentation.mp4
ORIGINAL LANGUAGE: HI (Hindi) [Confidence: 96%]
TASK: Translated from hi to English
TOTAL WORDS: 24
TOTAL CUES: 3
================================================================================

--- SUBTITLE CUES (TIMED) ---
[00:00:00.500 --> 00:00:03.200] Welcome everyone to this tutorial.
[00:00:03.400 --> 00:00:06.800] Today we will demonstrate how to build
[00:00:07.000 --> 00:00:10.500] fast local AI video applications.
```

---

## ⚡ Technical Features

- **Automatic Service Liveness**: Auto-launches the Python Whisper server on port `8001` if it is not currently active.
- **Local GPU Acceleration**: Utilizes CUDA (`int8` compute) for high-speed local inference.
- **Live Terminal Queue**: Real-time progress bars with segment preview, percentage, and time remaining.
- **Safe & Resumable**: Automatically tracks processed files in `index.json` to safely resume interrupted runs without duplicate work.
