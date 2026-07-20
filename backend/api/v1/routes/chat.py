from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from backend.services.chat_service import ChatService

router = APIRouter()

class ChatRequest(BaseModel):
    question: str

class ChatSource(BaseModel):
    document: str
    page: Optional[int] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[ChatSource]

from fastapi.responses import StreamingResponse

@router.post("/")
async def chat_endpoint(request: ChatRequest):
    """
    Accepts a question, performs context retrieval from indexed documents,
    queries Ollama, and streams the response with source documents and page numbers.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
        
    try:
        return StreamingResponse(ChatService.chat_with_docs(request.question), media_type="application/x-ndjson")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
