# 🧠 Offline Multimodal AI Knowledge Hub

> An enterprise-grade, 100% offline Multimodal Retrieval-Augmented Generation (RAG) platform for private knowledge management and semantic search.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Python](https://img.shields.io/badge/python-3.11+-green)
![React](https://img.shields.io/badge/react-18+-61DAFB)
![FastAPI](https://img.shields.io/badge/fastapi-0.110+-009688)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

## 📖 Overview

The **Offline Multimodal AI Knowledge Hub** is a privacy-first AI application designed to ingest, process, index, and query enterprise documents and media tracks locally without relying on external cloud APIs.

- 📄 **Multimodal Document Processing:** Ingests PDFs, plain text (`.txt`), audio tracks (`.mp3`, `.wav`, `.m4a`, `.flac`), and video media (`.mp4`, `.mov`, `.mkv`).
- 🎙️ **Speech Transcription Pipeline:** Integrated local OpenAI **Whisper** engine with automatic segment-level timestamps (`MM:SS`).
- 🎬 **Video Audio Extraction:** Subprocess **FFmpeg** pipeline demuxing video audio tracks into 16kHz mono WAV streams.
- 🔍 **Sub-15ms Vector Search:** Persistent **ChromaDB** vector database utilizing Cosine distance over an HNSW index.
- ⚡ **MD5 Embedding Cache:** Instant vector reuse for duplicate file uploads via 64KB chunked digest matching.
- 🤖 **Grounded Local LLM RAG:** Local **Ollama** running `Llama 3.2 3B` with forced `temperature=0.0` to eliminate hallucinations.
- ⚡ **NDJSON Streaming Chat:** Real-time character streaming with initial metadata headers and latency metrics (`embedding_ms`, `retrieval_ms`, `ollama_ms`).
- 🔒 **100% Air-Gapped & Offline:** Zero external network calls, zero cloud dependencies, complete data sovereignty.

---

## 🏗️ Architecture & Data Flow

```text
[ User Interface (React 18 + Vite + TS) ]
                    │
   (HTTP REST / NDJSON Response Streaming)
                    ▼
[ FastAPI Backend Server (backend/main.py) ]
   ├── SQLite DB (storage/app.db) ── Metadata & Job Status Tracker
   ├── PyMuPDF ────────────────────── PDF Page Text Extractor
   ├── FFmpeg + Whisper AI ────────── Video Demuxer & Speech Transcriber
   ├── SentenceTransformers ───────── 384D Dense Vector Generator
   ├── ChromaDB Store ────────────── Persistent HNSW Vector Index (storage/chromadb)
   └── Ollama Server ─────────────── Local Llama 3.2 3B LLM (@ localhost:11434)
```

### End-to-End RAG Request Flow

```text
User Question ──► [ ChatService.chat_with_docs() ]
                        │
                        ▼
            [ Query Vector Embedding ] (SentenceTransformers: all-MiniLM-L6-v2)
                        │
                        ▼
       [ ChromaDB Query (Source Filter + Top-K Cosine KNN) ]
                        │
                        ▼
        [ Yield Initial Metadata Header NDJSON ] ──► (Renders Source Badges & Timestamps)
                        │
                        ▼
     [ Strict Prompt + Context ──► Ollama Server ] (llama3.2:3b, temp=0.0)
                        │
                        ▼
     [ Stream NDJSON Tokens ──► React Streaming UI ] (Renders Real-Time Typing Animation)
```

---

## 📁 Repository Structure

```text
Offline-Multimodal-RAG/
├── backend/                 # Core Python FastAPI backend
│   ├── api/v1/              # API Route controllers (documents.py, chat.py, health.py)
│   ├── core/                # System configuration (config.py, logging.py, database.py)
│   ├── models/              # SQLAlchemy models (document.py)
│   ├── processors/          # Handlers for extraction, AI mapping, and vector DB
│   │   ├── audio/           # Whisper ASR speech transcription processor
│   │   ├── video/           # FFmpeg video demuxing & audio extraction
│   │   ├── pdf/             # PyMuPDF page-by-page text parser
│   │   ├── text/            # Plain text extractor & cleaner
│   │   ├── embeddings/      # SentenceTransformers wrapper (all-MiniLM-L6-v2)
│   │   ├── vectordb/        # ChromaDB persistent store interface
│   │   └── llm/             # Ollama HTTP API client wrapper
│   ├── services/            # Core business logic (ingestion.py, chat_service.py)
│   └── main.py              # Application entry point & lifespan startup hooks
├── frontend/                # React 18 + Vite + TypeScript frontend UI
│   ├── src/
│   │   ├── components/      # Reusable layout UI components (Sidebar, TopBar)
│   │   ├── pages/           # Views (Dashboard, MultimodalStudio, Chat, KnowledgeBase, etc.)
│   │   ├── services/        # Axios API client (api.ts)
│   │   └── types/           # TypeScript interfaces (index.ts)
├── storage/                 # Persistent storage (SQLite app.db, ChromaDB, uploads)
└── README.md                # Project documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites

| Tool | Minimum Version | Note |
| :--- | :--- | :--- |
| **Python** | 3.11+ | Virtual environment recommended |
| **Node.js** | 18+ | Package manager (npm 9+) |
| **FFmpeg** | Latest | Required for Audio/Video processing (`pip install imageio-ffmpeg`) |
| **Ollama** | Latest | Running locally (`ollama pull llama3.2:3b`) |

---

### Backend Setup

```bash
# 1. Open terminal and navigate to project root
cd Offline-Multimodal-RAG

# 2. Activate virtual environment
# Windows:
backend\.venv\Scripts\activate
# Linux/macOS:
source backend/.venv/bin/activate

# 3. Install backend dependencies (if not already installed)
pip install -r backend/requirements.txt

# 4. Start the FastAPI ASGI development server
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

- Backend API running at: **`http://localhost:8000`**
- Interactive Swagger Documentation: **`http://localhost:8000/docs`**

---

### Frontend Setup

```bash
# 1. Open a second terminal window and navigate to frontend
cd Offline-Multimodal-RAG/frontend

# 2. Install npm packages
npm install

# 3. Start Vite development server
npm run dev
```

- Web Interface running at: **`http://localhost:5173`**

---

## 📡 API Reference

| Method | Endpoint | Description | Payload / Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Verifies system health, DB connection, and Ollama online status | None |
| `GET` | `/api/v1/documents/` | Retrieves list of all ingested document records | None |
| `POST` | `/api/v1/documents/upload` | Uploads file and enqueues background processing | `multipart/form-data` (`file`) |
| `DELETE` | `/api/v1/documents/{id}` | Deletes document, disk file, and ChromaDB vector chunks | Path parameter `{id}` |
| `POST` | `/api/v1/chat/` | RAG search & streams NDJSON answer tokens | `{"question": "...", "source_type": "all", "top_k": 5}` |

---

## 🛠️ Technology Stack Summary

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Framer Motion, Lucide Icons, Axios.
- **Backend:** FastAPI, Pydantic v2, SQLAlchemy, SQLite, Loguru, Uvicorn.
- **AI & Vector DB:** Ollama (`llama3.2:3b`), OpenAI Whisper (`tiny`), SentenceTransformers (`all-MiniLM-L6-v2`), ChromaDB (`hnsw:space: cosine`).
- **Processing Utilities:** PyMuPDF (`fitz`), FFmpeg (`imageio-ffmpeg`), LangChain `RecursiveCharacterTextSplitter`.

---

## 📑 Project Documentation Artifacts

Detailed architectural reviews, presentation decks, and viva Q&A defense guides generated for academic and technical reviews:

1. 📄 **[Technical Audit & Architecture Review](technical_audit_and_review.md)** — Exhaustive 15-section audit report with code citations, mathematical formulas, 50 viva Q&As, and faculty review panel defenses.
2. 📄 **[SKCT Second Review Presentation Deck](skct_second_review_presentation.md)** — Complete presentation slides, ASCII architecture diagrams, technology justification table, and module interaction specs tailored for review presentations.

---

*Built for On-Premise Data Sovereignty — 100% Offline, Fast, and Secure.*
