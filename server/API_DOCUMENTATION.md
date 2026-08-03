# API Documentation

## Table of Contents

### App

- **GET** `/xam` - [/xam](#get--xam)

### Export

- **POST** `/xam/videos/{id}/export` - [/xam/videos/{id}/export](#post--xam-videos--id--export)
- **GET** `/xam/exports/{jobId}/progress` - [/xam/exports/{jobId}/progress](#get--xam-exports--jobid--progress)
- **GET** `/xam/exports/{jobId}/download` - [/xam/exports/{jobId}/download](#get--xam-exports--jobid--download)

### Fonts

- **GET** `/xam/fonts` - [/xam/fonts](#get--xam-fonts)

### Subtitles

- **POST** `/xam/subtitles/batch/extract` - [/xam/subtitles/batch/extract](#post--xam-subtitles-batch-extract)
- **POST** `/xam/subtitles/batch/merge` - [/xam/subtitles/batch/merge](#post--xam-subtitles-batch-merge)
- **GET** `/xam/subtitles/project/{id}/export` - [/xam/subtitles/project/{id}/export](#get--xam-subtitles-project--id--export)
- **POST** `/xam/subtitles/{id}/cues` - [/xam/subtitles/{id}/cues](#post--xam-subtitles--id--cues)
- **PATCH** `/xam/subtitles/{id}/cues/{cueId}` - [/xam/subtitles/{id}/cues/{cueId}](#patch--xam-subtitles--id--cues--cueid-)
- **DELETE** `/xam/subtitles/{id}/cues/{cueId}` - [/xam/subtitles/{id}/cues/{cueId}](#delete--xam-subtitles--id--cues--cueid-)
- **POST** `/xam/subtitles/{id}/cues/regenerate` - [/xam/subtitles/{id}/cues/regenerate](#post--xam-subtitles--id--cues-regenerate)
- **PATCH** `/xam/subtitles/{id}/style` - [/xam/subtitles/{id}/style](#patch--xam-subtitles--id--style)

### Videos

- **POST** `/xam/videos/storage/clean-junk` - [/xam/videos/storage/clean-junk](#post--xam-videos-storage-clean-junk)
- **POST** `/xam/videos/queue/clear-all` - [/xam/videos/queue/clear-all](#post--xam-videos-queue-clear-all)
- **POST** `/xam/videos/upload` - [/xam/videos/upload](#post--xam-videos-upload)
- **GET** `/xam/videos` - [/xam/videos](#get--xam-videos)
- **GET** `/xam/videos/{id}` - [/xam/videos/{id}](#get--xam-videos--id-)
- **DELETE** `/xam/videos/{id}` - [/xam/videos/{id}](#delete--xam-videos--id-)
- **GET** `/xam/videos/{id}/stream` - [/xam/videos/{id}/stream](#get--xam-videos--id--stream)
- **POST** `/xam/videos/{id}/retry` - [/xam/videos/{id}/retry](#post--xam-videos--id--retry)
- **POST** `/xam/videos/{id}/retranscribe` - [/xam/videos/{id}/retranscribe](#post--xam-videos--id--retranscribe)
- **POST** `/xam/videos/{id}/reset` - [/xam/videos/{id}/reset](#post--xam-videos--id--reset)
- **GET** `/xam/videos/{id}/progress` - [/xam/videos/{id}/progress](#get--xam-videos--id--progress)

---

## Endpoints

## App

### /xam

**GET** `/xam`

**Responses:**

**200** - 

---

## Export

### /xam/videos/{id}/export

**POST** `/xam/videos/{id}/export`

**Parameters:**

- `id` (path) - 

**Request Body:**

```json
{}
```

**Responses:**

**201** - 

---

### /xam/exports/{jobId}/progress

**GET** `/xam/exports/{jobId}/progress`

**Parameters:**

- `jobId` (path) - 

**Responses:**

**200** - 

---

### /xam/exports/{jobId}/download

**GET** `/xam/exports/{jobId}/download`

**Parameters:**

- `jobId` (path) - 

**Responses:**

**200** - 

---

## Fonts

### /xam/fonts

**GET** `/xam/fonts`

**Responses:**

**200** - 

---

## Subtitles

### /xam/subtitles/batch/extract

**POST** `/xam/subtitles/batch/extract`

**Request Body:**

```json
{
  "videoProjectIds": [
    "vid_1",
    "vid_2"
  ],
  "format": null,
  "language": "hi"
}
```

**Responses:**

**201** - 

---

### /xam/subtitles/batch/merge

**POST** `/xam/subtitles/batch/merge`

**Request Body:**

```json
{
  "videoProjectIds": [
    "vid_1",
    "vid_2"
  ],
  "format": null
}
```

**Responses:**

**201** - 

---

### /xam/subtitles/project/{id}/export

**GET** `/xam/subtitles/project/{id}/export`

**Parameters:**

- `id` (path) - 
- `format` (query) - 

**Responses:**

**200** - 

---

### /xam/subtitles/{id}/cues

**POST** `/xam/subtitles/{id}/cues`

**Parameters:**

- `id` (path) - 

**Request Body:**

```json
{}
```

**Responses:**

**201** - 

---

### /xam/subtitles/{id}/cues/{cueId}

**PATCH** `/xam/subtitles/{id}/cues/{cueId}`

**Parameters:**

- `cueId` (path) - 

**Request Body:**

```json
{}
```

**Responses:**

**200** - 

---

### /xam/subtitles/{id}/cues/{cueId}

**DELETE** `/xam/subtitles/{id}/cues/{cueId}`

**Parameters:**

- `cueId` (path) - 

**Responses:**

**200** - 

---

### /xam/subtitles/{id}/cues/regenerate

**POST** `/xam/subtitles/{id}/cues/regenerate`

**Parameters:**

- `id` (path) - 

**Request Body:**

```json
{}
```

**Responses:**

**201** - 

---

### /xam/subtitles/{id}/style

**PATCH** `/xam/subtitles/{id}/style`

**Parameters:**

- `id` (path) - 

**Request Body:**

```json
{}
```

**Responses:**

**200** - 

---

## Videos

### /xam/videos/storage/clean-junk

**POST** `/xam/videos/storage/clean-junk`

**Responses:**

**201** - 

---

### /xam/videos/queue/clear-all

**POST** `/xam/videos/queue/clear-all`

**Responses:**

**201** - 

---

### /xam/videos/upload

**POST** `/xam/videos/upload`

**Responses:**

**201** - 

---

### /xam/videos

**GET** `/xam/videos`

**Responses:**

**200** - 

---

### /xam/videos/{id}

**GET** `/xam/videos/{id}`

**Parameters:**

- `id` (path) - 

**Responses:**

**200** - 

---

### /xam/videos/{id}

**DELETE** `/xam/videos/{id}`

**Parameters:**

- `id` (path) - 

**Responses:**

**200** - 

---

### /xam/videos/{id}/stream

**GET** `/xam/videos/{id}/stream`

**Parameters:**

- `id` (path) - 

**Responses:**

**200** - 

---

### /xam/videos/{id}/retry

**POST** `/xam/videos/{id}/retry`

**Parameters:**

- `id` (path) - 

**Responses:**

**201** - 

---

### /xam/videos/{id}/retranscribe

**POST** `/xam/videos/{id}/retranscribe`

**Parameters:**

- `id` (path) - 

**Responses:**

**201** - 

---

### /xam/videos/{id}/reset

**POST** `/xam/videos/{id}/reset`

**Parameters:**

- `id` (path) - 

**Responses:**

**201** - 

---

### /xam/videos/{id}/progress

**GET** `/xam/videos/{id}/progress`

**Parameters:**

- `id` (path) - 

**Responses:**

**200** - 

---

