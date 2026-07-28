import os
import logging
import threading
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("transcription-service")

app = FastAPI(title="Faster-Whisper Local Transcription Service")

MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")
DEVICE = os.getenv("DEVICE", "cuda")
COMPUTE_TYPE = os.getenv("COMPUTE_TYPE", "int8_float16")

model_instance: Optional[WhisperModel] = None
is_loading = False

def load_model_bg():
    global model_instance, is_loading
    if model_instance is not None or is_loading:
        return
    is_loading = True
    selected_device = DEVICE
    selected_compute = COMPUTE_TYPE

    try:
        logger.info(f"Loading faster-whisper model '{MODEL_SIZE}' on {selected_device} ({selected_compute})...")
        model_instance = WhisperModel(MODEL_SIZE, device=selected_device, compute_type=selected_compute)
        logger.info(f"Model '{MODEL_SIZE}' loaded successfully on GPU/specified device.")
    except Exception as e:
        logger.warning(f"Failed to load model on {selected_device} ({e}). Falling back to CPU (int8)...")
        selected_device = "cpu"
        selected_compute = "int8"
        try:
            model_instance = WhisperModel(MODEL_SIZE, device=selected_device, compute_type=selected_compute)
            logger.info(f"Model '{MODEL_SIZE}' loaded successfully on CPU fallback.")
        except Exception as err:
            logger.error(f"Failed to load model on CPU fallback: {err}")
    finally:
        is_loading = False

def get_model() -> WhisperModel:
    global model_instance
    if model_instance is None:
        load_model_bg()
    if model_instance is None:
        raise HTTPException(status_code=503, detail="Whisper model is still loading, please retry in a few seconds")
    return model_instance

@app.on_event("startup")
async def startup_event():
    logger.info("Service starting up, initiating background load for Whisper model...")
    thread = threading.Thread(target=load_model_bg, daemon=True)
    thread.start()

class WordTimestamp(BaseModel):
    word: str
    start_ms: int
    end_ms: int

class TranscribeResponse(BaseModel):
    words: List[WordTimestamp]
    language: Optional[str] = None

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model": MODEL_SIZE,
        "device": DEVICE,
        "model_loaded": model_instance is not None,
        "is_loading": is_loading
    }

@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file: Optional[UploadFile] = File(None),
    audio_path: Optional[str] = Form(None)
):
    target_path = audio_path

    if file:
        temp_dir = "/tmp/transcribe"
        os.makedirs(temp_dir, exist_ok=True)
        target_path = os.path.join(temp_dir, file.filename)
        with open(target_path, "wb") as f:
            f.write(await file.read())

    if not target_path or not os.path.exists(target_path):
        raise HTTPException(status_code=400, detail="Audio file path or upload file is required and must exist")

    logger.info(f"Transcribing audio file: {target_path}")

    try:
        model = get_model()
        segments, info = model.transcribe(
            target_path,
            word_timestamps=True,
            beam_size=5,
            vad_filter=True
        )

        words_result: List[WordTimestamp] = []
        for segment in segments:
            if segment.words:
                for word_info in segment.words:
                    clean_word = word_info.word.strip()
                    if clean_word:
                        words_result.append(
                            WordTimestamp(
                                word=clean_word,
                                start_ms=int(round(word_info.start * 1000)),
                                end_ms=int(round(word_info.end * 1000))
                            )
                        )

        logger.info(f"Transcription complete. Generated {len(words_result)} words.")
        return TranscribeResponse(
            words=words_result,
            language=info.language
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
