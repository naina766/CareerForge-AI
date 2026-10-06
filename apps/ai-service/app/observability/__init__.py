"""
CareerForge AI Observability & Tracing Package (Phase 8).
Provides privacy-first LangSmith instrumentation with failure isolation and redaction.
"""

from .langsmith import (
    is_tracing_enabled,
    mask_candidate_id,
    sanitize_trace_data,
    CareerAssistantTracer,
    get_tracer,
)

__all__ = [
    "is_tracing_enabled",
    "mask_candidate_id",
    "sanitize_trace_data",
    "CareerAssistantTracer",
    "get_tracer",
]
