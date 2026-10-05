from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"


class DocumentResponse(BaseModel):
    id: str
    filename: str
    page_count: int
    chunk_count: int
    status: Literal["processing", "ready", "failed"]


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]


class MessageItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    question: str = Field(..., max_length=1000)
    history: List[MessageItem] = Field(default_factory=list)
    document_ids: Optional[List[str]] = None


class SourceSnippet(BaseModel):
    filename: str
    page: int
    similarity: float
    snippet: str
