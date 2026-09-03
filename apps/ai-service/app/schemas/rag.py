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
    use_vector_search: bool = False
    top_k: int = 5

class RAGGenerateResponse(BaseModel):
    success: bool = True
    answer: str
    status: Literal["SUCCESS", "INSUFFICIENT_CONTEXT", "BLOCKED", "FALLBACK"] = "SUCCESS"
    sources: List[RAGSourceSnippet] = Field(default_factory=list)
    confidence: float = 0.95
    model: str = "careerforge-grounded-rag-v1"
    latency_ms: float = 0.0

class SkillGapAnalysisRequest(BaseModel):
    candidate_skills: List[str]
    target_role: str
    experience_years: Optional[float] = 0.0
    context_documents: List[RAGSourceSnippet] = Field(default_factory=list)

class SkillGapAnalysisResponse(BaseModel):
    success: bool = True
    target_role: str
    existing_skills: List[str]
    missing_skills: List[str]
    priority_skills: List[str]
    grounding_evidence: List[str]
    citations: List[RAGSourceSnippet] = Field(default_factory=list)

class CareerRoleRecommendationRequest(BaseModel):
    candidate_skills: List[str]
    experience_summary: Optional[str] = ""
    target_industries: Optional[List[str]] = Field(default_factory=list)
    context_documents: List[RAGSourceSnippet] = Field(default_factory=list)

class RecommendedRole(BaseModel):
    title: str
    match_fit: str # High, Moderate, Developing
    rationale: str
    key_overlapping_skills: List[str]
    gap_skills: List[str]

class CareerRoleRecommendationResponse(BaseModel):
    success: bool = True
    recommendations: List[RecommendedRole]
    citations: List[RAGSourceSnippet] = Field(default_factory=list)

class LearningRoadmapRequest(BaseModel):
    skill_gaps: List[str]
    target_role: str
    context_documents: List[RAGSourceSnippet] = Field(default_factory=list)

class LearningModule(BaseModel):
    skill: str
    priority: Literal["HIGH", "MEDIUM", "LOW"]
    sequence_order: int
    focus_areas: List[str]
    supporting_context: str

class LearningRoadmapResponse(BaseModel):
    success: bool = True
    target_role: str
    modules: List[LearningModule]
    citations: List[RAGSourceSnippet] = Field(default_factory=list)
