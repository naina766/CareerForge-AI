from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

class RAGSourceSnippet(BaseModel):
    source_type: Literal["RESUME", "JOB", "SKILL_GAP", "LEARNING_PATH", "APPLICATION", "PROFILE", "CAREER_KNOWLEDGE"]
    source_id: Optional[str] = None
    title: str
    snippet: Optional[str] = None
    relevance: Optional[float] = 1.0

class RAGGenerateRequest(BaseModel):
    query: str
    intent: Optional[str] = "GENERAL_CAREER"
    candidate_profile: Optional[Dict[str, Any]] = None
    context_documents: List[RAGSourceSnippet] = Field(default_factory=list)
    recent_history: Optional[List[Dict[str, str]]] = Field(default_factory=list)

class RAGGenerateResponse(BaseModel):
    success: bool = True
    answer: str
    status: Literal["SUCCESS", "INSUFFICIENT_CONTEXT", "BLOCKED", "FALLBACK"] = "SUCCESS"
    sources: List[RAGSourceSnippet] = Field(default_factory=list)
    confidence: float = 0.95
    model: str = "careerforge-grounded-rag-v1"
    latency_ms: float = 0.0
