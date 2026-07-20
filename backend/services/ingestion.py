import os
import datetime
from sqlalchemy.orm import Session
from backend.models.document import Document
from backend.core.logging import logger
from backend.processors.pdf.pdf_processor import extract_text_from_pdf
from backend.processors.text.text_processor import extract_text_from_txt
from backend.processors.text.cleaner import clean_text
from backend.processors.embeddings.embedding_service import EmbeddingService
from backend.processors.vectordb.chroma_service import ChromaService

# langchain-text-splitters splits the clean paragraphs
from langchain_text_splitters import RecursiveCharacterTextSplitter

class IngestionService:
    @classmethod
    def process_and_index(cls, doc_id: str, file_path: str, db: Session):
        """
        Ingest, clean, chunk, embed, and store document content in database and ChromaDB.
        Runs in background thread.
        """
        logger.info(f"Starting ingestion process for document {doc_id}...")
        
        # 1. Fetch document metadata from DB
        doc_record = db.query(Document).filter(Document.id == doc_id).first()
        if not doc_record:
            logger.error(f"Document with ID {doc_id} not found in DB.")
            return

        try:
            # Update status to processing
            doc_record.status = "processing"
            db.commit()
            db.refresh(doc_record)

            # 2. Extract raw text with page numbers
            file_ext = doc_record.type.lower()
            if file_ext == "pdf":
                raw_pages = extract_text_from_pdf(file_path)
            elif file_ext == "txt":
                raw_pages = extract_text_from_txt(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_ext}")

            if not raw_pages:
                raise ValueError("No text could be extracted from the document.")

            # 3. Clean, chunk and build embeddings
            splitter = RecursiveCharacterTextSplitter(chunk_size=700, chunk_overlap=100)
            
            chunk_ids = []
            chunk_texts = []
            embeddings = []
            metadatas = []
            chunk_index = 0
            
            upload_time_str = doc_record.uploaded_at.isoformat()

            for page_num, text in raw_pages:
                cleaned = clean_text(text)
                if not cleaned:
                    continue
                
                # Split this page's text into chunks
                page_chunks = splitter.split_text(cleaned)
                
                for chunk in page_chunks:
                    chunk_text = chunk.strip()
                    if not chunk_text:
                        continue
                    
                    chunk_id = f"{doc_id}_chunk_{chunk_index}"
                    
                    # Generate embedding
                    embedding = EmbeddingService.get_embedding(chunk_text)
                    
                    chunk_ids.append(chunk_id)
                    chunk_texts.append(chunk_text)
                    embeddings.append(embedding)
                    
                    metadatas.append({
                        "document_id": doc_id,
                        "filename": doc_record.name,
                        "page": page_num,
                        "chunk_index": chunk_index,
                        "upload_time": upload_time_str
                    })
                    
                    chunk_index += 1

            if not chunk_texts:
                raise ValueError("No non-empty chunks found after processing and cleaning.")

            # 4. Insert into ChromaDB
            ChromaService.add_chunks(
                doc_id=doc_id,
                filename=doc_record.name,
                chunk_ids=chunk_ids,
                chunk_texts=chunk_texts,
                embeddings=embeddings,
                metadatas=metadatas
            )

            # 5. Update SQL Document Record
            doc_record.status = "indexed"
            doc_record.indexed_at = datetime.datetime.utcnow()
            doc_record.chunk_count = len(chunk_texts)
            doc_record.error_message = None
            db.commit()
            
            logger.success(f"Ingestion succeeded for document {doc_record.name} ({doc_id}). Chunks: {doc_record.chunk_count}")

        except Exception as e:
            logger.exception(f"Ingestion failed for document {doc_id}: {e}")
            db.rollback()
            try:
                # Reload to avoid session desync and write error state
                doc_record = db.query(Document).filter(Document.id == doc_id).first()
                if doc_record:
                    doc_record.status = "failed"
                    doc_record.error_message = str(e)
                    db.commit()
            except Exception as inner_e:
                logger.error(f"Failed to update document error status: {inner_e}")
