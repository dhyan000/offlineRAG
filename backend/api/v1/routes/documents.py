import os
import uuid
import shutil
import math
import random
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from backend.core.database import get_db, SessionLocal
from backend.core.logging import logger
from backend.models.document import Document
from backend.services.ingestion import IngestionService
from backend.processors.vectordb.chroma_service import ChromaService

router = APIRouter()

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "documents")
os.makedirs(STORAGE_DIR, exist_ok=True)

SUPPORTED_EXTENSIONS = {
    "pdf": ["pdf", "txt"],
    "audio": ["mp3", "wav", "m4a", "flac"],
    "video": ["mp4", "mov", "mkv"]
}
ALL_EXTENSIONS = [ext for cat in SUPPORTED_EXTENSIONS.values() for ext in cat]

def run_ingestion_in_background(doc_id: str, file_path: str):
    db = SessionLocal()
    try:
        IngestionService.process_and_index(doc_id, file_path, db)
    except Exception as e:
        logger.error(f"Background indexing error: {e}")
    finally:
        db.close()


# ── Helper: simple PCA 384-D → 3-D ───────────────────────────────────────────

def _pca_3d(embeddings: list[list[float]]) -> list[list[float]]:
    """
    Lightweight PCA projection from 384-D to 3-D without numpy.
    Works well enough for visualisation with up to ~500 vectors.
    """
    if not embeddings:
        return []

    n = len(embeddings)
    d = len(embeddings[0])

    # 1. Centre each dimension
    means = [sum(embeddings[i][j] for i in range(n)) / n for j in range(d)]
    centred = [[embeddings[i][j] - means[j] for j in range(d)] for i in range(n)]

    # 2. Variance of each dimension (diagonal of covariance)
    variances = [sum(centred[i][j] ** 2 for i in range(n)) / max(n - 1, 1) for j in range(d)]

    # 3. Pick top-3 highest-variance dimensions as proxy axes
    top3 = sorted(range(d), key=lambda j: variances[j], reverse=True)[:3]

    # 4. Scale to [-10, 10]
    result = []
    for row in centred:
        coords = [row[j] for j in top3]
        result.append(coords)

    # Normalise
    for axis in range(3):
        vals = [result[i][axis] for i in range(n)]
        mx = max(abs(v) for v in vals) or 1.0
        for i in range(n):
            result[i][axis] = round(result[i][axis] / mx * 10, 4)

    return result


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ""
    if ext not in ALL_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '.{ext}'. Supported formats: PDF (pdf, txt), Audio (mp3, wav, m4a, flac), Video (mp4, mov, mkv)."
        )

    doc_id = str(uuid.uuid4())
    file_path = os.path.join(STORAGE_DIR, f"{doc_id}_{file.filename}")

    logger.info(f"Uploading multimodal file {file.filename} (ID: {doc_id})...")
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save file physically: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file locally.")

    size_bytes = os.path.getsize(file_path)

    db_doc = Document(
        id=doc_id,
        name=file.filename,
        type=ext,
        size_bytes=size_bytes,
        status="uploaded"
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)

    logger.info(f"File metadata saved to database. Launching background ingestion...")
    background_tasks.add_task(run_ingestion_in_background, db_doc.id, file_path)

    return {"message": "File uploaded successfully", "document": db_doc}


@router.get("/")
def get_documents(db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.uploaded_at.desc()).all()
    return {"items": docs}


@router.get("/stats")
def get_document_stats(db: Session = Depends(get_db)):
    """
    Aggregate document statistics from SQLite and ChromaDB.
    Read-only. No existing logic modified.
    """
    docs = db.query(Document).all()

    total = len(docs)
    indexed = sum(1 for d in docs if d.status == "indexed")
    processing = sum(1 for d in docs if d.status in ("processing", "transcribing", "embedding", "queued", "uploaded"))
    failed = sum(1 for d in docs if d.status == "failed")
    total_chunks = sum(d.chunk_count or 0 for d in docs)

    PDF_TYPES  = {"pdf", "txt", "docx", "doc"}
    AUDIO_TYPES = {"mp3", "wav", "m4a", "flac"}
    VIDEO_TYPES = {"mp4", "mov", "mkv"}

    pdf_count   = sum(1 for d in docs if d.type in PDF_TYPES)
    audio_count = sum(1 for d in docs if d.type in AUDIO_TYPES)
    video_count = sum(1 for d in docs if d.type in VIDEO_TYPES)

    # ChromaDB collection size
    chroma_count = 0
    try:
        _, collection = ChromaService.get_client()
        chroma_count = collection.count()
    except Exception as e:
        logger.warning(f"Could not read ChromaDB count: {e}")

    return {
        "total_documents": total,
        "indexed": indexed,
        "processing": processing,
        "failed": failed,
        "pdf_count": pdf_count,
        "audio_count": audio_count,
        "video_count": video_count,
        "total_chunks_sqlite": total_chunks,
        "total_chunks_chromadb": chroma_count,
        "embedding_dimensions": 384,
        "vector_metric": "cosine",
    }


@router.get("/vectors/projected")
def get_projected_vectors(limit: int = 200, db: Session = Depends(get_db)):
    """
    Fetch up to `limit` chunk embeddings from ChromaDB, project to 3-D via PCA,
    and return with document metadata for the 3-D visualiser.
    Includes fallback if ChromaDB internal hnsw index raises KeyError for orphaned vectors.
    """
    try:
        _, collection = ChromaService.get_client()
        total = collection.count()

        if total == 0:
            return {"nodes": [], "total_in_store": 0}

        fetch_count = min(limit, total)
        embeddings_raw = None
        metadatas_raw  = None
        documents_raw  = None
        ids_raw        = None

        # 1. Try fetching with embeddings for PCA
        try:
            results = collection.get(
                limit=fetch_count,
                include=["embeddings", "metadatas", "documents"]
            )
            embeddings_raw = results.get("embeddings")
            metadatas_raw  = results.get("metadatas")
            documents_raw  = results.get("documents")
            ids_raw        = results.get("ids")
        except Exception as embed_err:
            logger.warning(f"ChromaDB embeddings get failed ({embed_err}), falling back to metadatas+documents...")
            results = collection.get(
                limit=fetch_count,
                include=["metadatas", "documents"]
            )
            metadatas_raw = results.get("metadatas")
            documents_raw = results.get("documents")
            ids_raw       = results.get("ids")

        # Extract IDs
        if isinstance(ids_raw, list) and len(ids_raw) > 0:
            id_list = list(ids_raw)
        elif isinstance(metadatas_raw, list):
            id_list = [f"chunk_{i}" for i in range(len(metadatas_raw))]
        else:
            return {"nodes": [], "total_in_store": total}

        # 2. Compute 3D coordinates (PCA if embeddings available, else spatial layout)
        if embeddings_raw is not None:
            if isinstance(embeddings_raw, dict):
                embeddings_list = [embeddings_raw[k] for k in id_list if k in embeddings_raw]
            else:
                embeddings_list = list(embeddings_raw)

            if embeddings_list and len(embeddings_list) == len(id_list):
                projected = _pca_3d(embeddings_list)
            else:
                projected = []
        else:
            projected = []

        # Fallback spatial layout if PCA failed or embeddings unavailable
        if not projected or len(projected) != len(id_list):
            projected = []
            for i, chunk_id in enumerate(id_list):
                # Deterministic spatial arrangement based on index and hash
                h = hash(chunk_id) % 1000
                x = round(math.sin(i * 0.45 + h) * 12.0, 4)
                y = round(math.cos(i * 0.35) * 8.0, 4)
                z = round(math.sin(i * 0.25) * 10.0, 4)
                projected.append([x, y, z])

        nodes = []
        for i, coords in enumerate(projected):
            chunk_id = id_list[i] if i < len(id_list) else f"chunk_{i}"

            # Safely extract metadata
            meta = {}
            if isinstance(metadatas_raw, dict):
                meta = metadatas_raw.get(chunk_id, {})
            elif isinstance(metadatas_raw, list) and i < len(metadatas_raw):
                meta = metadatas_raw[i] or {}

            # Safely extract document text snippet
            chunk_text = ""
            if isinstance(documents_raw, dict):
                raw_text = documents_raw.get(chunk_id, "")
                chunk_text = (raw_text or "")[:120]
            elif isinstance(documents_raw, list) and i < len(documents_raw):
                raw_text = documents_raw[i]
                chunk_text = (raw_text or "")[:120]

            nodes.append({
                "id":        chunk_id,
                "x":         coords[0],
                "y":         coords[1],
                "z":         coords[2],
                "filename":  meta.get("filename", "Unknown") if isinstance(meta, dict) else "Unknown",
                "type":      meta.get("type", "pdf") if isinstance(meta, dict) else "pdf",
                "chunk_idx": meta.get("chunk_index", i) if isinstance(meta, dict) else i,
                "text":      chunk_text,
            })

        return {"nodes": nodes, "total_in_store": total}

    except Exception as e:
        logger.error(f"Error computing vector projection: {e}")
        raise HTTPException(status_code=500, detail=f"Vector projection failed: {str(e)}")


@router.delete("/{id}")
def delete_document(id: str, db: Session = Depends(get_db)):
    doc_record = db.query(Document).filter(Document.id == id).first()
    if not doc_record:
        raise HTTPException(status_code=404, detail="Document not found.")

    logger.info(f"Deleting document {doc_record.name} ({id})...")

    file_path = os.path.join(STORAGE_DIR, f"{doc_record.id}_{doc_record.name}")
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Deleted physical file: {file_path}")
    except Exception as e:
        logger.warning(f"Could not delete physical file {file_path}: {e}")

    try:
        ChromaService.delete_document_chunks(doc_record.id)
    except Exception as e:
        logger.warning(f"Could not delete ChromaDB chunks for document {doc_record.id}: {e}")

    try:
        db.delete(doc_record)
        db.commit()
        logger.success(f"Document {id} deleted successfully.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete document from database: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document from database.")

    return {"message": "Document deleted successfully", "id": id}


@router.get("/{id}")
def get_document_by_id(id: str, db: Session = Depends(get_db)):
    doc_record = db.query(Document).filter(Document.id == id).first()
    if not doc_record:
        raise HTTPException(status_code=404, detail="Document not found.")
    return doc_record


@router.get("/{id}/file")
def stream_document_file(id: str, db: Session = Depends(get_db)):
    doc_record = db.query(Document).filter(Document.id == id).first()
    if not doc_record:
        raise HTTPException(status_code=404, detail="Document not found.")

    possible_paths = [
        os.path.join(STORAGE_DIR, f"{doc_record.id}_{doc_record.name}"),
        os.path.join(STORAGE_DIR, doc_record.name),
    ]

    file_path = None
    for p in possible_paths:
        if os.path.exists(p):
            file_path = p
            break

    if not file_path:
        raise HTTPException(status_code=404, detail="Physical media file not found on server.")

    media_types = {
        "pdf": "application/pdf",
        "txt": "text/plain; charset=utf-8",
        "mp3": "audio/mpeg",
        "wav": "audio/wav",
        "m4a": "audio/mp4",
        "flac": "audio/flac",
        "mp4": "video/mp4",
        "mov": "video/quicktime",
        "mkv": "video/x-matroska",
    }
    ext = file_path.split('.')[-1].lower() if '.' in file_path else doc_record.type.lower()
    media_type = media_types.get(ext, "application/pdf" if ext == "pdf" else "text/plain; charset=utf-8")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers={
            "Content-Disposition": "inline",
            "Accept-Ranges": "bytes",
        }
    )


@router.get("/{id}/chunks")
def get_document_chunks(id: str, db: Session = Depends(get_db)):
    doc_record = db.query(Document).filter(Document.id == id).first()
    if not doc_record:
        raise HTTPException(status_code=404, detail="Document not found.")

    try:
        _, collection = ChromaService.get_client()
        res = collection.get(where={"document_id": id}, include=["documents", "metadatas"])

        if not res or not res.get("ids") or len(res["ids"]) == 0:
            # Fallback search by filename if metadata lacks document_id
            res = collection.get(where={"filename": doc_record.name}, include=["documents", "metadatas"])

        ids = res.get("ids") or []
        documents = res.get("documents") or []
        metadatas = res.get("metadatas") or []

        chunks = []
        for i in range(len(ids)):
            meta = metadatas[i] if i < len(metadatas) and isinstance(metadatas[i], dict) else {}
            chunk_text = documents[i] if i < len(documents) else ""
            chunks.append({
                "id": ids[i],
                "text": chunk_text,
                "chunk_index": meta.get("chunk_index", i),
                "page": meta.get("page"),
                "timestamp": meta.get("timestamp"),
                "type": meta.get("type", doc_record.type),
                "filename": meta.get("filename", doc_record.name),
            })

        chunks.sort(key=lambda c: c.get("chunk_index", 0))
        return {
            "document_id": id,
            "filename": doc_record.name,
            "count": len(chunks),
            "chunks": chunks
        }
    except Exception as e:
        logger.error(f"Error fetching chunks for document {id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch chunks: {str(e)}")

