import os
import json
import logging
import threading
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("transcription-service")

app = FastAPI(title="Faster-Whisper Local Transcription Service")

MODEL_SIZE = os.getenv("WHISPER_MODEL", "large-v3-turbo")
DEVICE = os.getenv("DEVICE", "cuda")
COMPUTE_TYPE = os.getenv("COMPUTE_TYPE", "int8_float16")

model_instance: Optional[WhisperModel] = None
is_loading = False

current_abort_event: Optional[threading.Event] = None
abort_lock = threading.Lock()

def load_model_bg():
    global model_instance, is_loading
    if model_instance is not None or is_loading:
        return
    is_loading = True

    # High-accuracy model candidates for Hindi / Hinglish code-switching
    models_to_try = [MODEL_SIZE]
    if MODEL_SIZE != "large-v3-turbo":
        models_to_try.append("large-v3-turbo")
    if "medium" not in models_to_try:
        models_to_try.append("medium")

    for target_model in models_to_try:
        try:
            logger.info(f"Loading faster-whisper model '{target_model}' on {DEVICE} ({COMPUTE_TYPE})...")
            model_instance = WhisperModel(target_model, device=DEVICE, compute_type=COMPUTE_TYPE)
            logger.info(f"Model '{target_model}' loaded successfully on GPU ({DEVICE}).")
            break
        except Exception as e:
            logger.warning(f"Failed to load model '{target_model}' on GPU ({e}). Trying CPU fallback (int8)...")
            try:
                model_instance = WhisperModel(target_model, device="cpu", compute_type="int8")
                logger.info(f"Model '{target_model}' loaded successfully on CPU (int8).")
                break
            except Exception as err:
                logger.error(f"Failed to load model '{target_model}' on CPU fallback: {err}")

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
    device: Optional[str] = None

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model": MODEL_SIZE,
        "device": DEVICE,
        "model_loaded": model_instance is not None,
        "is_loading": is_loading
    }

@app.post("/cancel")
def cancel_active_transcription():
    global current_abort_event
    with abort_lock:
        if current_abort_event is not None:
            current_abort_event.set()
            logger.info("Signaled abort to active transcription task.")
            return {"status": "cancelled"}
    return {"status": "no_active_task"}

def resolve_target_and_kwargs(
    file: Optional[UploadFile],
    audio_path: Optional[str],
    language: Optional[str],
    initial_prompt: Optional[str]
):
    target_path = audio_path
    if file:
        temp_dir = "/tmp/transcribe"
        os.makedirs(temp_dir, exist_ok=True)
        target_path = os.path.join(temp_dir, file.filename)
        with open(target_path, "wb") as f:
            f.write(file.file.read())

    if not target_path or not os.path.exists(target_path):
        raise HTTPException(status_code=400, detail="Audio file path or upload file is required and must exist")

    target_language: Optional[str] = None
    target_prompt: Optional[str] = initial_prompt

    kwargs = {
        "word_timestamps": True,
        "beam_size": 5,
        "vad_filter": True,
        "task": "transcribe"
    }

    if language and language.strip().lower() != "auto":
        clean_lang = language.strip().lower()
        if clean_lang in ["en-translate", "translate-en", "en"]:
            kwargs["task"] = "translate"
            logger.info("Setting Whisper task to 'translate' (Translating audio to English subtitles)")
        elif "hi-roman" in clean_lang or "hinglish" in clean_lang:
            target_language = "hi"
            if not target_prompt:
                target_prompt = "Namaste dosto, yeh audio Hinglish mein hai aur Roman script mein likha gaya hai."
        elif "hi-strict" in clean_lang or "hi-devanagari" in clean_lang or clean_lang == "hi":
            target_language = "hi"
            if not target_prompt:
                target_prompt = "यह हिंदी भाषा में एक बातचीत है।"
        elif "-" in clean_lang:
            target_language = clean_lang.split("-")[0]
        else:
            target_language = clean_lang

    if target_language and kwargs.get("task") != "translate":
        kwargs["language"] = target_language
    if target_prompt:
        kwargs["initial_prompt"] = target_prompt

    return target_path, kwargs

@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    file: Optional[UploadFile] = File(None),
    audio_path: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    initial_prompt: Optional[str] = Form(None)
):
    target_path, kwargs = resolve_target_and_kwargs(file, audio_path, language, initial_prompt)
    logger.info(f"Transcribing audio file: {target_path} (kwargs: {kwargs})")

    try:
        model = get_model()
        segments, info = model.transcribe(target_path, **kwargs)

        words_result: List[WordTimestamp] = []
        total_duration = info.duration if info and info.duration > 0 else 1.0

        for segment in segments:
            pct = min(99, int((segment.end / total_duration) * 100))
            logger.info(f"Segment progress [{pct}%] [{segment.start:.1f}s -> {segment.end:.1f}s]: {segment.text}")
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

        logger.info(f"Transcription complete. Language: {info.language}. Generated {len(words_result)} words.")
        return TranscribeResponse(
            words=words_result,
            language=info.language,
            device=f"{DEVICE} ({COMPUTE_TYPE})"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.post("/transcribe_stream")
async def transcribe_audio_stream(
    file: Optional[UploadFile] = File(None),
    audio_path: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
    initial_prompt: Optional[str] = Form(None)
):
    global current_abort_event
    with abort_lock:
        if current_abort_event is not None:
            current_abort_event.set()
        current_abort_event = threading.Event()
        my_abort_event = current_abort_event

    target_path, kwargs = resolve_target_and_kwargs(file, audio_path, language, initial_prompt)
    logger.info(f"Streaming transcription for audio file: {target_path} (kwargs: {kwargs})")

    def generate_events():
        try:
            model = get_model()
            segments, info = model.transcribe(target_path, **kwargs)
            total_duration = info.duration if info and info.duration > 0 else 1.0
            words_result = []

            init_data = json.dumps({'type': 'init', 'duration': info.duration, 'language': info.language})
            yield f"data: {init_data}\n\n"

            for segment in segments:
                if my_abort_event.is_set():
                    logger.info("Transcription task aborted during segment processing loop.")
                    yield f"data: {json.dumps({'type': 'error', 'message': 'Transcription task cancelled by user'})}\n\n"
                    return

                pct = min(99, int((segment.end / total_duration) * 100))
                seg_words = []
                if segment.words:
                    for word_info in segment.words:
                        clean_word = word_info.word.strip()
                        if clean_word:
                            w_obj = {
                                "word": clean_word,
                                "start_ms": int(round(word_info.start * 1000)),
                                "end_ms": int(round(word_info.end * 1000))
                            }
                            words_result.append(w_obj)
                            seg_words.append(w_obj)

                event_data = json.dumps({
                    'type': 'segment',
                    'pct': pct,
                    'text': segment.text,
                    'start': segment.start,
                    'end': segment.end,
                    'words': seg_words
                })
                yield f"data: {event_data}\n\n"

            complete_data = json.dumps({
                'type': 'complete',
                'words': words_result,
                'language': info.language
            })
            yield f"data: {complete_data}\n\n"

        except Exception as e:
            logger.error(f"Stream error: {str(e)}", exc_info=True)
            err_data = json.dumps({'type': 'error', 'message': str(e)})
            yield f"data: {err_data}\n\n"

    return StreamingResponse(generate_events(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)
