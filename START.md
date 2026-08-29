

### Step 0: Ensure Postgres & Redis are Running (Background)
The NestJS backend requires Postgres and Redis. You can quickly run just the databases via Docker (or use your local installations):
```powershell
docker compose up -d postgres redis
```

---

### 🟢 Terminal 1: Python Transcription Service (Port 8001)

```powershell
cd c:\Github\add-subtitles-to-video\transcription-service

# Activate virtual environment
.\venv\Scripts\activate

# (Optional: install/update dependencies if not already installed)
# pip install -r requirements.txt

# Start the Python FastAPI server
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

---

### 🟢 Terminal 2: Backend (NestJS - Port 3336)

```powershell
cd c:\Github\add-subtitles-to-video\server

# (Optional: install dependencies and generate Prisma client if needed)
# yarn install
# npx prisma generate

# Start NestJS backend in development mode (with hot-reload)
yarn start:dev
```

---

### 🟢 Terminal 3: Frontend (Next.js - Port 3000)

```powershell
cd c:\Github\add-subtitles-to-video\client

# (Optional: install dependencies if needed)
# npm install

# Start Next.js frontend dev server
npm run dev
```



### 🛑 How to Stop
In each terminal window, simply press **`Ctrl + C`** to stop that specific server.