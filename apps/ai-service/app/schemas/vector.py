from typing import List, Optional
from pydantic import BaseModel, Field

class ChunkInput(BaseModel):
    id: str = Field(description="Database ResumeChunk UUID")
    resume_id: str = Field(description="Resume UUID")
    content: str = Field(description="Semantic chunk content text")
    section: str = Field(default="general", description="Resume section (summary, experience, education, skills, projects)")
    chunk_index: int = Field(default=0, description="Ordinal index of chunk")
    content_hash: str = Field(default="", description="SHA-256 content hash for stale detection")

class IndexResumeRequest(BaseModel):
    resume_id: str = Field(description="Resume UUID to index")
    chunks: List[ChunkInput] = Field(description="List of semantic resume chunks to embed and store")
    embedding_model: Optional[str] = Field(default="sentence-transformers/all-MiniLM-L6-v2")
    embedding_version: Optional[int] = Field(default=1)

class IndexResumeResponse(BaseModel):
    success: bool = True
    resume_id: str
    indexed_count: int
    embedding_model: str
    embedding_dimension: int
    index_version: int = 1

class VectorSearchRequest(BaseModel):
    query: str = Field(description="Search query string")
    top_k: int = Field(default=5, ge=1, le=50, description="Maximum number of nearest neighbors (1-50)")
    resume_id_filter: Optional[str] = Field(default=None, description="Optional resume ID scope filter")

class VectorSearchMatch(BaseModel):
    chunk_id: str
    resume_id: str
    section: str
    similarity_score: float

class VectorSearchResponse(BaseModel):
    query: str
    results: List[VectorSearchMatch]
    total_matched: int

class VectorStatsResponse(BaseModel):
    total_vectors: int
    embedding_dimension: int
    embedding_model: str
    index_version: int
