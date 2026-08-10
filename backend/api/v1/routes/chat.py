from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from backend.services.chat_service import ChatService
from fastapi.responses import StreamingResponse

router = APIRouter()

class ChatRequest(BaseModel):
    question: str
    source_type: Optional[str] = Field("all", description="Source filter: 'all', 'pdf', 'audio', 'video'")
    top_k: Optional[int] = Field(5, description="Number of top chunks to retrieve")

@router.post("/")
async def chat_endpoint(request: ChatRequest):
    """
    Accepts a question, performs top-k semantic retrieval with metadata filtering,
    queries Ollama, and streams the response with sources, confidence scores, and metrics.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    source_filter = request.source_type.strip().lower() if request.source_type else "all"
    top_k_val = request.top_k if request.top_k and request.top_k > 0 else 5

    try:
        return StreamingResponse(
            ChatService.chat_with_docs(
                question=request.question,
                source_type=source_filter,
                top_k=top_k_val
            ),
            media_type="application/x-ndjson"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
