<div align="center">

# SubtitleStudio

### Local AI subtitle burner for reels, shorts, and clips — no cloud, no subscription, no API keys.

<p>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-4ADE80?style=for-the-badge" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 16">
  <img src="https://img.shields.io/badge/NestJS_10-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS 10">
  <img src="https://img.shields.io/badge/Faster--Whisper-FF6F00?style=for-the-badge&logo=openai&logoColor=white" alt="Faster-Whisper">
</p>

<p>
  <a href="https://www.instagram.com/subham_xam/"><img src="https://img.shields.io/badge/Instagram-E4405F?style=flat-square&logo=instagram&logoColor=white" alt="Instagram"></a>
  <a href="https://www.linkedin.com/in/subham-xam/"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white" alt="LinkedIn"></a>
  <a href="https://github.com/Subham-Maity"><img src="https://img.shields.io/badge/GitHub-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub"></a>
</p>

**Built by [Subham Maity](https://github.com/Subham-Maity)**

</div>

---

## 🎥 Demo



https://github.com/user-attachments/assets/3c374096-7a19-4e45-971a-9a865eb7fa17



> Upload a video → AI auto-transcribes with word-level timestamps → Style your subtitles in the Canva-style editor → Export as H.264 MP4 or H.265 MOV. Everything runs locally.

---

## 🤔 Why does this exist?

I genuinely got cooked by Adobe Premiere and CapCut charging like $10–$20/month just to burn subtitles onto a reel. Like... it's FFmpeg under the hood, calm down. So I built this.

You get:
- A **full Canva-style subtitle editor** right in your browser
- **AI-powered word-level transcription** running *100% offline* on your own GPU
- **1-click export** to `.mp4` or `.mov` with H.265 compression that's actually fast
- **Zero cloud. Zero API keys. Zero data leaving your machine. Ever.**

Your data is yours. Period.

| | SubtitleStudio | Adobe Premiere | CapCut Pro |
|---|:---:|:---:|:---:|
| Cost | Free, forever | ~$20/mo | ~$10/mo |
| Runs fully offline | Yes | Partially | No |
| Transcription | Local AI, built in | Manual / paid add-on | Cloud-based |
| Your footage leaves your machine | Never | Depends on plan | Yes |
| Open source | Yes (MIT) | No | No |

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Run in One Command](#run-in-one-command)
  - [Access the App](#access-the-app)
  - [Configuration for Low-End Machines](#configuration-for-low-end-machines)
  - [Stopping the App](#stopping-the-app)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap--good-first-issues)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Features

### Core

- **AI Auto-Transcription** — powered by [faster-whisper](https://github.com/SYSTRAN/faster-whisper) with word-level timestamps
- **Canva-Style Subtitle Editor** — drag, resize, rotate, and reposition subtitles directly on the video canvas
- **Full Style Control** — font, size, color, bold, italic, outline stroke (inside / outside / center), background box, opacity
- **WYSIWYG Preview** — what you see on the canvas is exactly what you get in the export, pixel for pixel
- **Fast Export** — NVIDIA NVENC GPU-accelerated H.264/H.265 rendering, with automatic CPU fallback
- **Real-Time Export Progress** — live SSE progress bar so you're never staring at a frozen screen
- **One-Click Storage Cleaner** — purge temp audio extracts, old renders, and orphaned subtitle files instantly

### Subtitle Styling

| Feature | Details |
|---|---|
| Font | Any font from `client/public/lang/` auto-loads — just drop a `.ttf` or `.otf` file in there |
| Font Size | 8px – 400px with live canvas preview |
| Colors | Font color, outline color, background color |
| Stroke | Width slider with inside / outside / center alignment |
| Background | Toggleable box background with custom opacity |
| Transform | Drag position, resize, and rotate on canvas |
| Text Style | Bold / italic toggles |

> **➕ Adding Custom Fonts**
> Want a specific font on your subtitles? Just download the `.ttf` or `.otf` file and drop it into:
> ```
> client/public/lang/
> ```
> That's it — no config, no restart needed (in dev mode). The font picker in the editor will automatically detect and show all fonts in that folder. Currently ships with `BalooBhai2`, `Ranch Mails`, and `Singsong` out of the box.

### Export Formats

| Format | Codec | Notes |
|---|---|---|
| `.mp4` | H.264 (NVENC / x264) | Universal compatibility |
| `.mov` | H.265 / HEVC (NVENC / libx265) | Smaller file size, higher quality |

---

## Tech Stack

<p>
  <img src="https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" alt="NestJS">
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/FFmpeg-007808?style=flat-square&logo=ffmpeg&logoColor=white" alt="FFmpeg">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker">
</p>

| Layer | Tech |
|---|---|
| **Frontend** | Next.js 16, React, TypeScript, vanilla CSS |
| **Backend** | NestJS 10, TypeScript, Prisma ORM |
| **AI Engine** | Python, FastAPI, faster-whisper (large-v3) |
| **Video Processing** | FFmpeg (NVENC GPU + CPU fallback) |
| **Database** | PostgreSQL (via Prisma) |
| **Containerization** | Docker Compose |

---

## Getting Started

### Prerequisites

You need **Docker** and **Docker Compose** installed. That's the entire requirement.

<p>
  <img src="https://img.shields.io/badge/Linux-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux">
  <img src="https://img.shields.io/badge/Windows-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows">
  <img src="https://img.shields.io/badge/macOS-000000?style=for-the-badge&logo=apple&logoColor=white" alt="macOS">
</p>

| Platform | Install |
|---|---|
| Linux | [Install Docker Engine](https://docs.docker.com/engine/install/) |
| Windows | [Install Docker Desktop](https://docs.docker.com/desktop/install/windows-install/) |
| macOS | [Install Docker Desktop](https://docs.docker.com/desktop/install/mac-install/) |

Confirm it's working:

```bash
docker --version
docker compose version
```

> **Have an NVIDIA GPU?** Install the [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) to enable GPU-accelerated transcription and export. Not required — CPU fallback kicks in automatically.

### Run in One Command

**Linux / macOS**

```bash
git clone https://github.com/Subham-Maity/add-subtitles-to-video.git
cd add-subtitles-to-video
./start.sh
```

**Windows (PowerShell or Command Prompt)**

```cmd
git clone https://github.com/Subham-Maity/add-subtitles-to-video.git
cd add-subtitles-to-video
start.bat
```

**Universal (with Node / npm installed)**

```bash
npm start
```

**Raw Docker Compose**

```bash
docker compose up --build
```

The first run downloads the Whisper model, so it takes a few minutes — go make a coffee. Every run after that starts almost instantly.

### Access the App

| Service | URL |
|---|---|
| Web App | http://localhost:3000 |
| API Server | http://localhost:3336 |
| Transcription AI | http://localhost:8001 |

### Configuration for Low-End Machines

If your machine isn't the beefiest, tune the Whisper model size in `docker-compose.yml`:

```yaml
environment:
  - WHISPER_MODEL=base      # tiny | base | small | medium | large-v3
  - COMPUTE_TYPE=int8       # int8 (CPU-safe) | int8_float16 | float16 (GPU)
  - DEVICE=cpu              # cpu | cuda (needs an NVIDIA GPU)
```

| Model | VRAM / RAM | Speed | Accuracy |
|---|---|---|---|
| `tiny` | ~1 GB | Fastest | Decent |
| `base` | ~1.5 GB | Fast | Good |
| `small` | ~2.5 GB | Moderate | Better |
| `medium` | ~5 GB | Slower | Great |
| `large-v3` | ~10 GB | Slowest | Best |

Default is `base` for broad compatibility. Switch to `large-v3` if you have the VRAM and want the cleanest transcriptions.

### Stopping the App

```bash
docker compose down
```

Nuclear option — wipe all volumes and containers:

```bash
docker compose down --volumes --remove-orphans
```

---

## Project Structure

```
add-subtitles-to-video/
├── client/                # Next.js frontend
│   ├── app/
│   │   ├── page.tsx       # Home page (upload + project list)
│   │   └── project/[id]/  # Editor page (canvas + toolbar + export)
│   └── Dockerfile
├── server/                # NestJS backend
│   ├── src/
│   │   ├── videos/        # Upload, pipeline, project CRUD
│   │   ├── subtitles/     # Cue & style management
│   │   └── export/        # FFmpeg rendering pipeline
│   └── Dockerfile
├── transcription-service/ # Python FastAPI + faster-whisper
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
├── storage/                # Local file storage (gitignored)
├── docker-compose.yml      # Single-command orchestration
├── start.sh                # Linux/Mac launcher
├── start.bat                # Windows launcher
└── package.json             # npm start shortcut
```

---

## Roadmap / Good First Issues

Want to contribute? Pick one of these and go for it:

- [ ] **Multi-language UI** — i18n support for Japanese, Spanish, Hindi, and more
- [ ] **Subtitle Translation** — auto-translate transcribed subtitles via LibreTranslate (still fully offline)
- [ ] **Multiple Subtitle Tracks** — burn 2+ subtitle tracks at once (bilingual reels)
- [ ] **Subtitle Templates** — save and reuse style presets (Netflix-style, YouTube-style, etc.)
- [ ] **Batch Processing** — upload 10 videos, auto-subtitle all of them overnight
- [ ] **SRT / VTT Import** — import existing subtitle files instead of auto-transcribing
- [ ] **SRT / VTT Export** — export subtitles as a standalone `.srt` or `.vtt` file
- [ ] **Speaker Diarization** — detect who's speaking and color-code subtitles by speaker
- [ ] **Karaoke Mode** — highlight the current word while playing, TikTok-style
- [ ] **Waveform Scrubber** — audio waveform timeline for precision subtitle editing
- [ ] **Mobile UI** — responsive layout for editing on tablets and phones
- [ ] **Apple Silicon GPU Support** — MLX or CoreML backend for M1/M2 acceleration
- [ ] **Dark Mode**

---

## Contributing

PRs are welcome — this is open source, not a closed beta.

1. Fork the repo
2. Create your branch: `git checkout -b feat/your-cool-feature`
3. Commit: `git commit -m 'feat: add your cool feature'`
4. Push: `git push origin feat/your-cool-feature`
5. Open a Pull Request

Please don't open a PR with zero description — leave a note on what it does and why.

---

## License

Released under the **MIT License** — use it, modify it, ship it. Just don't repackage it as a paid SaaS charging $20/month for the exact thing this repo gives away free.

See [LICENSE](LICENSE) for the full text.

---

## Acknowledgements

This project stands on the shoulders of some excellent open-source work:

- [faster-whisper](https://github.com/SYSTRAN/faster-whisper) — fast Whisper inference, the backbone of the transcription pipeline
- [OpenAI Whisper](https://github.com/openai/whisper) — the original model weights
- [FFmpeg](https://ffmpeg.org/) — the standard for video processing
- [NestJS](https://nestjs.com/) — makes the Node.js backend genuinely pleasant to write
- [Next.js](https://nextjs.org/) — React, but it actually works out of the box
- [Prisma](https://www.prisma.io/) — a type-safe ORM that doesn't make you cry
- [Docker](https://www.docker.com/) — ship it everywhere without the "works on my machine" drama

---

<div align="center">

**Made by [Subham Maity](https://github.com/Subham-Maity)**

<p>
  <a href="https://www.instagram.com/subham_xam/"><img src="https://img.shields.io/badge/Instagram-E4405F?style=flat-square&logo=instagram&logoColor=white" alt="Instagram"></a>
  <a href="https://www.linkedin.com/in/subham-xam/"><img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=flat-square&logo=linkedin&logoColor=white" alt="LinkedIn"></a>
</p>

*If this saved you $10/month, a star on the repo costs nothing and means a lot.*

</div>
