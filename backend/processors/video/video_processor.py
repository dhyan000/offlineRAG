import os
import tempfile
import subprocess
import imageio_ffmpeg
from backend.core.logging import logger
from backend.processors.audio.audio_processor import extract_transcript_from_audio

def extract_audio_from_video(video_path: str) -> str:
    """
    Extracts audio from video file to a temporary WAV file using imageio-ffmpeg binary.
    Returns path to extracted temporary audio file.
    """
    logger.info(f"Extracting audio track from video: {video_path}")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    temp_audio = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    temp_audio_path = temp_audio.name
    temp_audio.close()

    cmd = [
        ffmpeg_exe,
        "-y",
        "-i", video_path,
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        temp_audio_path
    ]

    logger.info(f"Running FFmpeg audio extraction command...")
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if res.returncode != 0:
        err_msg = res.stderr.decode("utf-8", errors="ignore")
        logger.error(f"FFmpeg audio extraction failed: {err_msg}")
        if os.path.exists(temp_audio_path):
            os.remove(temp_audio_path)
        raise RuntimeError(f"FFmpeg audio extraction failed: {err_msg}")

    logger.success(f"Audio extracted successfully to temporary file: {temp_audio_path}")
    return temp_audio_path

def extract_transcript_from_video(file_path: str) -> dict:
    """
    Pipeline for video processing:
    Video -> FFmpeg -> Extract Audio -> Whisper -> Transcript
    """
    logger.info(f"Starting video processing pipeline for: {file_path}")
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Video file not found at {file_path}")

    temp_audio_path = None
    try:
        temp_audio_path = extract_audio_from_video(file_path)
        result = extract_transcript_from_audio(temp_audio_path)
        logger.success(f"Video processing complete. Duration: {result['duration_str']}")
        return result
    finally:
        if temp_audio_path and os.path.exists(temp_audio_path):
            try:
                os.remove(temp_audio_path)
                logger.info("Cleaned up temporary video audio extraction file.")
            except Exception as e:
                logger.warning(f"Could not remove temp audio file {temp_audio_path}: {e}")
