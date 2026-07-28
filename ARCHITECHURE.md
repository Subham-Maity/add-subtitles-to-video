# SubtitleStudio — System Architecture

> A complete technical reference for how SubtitleStudio works end-to-end: from uploading a video to getting a burned `.mp4` file back.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Service Map & Ports](#2-service-map--ports)
3. [Backend Architecture (NestJS)](#3-backend-architecture-nestjs)
4. [Database Schema (Prisma + PostgreSQL)](#4-database-schema-prisma--postgresql)
5. [Pipeline 1 — Video Upload & AI Transcription](#5-pipeline-1--video-upload--ai-transcription)
6. [Pipeline 2 — Subtitle Editing (Canvas Editor)](#6-pipeline-2--subtitle-editing-canvas-editor)
7. [Pipeline 3 — Export & FFmpeg Rendering](#7-pipeline-3--export--ffmpeg-rendering)
8. [Frontend Architecture (Next.js)](#8-frontend-architecture-nextjs)
9. [Real-Time SSE Event Streams](#9-real-time-sse-event-streams)
10. [AI Transcription Microservice (Python)](#10-ai-transcription-microservice-python)
11. [WYSIWYG Scaling Formula](#11-wysiwyg-scaling-formula)
12. [Storage Layout](#12-storage-layout)
13. [API Endpoint Reference](#13-api-endpoint-reference)
14. [Data Flow Diagram](#14-data-flow-diagram)

---

## 1. High-Level Overview

SubtitleStudio is a **3-service monorepo** application:

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER's Browser                           │
│                    Next.js Frontend :3000                        │
│   ┌───────────────┐  ┌──────────────────┐  ┌────────────────┐  │
│   │  Home Page    │  │  Canvas Editor   │  │  Export Panel  │  │
│   │  (Upload)     │  │  (WYSIWYG Edit)  │  │  (SSE Progress)│  │
│   └───────────────┘  └──────────────────┘  └────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP + SSE
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│               NestJS API Server :3336 (/xam/...)                │
│  ┌────────────┐  ┌──────────────┐  ┌────────────┐  ┌────────┐ │
│  │  /videos   │  │ /videos/:id  │  │  /exports  │  │ /fonts │ │
│  │  (Upload)  │  │ (Cues/Style) │  │  (Render)  │  │        │ │
│  └────────────┘  └──────────────┘  └────────────┘  └────────┘ │
│                            │                                     │
│         ┌──────────────────┼──────────────────────┐             │
│         ▼                  ▼                      ▼             │
│  [VideoPipeline    [SubtitleService]      [ExportOrchestrator]  │
│   Orchestrator]   (cue/style CRUD)        (ASS → FFmpeg)        │
│         │                  │                      │             │
│         ▼                  ▼                      ▼             │
│     PostgreSQL          PostgreSQL             FFmpeg            │
│     (Prisma ORM)        (Prisma ORM)       (NVENC / x264)       │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP POST /transcribe (multipart)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│           Python FastAPI Transcription Service :8001             │
│                  faster-whisper (base model)                     │
│   ┌────────────┐  ┌───────────────────┐  ┌───────────────────┐ │
│   │  /health   │  │   /transcribe     │  │  Whisper Model    │ │
│   │            │  │   (WAV → words)   │  │  (base / GPU)     │ │
│   └────────────┘  └───────────────────┘  └───────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Service Map & Ports

| Service | Technology | Port | Role |
|---|---|---|---|
| **Frontend** | Next.js 16 (React) | `3000` | Browser UI — Editor, Upload, Export |
| **API Server** | NestJS 10 (Node.js) | `3336` | REST API, pipeline orchestration, SSE |
| **Transcription** | Python FastAPI | `8001` | faster-whisper AI — audio → word timestamps |
| **Database** | PostgreSQL | `5444` | Persistent storage for all project data |

> All routes on the API server are prefixed with `/xam/` (e.g., `GET http://localhost:3336/xam/videos`).

---

## 3. Backend Architecture (NestJS)

The NestJS server follows a clean **Module → Controller → Service → Repository** layered architecture.

```
server/src/
├── main.ts                      ← Bootstrap: Express app, global pipes, CORS, prefix '/xam'
├── app.module.ts                ← Root module: imports all feature modules
│
├── videos/                      ← VideoProject feature module
│   ├── controller/
│   │   └── videos.controller.ts ← Upload, CRUD, SSE pipeline progress, clean-junk
│   ├── service/
│   │   ├── video-pipeline.orchestrator.ts  ← Runs 3-stage transcription pipeline
│   │   └── core/
│   │       ├── audio-extraction.layer.ts   ← FFmpeg: video → audio.wav (16kHz mono)
│   │       ├── transcription.layer.ts      ← Calls Python AI service via HTTP
│   │       ├── cue-generation.layer.ts     ← Groups words into subtitle cues
│   │       └── utility/
│   │           ├── ffmpeg-runner.helper.ts         ← Runs FFmpeg (exec + spawn w/ progress)
│   │           ├── ffprobe.helper.ts               ← Reads video metadata
│   │           └── transcription-client.provider.ts ← HTTP client to Python service
│   ├── repository/              ← Prisma queries for VideoProject + TranscriptWord
│   └── dto/                     ← Input validation DTOs
│
├── subtitles/                   ← Subtitle cue & style management
│   ├── controller/
│   │   └── subtitles.controller.ts ← CRUD for cues & style updates
│   ├── service/
│   │   └── subtitle.service.ts     ← Business logic: create/update/delete cues, style
│   └── repository/              ← Prisma queries for SubtitleCue + SubtitleStyle
│
├── export/                      ← Export rendering pipeline
│   ├── controller/
│   │   └── export.controller.ts    ← Create job, SSE progress, download file
│   ├── service/
│   │   ├── export.orchestrator.ts  ← Runs ASS build → FFmpeg render pipeline
│   │   └── core/
│   │       ├── ass-builder.layer.ts        ← Builds .ass subtitle script from cues + style
│   │       ├── overlay-render.layer.ts     ← FFmpeg: burn subs onto original video
│   │       └── captions-only-render.layer.ts ← FFmpeg: subs on solid color background
│   └── repository/              ← Prisma queries for ExportJob
│
├── fonts/                       ← Font scanning & serving
│   └── service/
│       └── font-scanner.service.ts  ← Scans client/public/lang/ for .ttf/.otf files
│
├── prisma/                      ← Prisma client provider (singleton)
├── cors/                        ← CORS configuration
├── error/                       ← Global exception filters
├── logger/                      ← Request/response logging middleware
└── validate/                    ← Environment variable validation (Joi)
```

### Key Design Decisions

- **Layered architecture**: Controller only handles HTTP. Service contains all business logic. Repository does all Prisma queries.
- **Orchestrators**: Both `VideoPipelineOrchestrator` and `ExportOrchestrator` own background jobs and SSE event streams. They emit progress events that flow to the frontend via Server-Sent Events.
- **In-flight guard**: `VideoPipelineOrchestrator` maintains a `Set<string>` of `inFlight` video IDs — prevents duplicate processing if the user clicks Retry twice.
- **GPU-first, CPU-fallback**: Both render layers try `h264_nvenc` (NVIDIA) first, silently fall back to `libx264` ultrafast if the GPU is unavailable.

---

## 4. Database Schema (Prisma + PostgreSQL)

```
VideoProject
├── id (cuid)
├── originalFilename
├── storagePath          ← Absolute path to the original uploaded video file
├── durationMs / width / height / fps
├── status (PipelineStatus enum)
│   └── UPLOADED → EXTRACTING_AUDIO → TRANSCRIBING → TRANSCRIBED | FAILED
├── errorMessage?
│
├── words[]   (TranscriptWord)    ← Raw word-level results from Whisper
│   ├── word (string)
│   ├── startMs / endMs
│   └── order
│
├── cues[]    (SubtitleCue)       ← Grouped subtitle cues (shown in editor)
│   ├── text (string)
│   ├── startMs / endMs
│   ├── order
│   ├── colorHex?                 ← Per-cue color override
│   └── edited (boolean)
│
├── style?    (SubtitleStyle)     ← 1:1 relation — all visual styling settings
│   ├── fontFileName / fontSizePx / fontColorHex
│   ├── outlineColorHex / outlineWidthPx / strokePosition
│   ├── backgroundBoxOn / backgroundColorHex / backgroundOpacity
│   ├── positionX / positionY (0–100 %)
│   ├── rotationDeg / bold / italic / uppercase
│   └── wordsPerCue
│
└── exportJobs[] (ExportJob)      ← One per export attempt
    ├── mode (OVERLAY | CAPTIONS_ONLY)
    ├── format (MP4_H265 | MOV)
    ├── backgroundHex / includeAudio
    ├── status (QUEUED → RENDERING → DONE | FAILED)
    ├── progressPct (0–100)
    └── outputPath?               ← Absolute path to rendered video file
```

All relations cascade delete — deleting a `VideoProject` cleans up its words, cues, style, and export jobs.

---

## 5. Pipeline 1 — Video Upload & AI Transcription

This is triggered when a user drags a video onto the home page. It runs entirely in the background and pushes live status updates via SSE.

```
User Uploads Video
        │
        ▼
POST /xam/videos/upload  (multipart/form-data)
        │
        ▼
[VideosController.uploadVideo]
  1. Multer saves file → storage/temp/<unique>.mp4
  2. FfprobeHelper.extractMetadata(filePath)
     └── ffprobe -v quiet -print_format json -show_streams → width, height, fps, durationMs
  3. VideoProjectRepository.create() → saves VideoProject row (status=UPLOADED)
  4. Moves temp file → storage/uploads/<videoId>/original.mp4
  5. Calls orchestrator.runPipeline(videoId)  ← fire-and-forget (async, non-blocking)
  6. Returns { id, status: 'UPLOADED', ... } to browser immediately
        │
        ▼ (background)
[VideoPipelineOrchestrator.runPipeline]
        │
        ├─ Stage 1: EXTRACTING_AUDIO
        │    └── AudioExtractionLayer.extract()
        │         └── ffmpeg -i video.mp4 -vn -acodec pcm_s16le -ar 16000 -ac 1 audio.wav
        │              (Mono 16kHz WAV — exactly what Whisper expects)
        │
        ├─ Stage 2: TRANSCRIBING
        │    └── TranscriptionLayer.transcribe(audioPath)
        │         └── TranscriptionClientProvider.transcribe()
        │              └── HTTP POST http://localhost:8001/transcribe
        │                   (multipart upload of audio.wav)
        │                   ← Python service returns: [{word, start_ms, end_ms}]
        │              └── Saves TranscriptWords to DB
        │
        ├─ Stage 3: CUE GENERATION
        │    └── CueGenerationLayer.generateCues(words, wordsPerCue=6)
        │         Algorithm:
        │         ├─ Batch words into groups of N (default: 6)
        │         ├─ Force-break at natural pauses > PAUSE_BREAK_MS
        │         ├─ Clamp endMs so cues don't overlap
        │         └─ Adds TAIL_PADDING_MS to each cue end
        │         └── Saves SubtitleCues to DB
        │
        └─ Emits SSE events at every stage → frontend PipelineProgressBanner updates live
            stage: EXTRACTING_AUDIO (40%) → TRANSCRIBING (75%) → TRANSCRIBED (100%)
```

---

## 6. Pipeline 2 — Subtitle Editing (Canvas Editor)

After transcription, the user goes to `http://localhost:3000/project/<id>`. Everything here is real-time WYSIWYG.

```
Browser loads /project/<id>
        │
        ▼
GET /xam/videos/:id
  └── Returns: { project, cues[], style?, words[] }
        │
        ▼
Studio Page renders 4 panels:
  ┌──────────────────────────────────────────────────────────┐
  │  1. VideoPreviewPlayer                                   │
  │     └── <video src="/xam/videos/:id/stream">            │
  │          └── Streams original video from storagePath     │
  │                                                          │
  │     InteractiveCanvasOverlay (layered on top of video)  │
  │     ├── Shows current subtitle cue text                  │
  │     ├── Drag Handle → mousemove → posX/posY %           │
  │     │    └── PATCH /xam/videos/:id/style {positionX, Y} │
  │     ├── Resize Handle → drag down/up → fontSize          │
  │     │    └── PATCH /xam/videos/:id/style {fontSizePx}   │
  │     └── Rotate Handle → angle math → rotationDeg        │
  │          └── PATCH /xam/videos/:id/style {rotationDeg}  │
  │                                                          │
  │  2. CanvasFloatingToolbar (below video)                  │
  │     ├── Font picker → PATCH /style {fontFileName}        │
  │     ├── Font size slider → PATCH /style {fontSizePx}     │
  │     ├── Color pickers (font, outline, bg)                │
  │     ├── Bold / Italic / Uppercase toggles                │
  │     ├── Stroke width + position (Inside/Outside/Center)  │
  │     ├── Background box toggle + opacity                  │
  │     └── Reset All to Defaults                            │
  │                                                          │
  │  3. TranscriptEditorPanel (bottom drawer)                │
  │     ├── Shows all cues as time-stamped cards             │
  │     ├── Click cue → seeks video to that timestamp        │
  │     ├── Edit cue text inline                             │
  │     │    └── PATCH /xam/videos/:id/cues/:cueId           │
  │     ├── Delete cue → DELETE /xam/videos/:id/cues/:cueId  │
  │     ├── Add new cue → POST /xam/videos/:id/cues          │
  │     └── Regenerate cues (change wordsPerCue)             │
  │          └── POST /xam/videos/:id/cues/regenerate        │
  │               └── SubtitleService.regenerateCues()       │
  │                    └── Re-runs CueGenerationLayer        │
  │                         on saved TranscriptWords         │
  │                                                          │
  │  4. PipelineProgressBanner (SSE listener)                │
  │     └── SSE EventSource → /xam/videos/:id/progress      │
  │          └── Auto-hides once status = TRANSCRIBED        │
  └──────────────────────────────────────────────────────────┘
```

### WYSIWYG Canvas Overlay — How It Works

The canvas is an absolutely-positioned `<div>` that sits on top of the `<video>` element, matching its dimensions.

```
containerScale = containerHeight / 540     ← 540px is the reference height
displayFontSize = fontSizePx * containerScale

posX/posY stored as 0–100% of container dimensions
  → CSS: left: `${posX}%`, top: `${posY}%`

On drag end → PATCH /style { positionX, positionY, fontSizePx }

Live refs (currentPosRef, currentSizeRef, currentRotateRef) prevent
stale closure bugs during mousemove → mouseup event sequences.
```

---

## 7. Pipeline 3 — Export & FFmpeg Rendering

Triggered when the user clicks **Export Video** and submits the export form.

```
User clicks "Export Video"
        │
        ▼
POST /xam/videos/:id/export
  Body: { mode: 'OVERLAY' | 'CAPTIONS_ONLY', format: 'MP4_H265' | 'MOV',
          backgroundHex?, includeAudio? }
        │
        ▼
[ExportController.createExport]
  1. ExportJobRepository.create() → saves ExportJob row (status=QUEUED)
  2. orchestrator.startExport(job.id)  ← fire-and-forget background
  3. Returns { jobId, status: 'QUEUED' } to browser immediately
        │
        ▼ (background)
[ExportOrchestrator.startExport]
        │
        ├─ Step 1: Build .ass Subtitle Script
        │    └── AssBuilderLayer.buildAssFile(cues, style, exportDir, dimensions)
        │         ├── Reads all cues + style from DB (via ExportJob relation)
        │         ├── Calculates WYSIWYG scaling:
        │         │    scaleFactor = videoHeight / 540
        │         │    assFontSize = fontSizePx * scaleFactor
        │         │    assOutlineWidth = outlineWidthPx * scaleFactor
        │         ├── posX = (positionX / 100) * videoWidth
        │         ├── posY = (positionY / 100) * videoHeight
        │         ├── Builds ASS header + per-cue Dialogue lines with timing
        │         └── Writes → storage/exports/<videoId>/subtitles.ass
        │
        ├─ Step 2: FFmpeg Rendering
        │
        │    Mode A: OVERLAY (burn subs on top of original video)
        │    └── OverlayRenderLayer.render(videoPath, assPath, outputPath)
        │         Try: ffmpeg -i video.mp4 -vf "subtitles='subs.ass':fontsdir='...'"
        │               -c:v h264_nvenc -preset p1 -cq 20 -c:a aac -b:a 192k out.mp4
        │         Fallback: -c:v libx264 -preset ultrafast -crf 20
        │
        │    Mode B: CAPTIONS_ONLY (subs on solid color background, original audio optional)
        │    └── CaptionsOnlyRenderLayer.render(videoPath, assPath, outputPath, options)
        │         Input: lavfi color=c=black:s=WxH:r=FPS:d=DURATION (generated background)
        │         Maps: 0:v (blank background) + optional 1:a (original audio)
        │         Try: h264_nvenc / Fallback: libx264 ultrafast
        │
        ├─ Real-time progress via FfmpegRunnerHelper.runWithProgress()
        │    └── Spawns ffmpeg process (child_process.spawn)
        │         Parses stderr for: time=HH:MM:SS.ms
        │         Calculates: pct = 30 + (currentMs / durationMs) * 65  (capped 30–98%)
        │         Emits progress → ExportOrchestrator → SSE → ExportPanel progress bar
        │
        └─ Step 3: Complete
             ExportJobRepository.updateComplete(jobId, outputPath)
             SSE: { type: 'done', progressPct: 100, outputPath }
             Browser: "Download" button appears
                  └── GET /xam/exports/:jobId/download
                       └── res.download(outputPath, filename)
```

---

## 8. Frontend Architecture (Next.js)

```
client/app/
├── page.tsx                        ← Home Page
│   ├── UploadDropzone              ← Drag-drop or file picker → POST /videos/upload
│   ├── ProjectList                 ← GET /videos → shows all projects with Edit/Delete
│   └── "Clean Storage Junk" btn   ← POST /videos/storage/clean-junk
│
└── project/[id]/
    ├── page.tsx                    ← Studio Editor Page (main layout)
    │
    └── _components/
        ├── video-preview-player.tsx
        │   └── <video> + InteractiveCanvasOverlay (stacked)
        │
        ├── interactive-canvas-overlay.tsx     ← Drag/Resize/Rotate subtitle box
        │   ├── Drag: mousemove delta → posX/posY % → PATCH /style
        │   ├── Resize: vertical drag → fontSize → PATCH /style
        │   └── Rotate: angle from center → rotationDeg → PATCH /style
        │
        ├── canvas-floating-toolbar.tsx        ← All style controls
        │   ├── Font Family (FontSelect component → GET /fonts)
        │   ├── Font Size slider (8–400px)
        │   ├── Colors (font / outline / background)
        │   ├── Stroke: width + position (Inside/Outside/Center)
        │   ├── Background box + opacity
        │   ├── Bold / Italic / Uppercase
        │   └── Reset All to Defaults
        │
        ├── transcript-editor-panel.tsx        ← Cue list with inline edit
        │   ├── Displays all cues as clickable time-stamped cards
        │   ├── Click → seeks video
        │   ├── Edit text → PATCH /videos/:id/cues/:cueId
        │   ├── Delete → DELETE /videos/:id/cues/:cueId
        │   └── Regenerate → POST /videos/:id/cues/regenerate
        │
        ├── pipeline-progress-banner.tsx       ← SSE status banner
        │   └── EventSource /videos/:id/progress → live stage + % bar
        │
        ├── export-panel.tsx                   ← Export form + SSE progress bar
        │   ├── Mode: Overlay / Captions Only
        │   ├── Format: MP4 / MOV
        │   ├── POST /videos/:id/export → returns { jobId }
        │   └── EventSource /exports/:jobId/progress → live % bar
        │
        └── font-select.tsx                    ← Font picker dropdown
            └── GET /fonts → lists all .ttf/.otf files from client/public/lang/
```

---

## 9. Real-Time SSE Event Streams

SubtitleStudio uses **Server-Sent Events (SSE)** for all live progress updates. No WebSockets.

### Pipeline Progress (Upload → Transcription)

```
Endpoint: GET /xam/videos/:id/progress

Event Shape:
  { type: 'stage', stage: 'EXTRACTING_AUDIO' | 'TRANSCRIBING' | 'TRANSCRIBED' }
  { type: 'done', wordCount: number }
  { type: 'error', message: string }

Frontend Consumer: PipelineProgressBanner.tsx
  └── new EventSource(url)
       └── onmessage → updates progress bar (40% → 75% → 100%)
```

### Export Progress (FFmpeg Rendering)

```
Endpoint: GET /xam/exports/:jobId/progress

Event Shape:
  { type: 'progress', progressPct: number }   ← real-time from FFmpeg stderr
  { type: 'done', progressPct: 100, outputPath: string }
  { type: 'error', message: string }

Frontend Consumer: ExportPanel.tsx
  └── new EventSource(url) after POST /export
       └── onmessage → updates progress bar (10% → 25% → real-time 30–98% → 100%)
```

### How It Works (NestJS Side)

```
ExportOrchestrator
  └── Map<jobId, Subject<ExportProgressEvent>>   ← RxJS Subject per job
       └── getEventStream(jobId) → Observable
            └── ExportController @Sse('/exports/:jobId/progress')
                 └── pipe(map(event => ({ data: event })))
                      └── NestJS serializes as text/event-stream to browser
```

---

## 10. AI Transcription Microservice (Python)

```
transcription-service/main.py
  └── FastAPI app on :8001

Startup:
  └── Background thread immediately loads WhisperModel(MODEL_SIZE, device, compute_type)
       → WHISPER_MODEL env var (default: 'base')
       → DEVICE env var (default: 'cuda', falls back to 'cpu' on error)
       → COMPUTE_TYPE env var (default: 'int8_float16')

Endpoints:
  GET /health
    └── { status, model, device, model_loaded, is_loading }

  POST /transcribe  (multipart: file=<audio.wav> OR audio_path=<string>)
    └── model.transcribe(path, word_timestamps=True, beam_size=5, vad_filter=True)
         └── Yields segments → words → [{word, start_ms, end_ms}]
         └── Returns: { words: WordTimestamp[], language: string }

NestJS calls this via TranscriptionClientProvider:
  └── axios.post(url, formData)  ← streams audio.wav as multipart
       └── Timeout: 600 seconds (10 minutes for large files)
```

---

## 11. WYSIWYG Scaling Formula

The key challenge: subtitle font sizes look correct in the browser preview but must scale to match in the exported video at any resolution.

```
Reference Height: 540px  (defined in both frontend and backend)

─── Canvas Preview (browser) ────────────────────────────────────
containerHeight = actual pixel height of the video container div
containerScale = containerHeight / 540
displayFontSize = fontSizePx * containerScale  → CSS fontSize

─── ASS Export (server) ─────────────────────────────────────────
videoHeight = actual video file height (e.g., 1080, 1920, 2160)
scaleFactor = videoHeight / 540
assFontSize = fontSizePx * scaleFactor
assOutlineWidth = outlineWidthPx * scaleFactor

─── Position Mapping ─────────────────────────────────────────────
Stored as: positionX (0–100%), positionY (0–100%)

Browser: left = posX%, top = posY% of container
Export:  posX = (positionX / 100) * videoWidth
         posY = (positionY / 100) * videoHeight

─── Result ──────────────────────────────────────────────────────
A 42px font at position (50%, 80%) on a 540px preview container
maps exactly to the same visual proportion on a 1920x1080 export,
a 1080x1920 vertical reel, or a 4K video.
```

---

## 12. Storage Layout

```
storage/
├── temp/                          ← Multer staging area (files moved out immediately)
│
├── uploads/
│   └── <videoId>/
│       ├── original.mp4           ← Source video file
│       └── audio.wav              ← Extracted mono 16kHz WAV (cleaned by junk cleaner)
│
└── exports/
    └── <videoId>/
        ├── subtitles.ass          ← Generated ASS script (cleaned by junk cleaner)
        └── <exportJobId>.mp4      ← Final rendered output
```

---

## 13. API Endpoint Reference

All endpoints are prefixed with `/xam/`.

### Videos

| Method | Path | Description |
|---|---|---|
| `POST` | `/videos/upload` | Upload a video file (multipart) |
| `GET` | `/videos` | List all video projects |
| `GET` | `/videos/:id` | Get project with cues, style, words |
| `GET` | `/videos/:id/stream` | Stream original video file |
| `DELETE` | `/videos/:id` | Delete project + all associated files |
| `POST` | `/videos/:id/retry` | Re-run the transcription pipeline |
| `SSE` | `/videos/:id/progress` | Live pipeline stage updates |
| `POST` | `/videos/storage/clean-junk` | Delete temp audio, old renders, orphan files |

### Subtitles

| Method | Path | Description |
|---|---|---|
| `POST` | `/videos/:id/cues` | Create a new subtitle cue |
| `PATCH` | `/videos/:id/cues/:cueId` | Edit cue text / timestamps |
| `DELETE` | `/videos/:id/cues/:cueId` | Delete a cue |
| `POST` | `/videos/:id/cues/regenerate` | Re-group all words into cues |
| `PATCH` | `/videos/:id/style` | Update any style property |

### Export

| Method | Path | Description |
|---|---|---|
| `POST` | `/videos/:id/export` | Create export job (starts rendering) |
| `SSE` | `/exports/:jobId/progress` | Live FFmpeg render progress |
| `GET` | `/exports/:jobId/download` | Download the rendered output file |

### Fonts

| Method | Path | Description |
|---|---|---|
| `GET` | `/fonts` | List all fonts from `client/public/lang/` |

---

## 14. Data Flow Diagram

```
┌──────────┐   ① Upload MP4      ┌──────────────┐
│          │ ─────────────────── ▶│              │
│  Browser │                      │  NestJS API  │
│          │ ◀─────────────────── │  :3336       │
│  Next.js │   ② { id, UPLOADED } │              │
│  :3000   │                      │   ┌──────────┤
│          │   ③ SSE /progress    │   │ Pipeline │
│          │ ◀─────────────────── │   │Orchestr. │
│ Pipeline │   stage events       │   └────┬─────┤
│  Banner  │                      │        │     │
└──────────┘                      └────────┼─────┘
                                           │ ④ POST /transcribe
                                           │   (audio.wav)
                                           ▼
                                  ┌──────────────┐
                                  │  Python AI   │
                                  │  :8001       │
                                  │  Whisper     │
                                  └──────┬───────┘
                                         │ ⑤ [{word, startMs, endMs}]
                                         ▼
                                  ┌──────────────┐
                                  │  PostgreSQL  │
                                  │  TranscriptWords │
                                  │  SubtitleCues│
                                  └──────────────┘

                                        ⋮ (user edits in canvas)

┌──────────┐   ⑥ POST /export    ┌──────────────┐
│  Export  │ ─────────────────── ▶│  NestJS API  │
│  Panel   │                      │              │
│          │ ◀─────────────────── │  ┌───────────┤
│          │   { jobId, QUEUED }  │  │  Export   │
│          │                      │  │  Orchestr.│
│          │   ⑦ SSE progress     │  └────┬──────┤
│          │ ◀─────────────────── │       │      │
│  % bar   │   10%→25%→98%→100%  │       │ ⑧ AssBuilder
│          │                      │       │      │
│          │   ⑨ download link   │       ▼      │
│          │ ◀─────────────────── │   FFmpeg     │
└──────────┘   GET /download      │  NVENC/x264  │
                                  └──────────────┘
```

---

> **Tip for contributors**: Start with `video-pipeline.orchestrator.ts` and `export.orchestrator.ts` — these two files are the heart of the system and orchestrate every major pipeline. Everything else (layers, helpers, repositories) plugs into them.
