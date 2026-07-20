# 🧠 Offline Multimodal AI Knowledge Hub

> An industry-grade, fully offline Multimodal Retrieval-Augmented Generation (RAG) application for private knowledge management.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Python](https://img.shields.io/badge/python-3.11+-green)
![React](https://img.shields.io/badge/react-18+-61DAFB)
![License](https://img.shields.io/badge/license-MIT-yellow)

---

## 📖 Overview

The **Offline Multimodal AI Knowledge Hub** is a production-quality, privacy-first AI platform that allows you to:

- 📄 Ingest documents (PDF, DOCX, Excel, images, audio, video)
- 🔍 Perform semantic search over your private knowledge base
- 🤖 Chat with your documents using local LLMs via Ollama
- 📊 Analyse usage and system metrics
- 🔒 Keep all data fully offline — no cloud, no telemetry

---

## 🏗️ Architecture

```
Offline-Multimodal-RAG/
├── backend/                # FastAPI Python backend
│   ├── api/                # API route definitions (versioned)
│   ├── core/               # App config, logging, dependencies
│   ├── models/             # Pydantic & ORM data models
│   ├── services/           # Business logic services
│   ├── processors/         # Multimodal document processors
│   │   ├── text/           # Plain text processor
│   │   ├── pdf/            # PDF processor
│   │   ├── image/          # Image processor (OCR-ready)
│   │   ├── audio/          # Audio processor (Whisper-ready)
│   │   ├── video/          # Video processor
│   │   ├── excel/          # Excel/CSV processor
│   │   ├── docx/           # DOCX processor
│   │   ├── embeddings/     # Embedding pipeline
│   │   ├── vectordb/       # ChromaDB interface
│   │   └── llm/            # Ollama LLM interface
│   ├── database/           # SQLite/SQLAlchemy schemas
│   ├── utils/              # Shared utilities
│   ├── tests/              # Backend test suite
│   └── main.py             # Application entry point
│
├── frontend/               # React 18 + Vite + TypeScript frontend
│   └── src/
│       ├── components/     # Reusable UI components
│       ├── layouts/        # Page layout wrappers
│       ├── pages/          # Route-level page components
│       ├── hooks/          # Custom React hooks
│       ├── services/       # API client & service layer
│       ├── types/          # Global TypeScript types
│       └── utils/          # Frontend utilities
│
├── configs/                # Application configuration files
├── docs/                   # Project documentation
├── logs/                   # Application logs
├── scripts/                # Utility & automation scripts
├── storage/                # Data storage (models, vectors, uploads)
└── tests/                  # Integration & E2E tests
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Minimum Version |
|------|----------------|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |
| Ollama | Latest |

---

### Backend Setup

```bash
# 1. Navigate to backend
cd backend

# 2. Create virtual environment
python -m venv .venv

# 3. Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Start the development server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: **http://localhost:8000**  
API Documentation: **http://localhost:8000/docs**

---

### Frontend Setup

```bash
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev
```

Frontend will be available at: **http://localhost:5173**

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Welcome message |
| `GET` | `/health` | System health check |
| `GET` | `/version` | Application version info |
| `GET` | `/docs` | Interactive API documentation (Swagger) |
| `GET` | `/redoc` | Alternative API documentation (Redoc) |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** — UI framework
- **Vite** — Build tool & dev server
- **TypeScript** — Type safety
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — Premium component library
- **React Router v6** — Client-side routing
- **React Query (TanStack)** — Server state management
- **Framer Motion** — Animations
- **Lucide Icons** — Icon set

### Backend
- **FastAPI** — Modern async Python web framework
- **Uvicorn** — ASGI server
- **Pydantic v2** — Data validation & settings
- **Loguru** — Structured logging
- *(Future)* **ChromaDB** — Vector database
- *(Future)* **SQLAlchemy** — ORM
- *(Future)* **Ollama** — Local LLM runtime

### AI (Planned)
- **Ollama** — Local LLM server
- **Llama 3.2:3B** — Default language model
- **ChromaDB** — Vector storage
- **Sentence Transformers** — Embeddings

---

## 📜 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

This is a private, internal project. Please follow the coding standards outlined in `docs/CONTRIBUTING.md`.

---

*Built with ❤️ — Offline, Private, Powerful.*
