import os
import shutil
import time
import whisper
from backend.core.logging import logger

_whisper_model = None
_model_load_time_ms = 0.0


def ensure_ffmpeg_in_path() -> str:
    """
    Verifies FFmpeg availability using shutil.which("ffmpeg").
    Returns the executable path or raises RuntimeError if missing.
    """
    ffmpeg_path = shutil.which("ffmpeg")
    if not ffmpeg_path:
        logger.error("[FFmpeg] CRITICAL — FFmpeg not found on PATH.")
        raise RuntimeError("FFmpeg not found")
    logger.info(f"[FFmpeg] Binary verified at: {ffmpeg_path}")
    return ffmpeg_path


def get_whisper_model(model_name: str = "tiny"):
    """
    Returns the globally cached Whisper model singleton.
    """
    global _whisper_model, _model_load_time_ms

    if _whisper_model is None:
        start_t = time.perf_counter()
        _whisper_model = whisper.load_model(model_name)
        _model_load_time_ms = round((time.perf_counter() - start_t) * 1000, 1)
        logger.success(f"[Whisper] '{model_name}' loaded in {_model_load_time_ms} ms")

    return _whisper_model


def get_whisper_load_time() -> float:
    return _model_load_time_ms


def format_timestamp(seconds: float) -> str:
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"


def extract_transcript_from_audio(file_path: str) -> dict:
    """
    Transcribes an audio file using standard Whisper integration.
    """
    ffmpeg_path = shutil.which("ffmpeg")
    model_name = "tiny"
    file_exists = os.path.exists(file_path)

    logger.info(
        f"[Whisper] Pre-transcription check:\n"
        f"  FFmpeg Path   : {ffmpeg_path}\n"
        f"  Whisper Model : {model_name}\n"
        f"  Audio Path    : {file_path}\n"
        f"  File Exists   : {file_exists}"
    )

    if not file_exists:
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    if not shutil.which("ffmpeg"):
        raise RuntimeError("FFmpeg not found")

    t_transcribe = time.perf_counter()
    model = whisper.load_model(model_name)
    result = model.transcribe(
        file_path,
        fp16=False
    )
    transcription_time_ms = round((time.perf_counter() - t_transcribe) * 1000, 1)

    segments = []
    total_duration = 0.0
    for seg in result.get("segments", []):
        start = seg.get("start", 0.0)
        end = seg.get("end", 0.0)
        if end > total_duration:
            total_duration = end
        segments.append({
            "start": start,
            "end": end,
            "start_fmt": format_timestamp(start),
            "end_fmt": format_timestamp(end),
            "text": seg.get("text", "").strip(),
        })

    duration_str = format_timestamp(total_duration)
    full_text = result.get("text", "").strip()

    logger.info(
        f"[Whisper] Transcription complete:\n"
        f"  Model         : {model_name}\n"
        f"  Duration      : {duration_str}\n"
        f"  Segments      : {len(segments)}\n"
        f"  Time          : {transcription_time_ms} ms"
    )

    return {
        "text": full_text,
        "duration_str": duration_str,
        "duration_sec": total_duration,
        "segments": segments,
        "transcription_time_ms": transcription_time_ms,
    }
