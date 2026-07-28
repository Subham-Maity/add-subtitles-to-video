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

- **POST** `/xam/videos/{id}/cues` - [/xam/videos/{id}/cues](#post--xam-videos--id--cues)
- **PATCH** `/xam/videos/{id}/cues/{cueId}` - [/xam/videos/{id}/cues/{cueId}](#patch--xam-videos--id--cues--cueid-)
- **DELETE** `/xam/videos/{id}/cues/{cueId}` - [/xam/videos/{id}/cues/{cueId}](#delete--xam-videos--id--cues--cueid-)
- **POST** `/xam/videos/{id}/cues/regenerate` - [/xam/videos/{id}/cues/regenerate](#post--xam-videos--id--cues-regenerate)
- **PATCH** `/xam/videos/{id}/style` - [/xam/videos/{id}/style](#patch--xam-videos--id--style)

### Videos

- **POST** `/xam/videos/storage/clean-junk` - [/xam/videos/storage/clean-junk](#post--xam-videos-storage-clean-junk)
- **POST** `/xam/videos/upload` - [/xam/videos/upload](#post--xam-videos-upload)
- **GET** `/xam/videos` - [/xam/videos](#get--xam-videos)
- **GET** `/xam/videos/{id}` - [/xam/videos/{id}](#get--xam-videos--id-)
- **DELETE** `/xam/videos/{id}` - [/xam/videos/{id}](#delete--xam-videos--id-)
- **GET** `/xam/videos/{id}/stream` - [/xam/videos/{id}/stream](#get--xam-videos--id--stream)
- **POST** `/xam/videos/{id}/retry` - [/xam/videos/{id}/retry](#post--xam-videos--id--retry)
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

### /xam/videos/{id}/cues

**POST** `/xam/videos/{id}/cues`

**Parameters:**

- `id` (path) - 

**Request Body:**

```json
{}
```

**Responses:**

**201** - 

---

### /xam/videos/{id}/cues/{cueId}

**PATCH** `/xam/videos/{id}/cues/{cueId}`

**Parameters:**

- `cueId` (path) - 

**Request Body:**

```json
{}
```

**Responses:**

**200** - 

---

### /xam/videos/{id}/cues/{cueId}

**DELETE** `/xam/videos/{id}/cues/{cueId}`

**Parameters:**

- `cueId` (path) - 

**Responses:**

**200** - 

---

### /xam/videos/{id}/cues/regenerate

**POST** `/xam/videos/{id}/cues/regenerate`

**Parameters:**

- `id` (path) - 

**Request Body:**

```json
{}
```

**Responses:**

**201** - 

---

### /xam/videos/{id}/style

**PATCH** `/xam/videos/{id}/style`

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

### /xam/videos/{id}/progress

**GET** `/xam/videos/{id}/progress`

**Parameters:**

- `id` (path) - 

**Responses:**

**200** - 

---

