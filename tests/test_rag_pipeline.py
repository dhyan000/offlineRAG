import os
import sys
import time
import fitz  # PyMuPDF

# Add backend and root to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend")))

from fastapi.testclient import TestClient
from backend.main import app
from backend.core.database import Base, engine, SessionLocal
from backend.models.document import Document
from backend.processors.vectordb.chroma_service import ChromaService

client = TestClient(app)

def test_pipeline():
    print("=== STARTING INTEGRATION TEST ===")
    
    # 1. Clean and initialize database
    print("1. Initializing database schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Ensure ChromaDB is cleaned
    _, collection = ChromaService.get_client()
    try:
        collection.delete()
        print("ChromaDB vector store cleared.")
    except Exception:
        pass
        
    # Check health check API
    print("2. Verifying health check API...")
    health_resp = client.get("/api/v1/health")
    assert health_resp.status_code == 200
    health_data = health_resp.json()
    print(f"Health Check response: {health_data}")
    assert health_data["status"] in ["healthy", "degraded"]
    assert health_data["services"]["api"] == "operational"
    assert health_data["services"]["database"] == "operational"
    assert health_data["services"]["vector_store"] == "operational"

    # Create dummy text and PDF files
    test_dir = os.path.dirname(os.path.abspath(__file__))
    txt_path = os.path.join(test_dir, "test_document.txt")
    pdf_path = os.path.join(test_dir, "test_document.pdf")
    
    # Create TXT file
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("Process Scheduling is the activity of the process manager that handles the removal of the running process from the CPU and the selection of another process on the basis of a particular strategy.")

    # Create PDF file
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "FastAPI is a modern, fast (high-performance), web framework for building APIs with Python 3.8+ based on standard Python type hints.")
    doc.save(pdf_path)
    doc.close()

    uploaded_ids = []

    try:
        # 3. Upload TXT file
        print("3. Uploading TXT file...")
        with open(txt_path, "rb") as f:
            upload_resp = client.post(
                "/api/v1/documents/upload",
                files={"file": ("test_document.txt", f, "text/plain")}
            )
        assert upload_resp.status_code == 200
        upload_data = upload_resp.json()
        doc_id_txt = upload_data["document"]["id"]
        uploaded_ids.append(doc_id_txt)
        assert upload_data["document"]["status"] == "uploaded"

        # 4. Upload PDF file
        print("4. Uploading PDF file...")
        with open(pdf_path, "rb") as f:
            upload_resp = client.post(
                "/api/v1/documents/upload",
                files={"file": ("test_document.pdf", f, "application/pdf")}
            )
        assert upload_resp.status_code == 200
        upload_data = upload_resp.json()
        doc_id_pdf = upload_data["document"]["id"]
        uploaded_ids.append(doc_id_pdf)
        assert upload_data["document"]["status"] == "uploaded"

        # Wait a few seconds for background indexing task to finish
        db = SessionLocal()
        
        print("5. Polling database for indexing completion...")
        for _ in range(20):
            # Check TXT
            doc_record_txt = db.query(Document).filter(Document.id == doc_id_txt).first()
            # Check PDF
            doc_record_pdf = db.query(Document).filter(Document.id == doc_id_pdf).first()
            
            db.refresh(doc_record_txt)
            db.refresh(doc_record_pdf)
            
            print(f"  Current Status - TXT: {doc_record_txt.status}, PDF: {doc_record_pdf.status}")
            
            if doc_record_txt.status in ["indexed", "failed"] and doc_record_pdf.status in ["indexed", "failed"]:
                break
            time.sleep(1)

        doc_record_txt = db.query(Document).filter(Document.id == doc_id_txt).first()
        doc_record_pdf = db.query(Document).filter(Document.id == doc_id_pdf).first()

        assert doc_record_txt.status == "indexed", f"TXT indexing failed: {doc_record_txt.error_message}"
        assert doc_record_pdf.status == "indexed", f"PDF indexing failed: {doc_record_pdf.error_message}"
        assert doc_record_txt.chunk_count > 0
        assert doc_record_pdf.chunk_count > 0
        db.close()

        # 6. Check if ChromaDB contains vectors
        _, collection = ChromaService.get_client()
        count = collection.count()
        print(f"ChromaDB collection chunk count: {count}")
        assert count > 0

        # 7. Query chat API for TXT content
        print("6. Querying Chat API (TXT content)...")
        chat_resp = client.post(
            "/api/v1/chat",
            json={"question": "What is Process Scheduling?"}
        )
        assert chat_resp.status_code == 200
        chat_data = chat_resp.json()
        print(f"Chat response (scheduling): {chat_data}")
        assert "answer" in chat_data
        assert len(chat_data["sources"]) > 0
        assert chat_data["sources"][0]["document"] == "test_document.txt"

        # 8. Query chat API for PDF content
        print("7. Querying Chat API (PDF content)...")
        chat_resp = client.post(
            "/api/v1/chat",
            json={"question": "What is FastAPI?"}
        )
        assert chat_resp.status_code == 200
        chat_data = chat_resp.json()
        print(f"Chat response (fastapi): {chat_data}")
        assert "answer" in chat_data
        assert len(chat_data["sources"]) > 0
        assert chat_data["sources"][0]["document"] == "test_document.pdf"
        assert chat_data["sources"][0]["page"] == 1  # 1-indexed

        # 9. Query chat API for fallback logic
        print("8. Querying Chat API (unrelated query for fallback)...")
        chat_resp_fallback = client.post(
            "/api/v1/chat",
            json={"question": "What is the height of Mount Everest?"}
        )
        assert chat_resp_fallback.status_code == 200
        chat_data_fallback = chat_resp_fallback.json()
        print(f"Chat response (fallback): {chat_data_fallback}")
        assert chat_data_fallback["answer"] == "I could not find this information in the uploaded documents."
        assert len(chat_data_fallback["sources"]) == 0

    finally:
        # Clean up files
        if os.path.exists(txt_path):
            os.remove(txt_path)
        if os.path.exists(pdf_path):
            os.remove(pdf_path)

        # 10. Verify Delete Document API
        print("9. Deleting test documents from vector store and DB...")
        for doc_id in uploaded_ids:
            delete_resp = client.delete(f"/api/v1/documents/{doc_id}")
            assert delete_resp.status_code == 200
            
        # Verify empty collections and database table
        db = SessionLocal()
        assert db.query(Document).count() == 0
        db.close()
        
        _, collection = ChromaService.get_client()
        assert collection.count() == 0

    print("=== INTEGRATION TEST PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    try:
        test_pipeline()
    except Exception as e:
        print(f"=== TEST FAILED: {e} ===")
        sys.exit(1)
