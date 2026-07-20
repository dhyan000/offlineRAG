import os
import uuid
import shutil
from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.orm import Session
from backend.core.database import get_db, SessionLocal
from backend.core.logging import logger
from backend.models.document import Document
from backend.services.ingestion import IngestionService
from backend.processors.vectordb.chroma_service import ChromaService

router = APIRouter()

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "storage", "documents")
os.makedirs(STORAGE_DIR, exist_ok=True)

def run_ingestion_in_background(doc_id: str, file_path: str):
    db = SessionLocal()
    try:
        IngestionService.process_and_index(doc_id, file_path, db)
    except Exception as e:
        logger.error(f"Background indexing error: {e}")
    finally:
        db.close()

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Verify file extension (Phase 1 supports PDF and TXT only)
    ext = file.filename.split('.')[-1].lower() if '.' in file.filename else ""
    if ext not in ["pdf", "txt"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '.{ext}'. Only PDF and TXT files are supported in Phase 1."
        )

    # Store physically with unique UUID prefix
    doc_id = str(uuid.uuid4())
    file_path = os.path.join(STORAGE_DIR, f"{doc_id}_{file.filename}")
    
    logger.info(f"Uploading file {file.filename} (assigning ID: {doc_id})...")
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save file physically: {e}")
        raise HTTPException(status_code=500, detail="Failed to save uploaded file locally.")
        
    size_bytes = os.path.getsize(file_path)

    # Store metadata in DB
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
    docs = db.query(Document).all()
    return {"items": docs}

@router.delete("/{id}")
def delete_document(id: str, db: Session = Depends(get_db)):
    # 1. Fetch document
    doc_record = db.query(Document).filter(Document.id == id).first()
    if not doc_record:
        raise HTTPException(status_code=404, detail="Document not found.")

    logger.info(f"Deleting document {doc_record.name} ({id})...")

    # 2. Delete physically
    file_path = os.path.join(STORAGE_DIR, f"{doc_record.id}_{doc_record.name}")
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Deleted physical file: {file_path}")
    except Exception as e:
        logger.warning(f"Could not delete physical file {file_path}: {e}")

    # 3. Delete from ChromaDB
    try:
        ChromaService.delete_document_chunks(doc_record.id)
    except Exception as e:
        logger.warning(f"Could not delete ChromaDB chunks for document {doc_record.id}: {e}")

    # 4. Delete from SQL DB
    try:
        db.delete(doc_record)
        db.commit()
        logger.success(f"Document {id} deleted successfully.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete document from database: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document from database.")

    return {"message": "Document deleted successfully", "id": id}
