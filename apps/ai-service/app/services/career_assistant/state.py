from typing import TypedDict, Optional, List, Dict, Any, Literal


class CareerAssistantState(TypedDict, total=False):
    """
    Strongly typed LangGraph state for the Career Assistant workflow.
    Ensures candidate scoping, retrieval containment, and auditability.
    """
    # Candidate & Session Scoping
    candidate_id: Optional[str]
    resume_id: Optional[str]
    job_id: Optional[str]
    conversation_id: Optional[str]
    request_id: Optional[str]
    correlation_id: Optional[str]
    tracer: Optional[Any]

    # User Input & History
    user_message: str
    cleaned_query: str
    recent_history: List[Dict[str, str]]
    use_vector_search: bool

    # Question Understanding & Routing
    intent: str
    required_context: List[str]
    is_blocked: bool
    blocked_reason: Optional[str]

    # Retrieved Contexts (Candidate-Scoped)
    candidate_context: Optional[Dict[str, Any]]
    job_context: Optional[Dict[str, Any]]
    skill_gap_context: Optional[List[str]]
    application_context: Optional[List[Dict[str, Any]]]
    retrieved_context: List[Dict[str, Any]]

    # Grounded Prompt Envelope (LangChain Formatted)
    system_prompt: str
    grounded_prompt: str

    # Generation Outputs
    generated_response: Optional[str]
    citations: List[Dict[str, Any]]
    confidence: float
    model_name: str

    # Grounding Validation & Retry Control
    validation_result: Optional[Dict[str, Any]]
    is_valid: bool
    status: Literal["SUCCESS", "INSUFFICIENT_CONTEXT", "BLOCKED", "FALLBACK"]
    retry_count: int
    max_retries: int
    error: Optional[str]
    latency_ms: float
