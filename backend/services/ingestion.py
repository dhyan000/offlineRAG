import os
import time
import datetime
from sqlalchemy.orm import Session
from backend.models.document import Document
from backend.core.logging import logger
from backend.processors.pdf.pdf_processor import extract_text_from_pdf
from backend.processors.text.text_processor import extract_text_from_txt
from backend.processors.audio.audio_processor import extract_transcript_from_audio, get_whisper_load_time
from backend.processors.video.video_processor import extract_transcript_from_video
from backend.processors.text.cleaner import clean_text
from backend.processors.embeddings.embedding_service import EmbeddingService
from backend.processors.vectordb.chroma_service import ChromaService

from langchain_text_splitters import RecursiveCharacterTextSplitter

# Processing status progression
# uploaded -> queued -> processing -> transcribing -> embedding -> indexed / failed

def _update_status(doc_record: Document, db: Session, status: str):
    """Helper to atomically update document status and commit."""
    doc_record.status = status
    db.commit()
    db.refresh(doc_record)
    logger.info(f"Document '{doc_record.name}' status: {status}")


class IngestionService:
    @classmethod
    def process_and_index(cls, doc_id: str, file_path: str, db: Session):
        """
        Full multimodal ingestion pipeline with granular status stages:
        uploaded -> queued -> processing -> transcribing -> embedding -> indexed / failed
        """
        t_start_total = time.perf_counter()
        logger.info(f"Ingestion pipeline starting for document {doc_id}...")

        doc_record = db.query(Document).filter(Document.id == doc_id).first()
        if not doc_record:
            logger.error(f"Document {doc_id} not found in DB.")
            return

        try:
            # STAGE: queued
            _update_status(doc_record, db, "queued")

            # STAGE: processing
            _update_status(doc_record, db, "processing")

            file_ext = doc_record.type.lower()
            file_hash = EmbeddingService.calculate_file_hash(file_path)
            doc_record.file_hash = file_hash
            db.commit()

            # Embedding cache check
            existing_doc = db.query(Document).filter(
                Document.file_hash == file_hash,
                Document.status == "indexed",
                Document.id != doc_id
            ).first()

            if existing_doc:
                logger.info(
                    f"Embedding cache hit for '{doc_record.name}' "
                    f"(matches hash {file_hash}). Reusing vectors."
                )
                doc_record.status = "indexed"
                doc_record.indexed_at = datetime.datetime.utcnow()
                doc_record.chunk_count = existing_doc.chunk_count
                doc_record.duration = existing_doc.duration
                doc_record.error_message = None
                db.commit()
                return

            raw_chunks = []
            duration_str = None
            transcription_time_ms = 0.0

            t_extract = time.perf_counter()

            if file_ext in ["pdf"]:
                pages = extract_text_from_pdf(file_path)
                for page_num, text in pages:
                    cleaned = clean_text(text)
                    if cleaned:
                        raw_chunks.append({"text": cleaned, "page": page_num, "timestamp": None})

            elif file_ext in ["txt"]:
                pages = extract_text_from_txt(file_path)
                for page_num, text in pages:
                    cleaned = clean_text(text)
                    if cleaned:
                        raw_chunks.append({"text": cleaned, "page": page_num, "timestamp": None})

            elif file_ext in ["mp3", "wav", "m4a", "flac"]:
                # STAGE: transcribing
                _update_status(doc_record, db, "transcribing")
                result = extract_transcript_from_audio(file_path)
                duration_str = result["duration_str"]
                transcription_time_ms = result.get("transcription_time_ms", 0.0)
                doc_record.duration = duration_str
                db.commit()
                for seg in result["segments"]:
                    seg_text = clean_text(seg["text"])
                    if seg_text:
                        raw_chunks.append({
                            "text": seg_text,
                            "page": None,
                            "timestamp": f"{seg['start_fmt']} - {seg['end_fmt']}"
                        })

            elif file_ext in ["mp4", "mov", "mkv"]:
                # STAGE: transcribing
                _update_status(doc_record, db, "transcribing")
                result = extract_transcript_from_video(file_path)
                duration_str = result["duration_str"]
                transcription_time_ms = result.get("transcription_time_ms", 0.0)
                doc_record.duration = duration_str
                db.commit()
                for seg in result["segments"]:
                    seg_text = clean_text(seg["text"])
                    if seg_text:
                        raw_chunks.append({
                            "text": seg_text,
                            "page": None,
                            "timestamp": f"{seg['start_fmt']} - {seg['end_fmt']}"
                        })

            else:
                raise ValueError(f"Unsupported file format: .{file_ext}")

            extraction_ms = round((time.perf_counter() - t_extract) * 1000, 1)

            if not raw_chunks:
                raise ValueError("No text content could be extracted from the uploaded file.")

            # Chunking (400 tokens / 50 overlap)
            t_chunk = time.perf_counter()
            try:
                splitter = RecursiveCharacterTextSplitter.from_tiktoken_encoder(
                    chunk_size=400, chunk_overlap=50
                )
            except Exception:
                splitter = RecursiveCharacterTextSplitter(chunk_size=1600, chunk_overlap=200)

            chunk_ids, chunk_texts, metadatas = [], [], []
            chunk_index = 0
            upload_date_str = doc_record.uploaded_at.strftime("%Y-%m-%d %H:%M:%S")
            source_type = (
                "pdf" if file_ext in ["pdf", "txt"] else
                "audio" if file_ext in ["mp3", "wav", "m4a", "flac"] else
                "video"
            )

            for item in raw_chunks:
                for chunk in splitter.split_text(item["text"]):
                    chunk_str = chunk.strip()
                    if not chunk_str:
                        continue
                    meta = {
                        "type": source_type,
                        "document_id": doc_id,
                        "filename": doc_record.name,
                        "uploadDate": upload_date_str,
                        "duration": duration_str or "",
                        "chunk_index": chunk_index,
                    }
                    if item["page"] is not None:
                        meta["page"] = item["page"]
                    if item["timestamp"] is not None:
                        meta["timestamp"] = item["timestamp"]

                    chunk_ids.append(f"{doc_id}_chunk_{chunk_index}")
                    chunk_texts.append(chunk_str)
                    metadatas.append(meta)
                    chunk_index += 1

            chunking_ms = round((time.perf_counter() - t_chunk) * 1000, 1)

            if not chunk_texts:
                raise ValueError("No valid chunks produced after processing.")

            # STAGE: embedding
            _update_status(doc_record, db, "embedding")

            t_embed = time.perf_counter()
            embeddings = EmbeddingService.get_embeddings(chunk_texts)
            embedding_ms = round((time.perf_counter() - t_embed) * 1000, 1)

            t_vector = time.perf_counter()
            ChromaService.add_chunks(
                doc_id=doc_id,
                filename=doc_record.name,
                chunk_ids=chunk_ids,
                chunk_texts=chunk_texts,
                embeddings=embeddings,
                metadatas=metadatas,
            )
            vectordb_ms = round((time.perf_counter() - t_vector) * 1000, 1)

            # STAGE: indexed
            doc_record.status = "indexed"
            doc_record.indexed_at = datetime.datetime.utcnow()
            doc_record.chunk_count = len(chunk_texts)
            doc_record.error_message = None
            db.commit()

            total_ms = round((time.perf_counter() - t_start_total) * 1000, 1)

            logger.success(
                f"\n=== Ingestion Complete: {doc_record.name} ===\n"
                f"  Whisper Model Load   : {get_whisper_load_time()} ms\n"
                f"  Transcription Time   : {transcription_time_ms} ms\n"
                f"  Extraction Time      : {extraction_ms} ms\n"
                f"  Chunking Time        : {chunking_ms} ms\n"
                f"  Embedding Time       : {embedding_ms} ms\n"
                f"  ChromaDB Store       : {vectordb_ms} ms\n"
                f"  Total Ingestion      : {total_ms} ms\n"
                f"  Indexed Chunks       : {len(chunk_texts)}\n"
                f"=========================================="
            )

        except Exception as e:
            logger.exception(f"Ingestion failed for document {doc_id}: {e}")
            db.rollback()
            try:
                doc_record = db.query(Document).filter(Document.id == doc_id).first()
                if doc_record:
                    doc_record.status = "failed"
                    doc_record.error_message = str(e)
                    db.commit()
            except Exception as inner:
                logger.error(f"Failed to persist error status: {inner}")
