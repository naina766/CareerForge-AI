from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class EvaluationCase(BaseModel):
    """Represents a strictly candidate-scoped synthetic evaluation scenario."""
    id: str = Field(..., description="Unique case identifier")
    candidate_id: str = Field(..., description="Authorized candidate scope")
    question: str = Field(..., description="User query or input prompt")
    expected_context: List[str] = Field(default_factory=list, description="IDs of expected retrieved chunks or documents")
    expected_answer_facts: List[str] = Field(default_factory=list, description="Key factual phrases required in answer")
    forbidden_answer_facts: List[str] = Field(default_factory=list, description="Hallucinated or foreign facts that must NOT appear")
    allowed_sources: List[str] = Field(default_factory=list, description="Candidate-authorized chunk IDs")
    forbidden_sources: List[str] = Field(default_factory=list, description="Foreign candidate or invalid source IDs")
    expected_citations: List[str] = Field(default_factory=list, description="Expected citation IDs")
    category: str = Field(default="general", description="Scenario category (factual, resume, skill_gap, isolation, etc.)")
    difficulty: str = Field(default="medium", description="Case complexity (easy, medium, hard)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional evaluation context")


class EvaluationResult(BaseModel):
    """Outcome metrics for an individual evaluation case."""
    case_id: str
    candidate_id: str
    category: str
    success: bool
    relevance_score: float = 0.0
    groundedness_score: float = 0.0
    citation_score: float = 0.0
    unsupported_claims_detected: bool = False
    unsupported_claim_count: int = 0
    isolation_preserved: bool = True
    injection_blocked: bool = True
    secret_leakage_blocked: bool = True
    latency_ms: float = 0.0
    details: Dict[str, Any] = Field(default_factory=dict)


class EvaluationSummary(BaseModel):
    """Aggregated scorecard across all evaluation suites."""
    dataset: str = "careerforge-golden-v1"
    evaluation_version: str = "1.0.0"
    total_cases: int
    passed_cases: int
    pass_rate: float
    avg_relevance: float
    avg_groundedness: float
    avg_citation_correctness: float
    unsupported_claim_rate: float
    isolation_pass_rate: float
    injection_pass_rate: float
    secret_leakage_pass_rate: float
    deterministic_formula_accuracy: float
    hard_gates_passed: bool = True
    quality_gates_passed: bool = True
    status: str = "PASS"
    category_metrics: Dict[str, Any] = Field(default_factory=dict)
    gate_details: Dict[str, Any] = Field(default_factory=dict)
    failed_cases: List[str] = Field(default_factory=list)
    thresholds_passed: bool = True
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
