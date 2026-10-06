import os
import re
import random
import hashlib
import time
from typing import Optional, Dict, Any, List
from ..core.config import settings
from ..core.logging import logger

# SENSITIVE PATTERNS FOR TRACE REDACTION
REDACTION_PATTERNS = [
    # API Keys
    (re.compile(r"AIzaSy[A-Za-z0-9_-]{33}"), "[REDACTED_GEMINI_KEY]"),
    (re.compile(r"sk-[A-Za-z0-9]{20,}"), "[REDACTED_OPENAI_KEY]"),
    (re.compile(r"lsv2_[A-Za-z0-9_-]{20,}"), "[REDACTED_LANGSMITH_KEY]"),
    # JWTs & Bearer Tokens
    (re.compile(r"Bearer\s+eyJ[A-Za-z0-9_-]{20,}", re.IGNORECASE), "Bearer [REDACTED_JWT]"),
    (re.compile(r"eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}"), "[REDACTED_JWT]"),
    # Database URLs
    (re.compile(r"(postgres(?:ql)?|redis)://[^\s:@]*:[^\s@]+@[^\s/]+", re.IGNORECASE), r"\1://[REDACTED_DB_CREDENTIALS]"),
    # Raw Exception Traces
    (re.compile(r"Traceback\s+\(most\s+recent\s+call\s+last\):.*", re.DOTALL), "[REDACTED_STACK_TRACE]"),
]

# Sensitive keys to drop or mask completely from metadata dictionaries
SENSITIVE_KEYS = {
    "password", "secret", "token", "authorization", "api_key",
    "apikey", "full_resume", "resume_text", "raw_query", "user_message",
    "conversation_history", "recent_history", "cleaned_query", "grounded_prompt",
    "database_url", "access_token", "refresh_token"
}

_warned_missing_key = False


def is_tracing_enabled(sample: bool = True) -> bool:
    """
    Step 12: Determines whether LangSmith tracing is currently enabled and configured.
    Safely disables tracing if credentials are missing or sampling threshold is exceeded.
    """
    global _warned_missing_key

    # Check environment override or settings
    env_tracing = os.environ.get("LANGSMITH_TRACING")
    if env_tracing is not None:
        tracing_flag = env_tracing.lower() in ("true", "1", "yes")
    else:
        tracing_flag = getattr(settings, "LANGSMITH_TRACING", False)

    if not tracing_flag:
        return False

    api_key = os.environ.get("LANGSMITH_API_KEY") or getattr(settings, "LANGSMITH_API_KEY", None)
    if not api_key:
        if not _warned_missing_key:
            logger.warning(
                "[LangSmith] LANGSMITH_TRACING=true but LANGSMITH_API_KEY is not configured. "
                "Disabling AI tracing gracefully without failing requests."
            )
            _warned_missing_key = True
        return False

    # Trace Sampling / Cost Control (Step 14)
    if sample:
        sample_rate = float(
            os.environ.get("LANGSMITH_SAMPLE_RATE")
            or getattr(settings, "LANGSMITH_SAMPLE_RATE", 1.0)
        )
        if sample_rate < 1.0 and random.random() > sample_rate:
            return False

    return True


def mask_candidate_id(candidate_id: Optional[str]) -> Optional[str]:
    """
    Step 4: Returns a privacy-safe, non-reversible candidate pseudonymous token
    suitable for grouping traces without leaking primary database keys or PII.
    """
    if not candidate_id:
        return None
    salt = "careerforge_ls_salt_v1"
    digest = hashlib.sha256(f"{salt}_{candidate_id}".encode("utf-8")).hexdigest()[:12]
    return f"cand_safe_{digest}"


def sanitize_trace_data(data: Any, max_string_len: int = 500) -> Any:
    """
    Step 5: Recursively scrubs private candidate content, tokens, passwords,
    and credentials from metadata before it is sent to LangSmith.
    """
    if data is None:
        return None

    if isinstance(data, str):
        cleaned = data
        for pattern, replacement in REDACTION_PATTERNS:
            cleaned = pattern.sub(replacement, cleaned)
        if len(cleaned) > max_string_len:
            cleaned = cleaned[:max_string_len] + "... [truncated_for_privacy]"
        return cleaned

    if isinstance(data, dict):
        sanitized_dict = {}
        for k, v in data.items():
            k_lower = str(k).lower()
            if any(s in k_lower for s in SENSITIVE_KEYS):
                sanitized_dict[k] = "[REDACTED_PRIVACY]"
            else:
                sanitized_dict[k] = sanitize_trace_data(v, max_string_len)
        return sanitized_dict

    if isinstance(data, list):
        return [sanitize_trace_data(item, max_string_len) for item in data[:20]]

    if isinstance(data, (int, float, bool)):
        return data

    return str(data)[:max_string_len]


class CareerAssistantTracer:
    """
    Centralized LangSmith workflow observer for CareerForge AI.
    Guarantees privacy-first redaction and failure isolation: any LangSmith error
    or network disconnect is caught and logged without affecting runtime AI workflows.
    """

    def __init__(
        self,
        request_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
        candidate_id: Optional[str] = None,
        intent: Optional[str] = "general_career",
        project_name: Optional[str] = None,
    ):
        self.enabled = is_tracing_enabled()
        self.request_id = request_id
        self.correlation_id = correlation_id
        self.candidate_safe_id = mask_candidate_id(candidate_id)
        self.intent = intent
        self.project_name = project_name or getattr(settings, "LANGSMITH_PROJECT", "careerforge-ai")
        self.root_run: Optional[Any] = None
        self.start_time: float = time.perf_counter()
        self.active_spans: Dict[str, Any] = {}

        if self.enabled:
            self._initialize_root_run()

    def _initialize_root_run(self):
        """Initializes LangSmith root RunTree with failure isolation."""
        try:
            from langsmith.run_trees import RunTree

            metadata = {
                "request_id": self.request_id,
                "correlation_id": self.correlation_id,
                "candidate_safe_id": self.candidate_safe_id,
                "intent": self.intent,
                "service": "ai-service",
                "framework": "langgraph",
            }

            self.root_run = RunTree(
                name="CareerAssistantWorkflow",
                run_type="chain",
                project_name=self.project_name,
                inputs={"intent": self.intent, "request_id": self.request_id},
                extra={"metadata": sanitize_trace_data(metadata)},
            )
            self.root_run.post()
        except Exception as e:
            logger.warning("[LangSmith] Failed to initialize root run tree: %s", type(e).__name__)
            self.root_run = None

    def trace_node(self, node_name: str, inputs: Optional[Dict[str, Any]] = None) -> Optional[Any]:
        """Traces the execution of an individual LangGraph state node."""
        if not self.enabled or not self.root_run:
            return None

        try:
            safe_inputs = sanitize_trace_data(inputs or {})
            span = self.root_run.create_child(
                name=f"node:{node_name}",
                run_type="chain",
                inputs=safe_inputs,
                extra={"metadata": {"node": node_name, "request_id": self.request_id}},
            )
            span.post()
            self.active_spans[node_name] = span
            return span
        except Exception as e:
            logger.warning("[LangSmith] Failed to trace node %s: %s", node_name, type(e).__name__)
            return None

    def end_node(
        self,
        node_name: str,
        outputs: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None,
    ):
        """Ends an active node span with sanitized output metadata."""
        if not self.enabled or not self.root_run:
            return

        span = self.active_spans.pop(node_name, None)
        if not span:
            return

        try:
            safe_outputs = sanitize_trace_data(outputs or {})
            span.end(
                outputs=safe_outputs,
                error=error,
            )
            span.patch()
        except Exception as e:
            logger.warning("[LangSmith] Failed to end node span %s: %s", node_name, type(e).__name__)

    def trace_faiss_retrieval(
        self,
        result_count: int,
        requested_k: int,
        latency_ms: float,
        candidate_scoped: bool = True,
        resume_scoped: bool = True,
        error: Optional[str] = None,
    ):
        """
        Step 8: Instruments FAISS semantic vector retrieval with safe metadata only.
        Never transmits raw resume chunk text or candidate PII.
        """
        if not self.enabled or not self.root_run:
            return

        try:
            span = self.root_run.create_child(
                name="FAISS:semantic_search",
                run_type="retriever",
                inputs={
                    "requested_top_k": requested_k,
                    "candidate_scoped": candidate_scoped,
                    "resume_scoped": resume_scoped,
                },
                extra={
                    "metadata": {
                        "vector_store": "FAISS",
                        "latency_ms": round(latency_ms, 2),
                        "result_count": result_count,
                        "candidate_safe_id": self.candidate_safe_id,
                    }
                },
            )
            span.end(
                outputs={
                    "result_count": result_count,
                    "status": "SUCCESS" if not error else "ERROR",
                },
                error=error,
            )
            span.post()
        except Exception as e:
            logger.warning("[LangSmith] Failed to trace FAISS retrieval: %s", type(e).__name__)

    def trace_llm_call(
        self,
        provider: str,
        model: str,
        latency_ms: float,
        temperature: float = 0.2,
        tokens_used: Optional[int] = None,
        error: Optional[str] = None,
    ):
        """
        Step 7: Instruments LLM provider invocation without storing raw private prompts.
        """
        if not self.enabled or not self.root_run:
            return

        try:
            span = self.root_run.create_child(
                name=f"LLM:{provider}:{model}",
                run_type="llm",
                inputs={"provider": provider, "model": model, "temperature": temperature},
                extra={
                    "metadata": {
                        "provider": provider,
                        "model": model,
                        "latency_ms": round(latency_ms, 2),
                        "tokens_used": tokens_used or 0,
                    }
                },
            )
            span.end(
                outputs={"model": model, "status": "SUCCESS" if not error else "FAILED"},
                error=error,
            )
            span.post()
        except Exception as e:
            logger.warning("[LangSmith] Failed to trace LLM call: %s", type(e).__name__)

    def trace_security_event(
        self,
        event_type: str,
        block_reason: Optional[str] = None,
    ):
        """
        Step 9: Instruments prompt-guard or output-gate security events safely.
        Never transmits malicious attack payloads to LangSmith.
        """
        if not self.enabled or not self.root_run:
            return

        try:
            span = self.root_run.create_child(
                name=f"SecurityGate:{event_type}",
                run_type="chain",
                inputs={"event_type": event_type},
                extra={
                    "metadata": {
                        "event_type": event_type,
                        "blocked": True,
                        "reason": block_reason or "Policy violation",
                        "candidate_safe_id": self.candidate_safe_id,
                    }
                },
            )
            span.end(
                outputs={"action": "BLOCKED", "reason": block_reason or "Security directive enforced"},
            )
            span.post()
        except Exception as e:
            logger.warning("[LangSmith] Failed to trace security event: %s", type(e).__name__)

    def end_trace(
        self,
        final_status: str,
        confidence: float = 1.0,
        citations_count: int = 0,
        retries_used: int = 0,
        error: Optional[str] = None,
    ):
        """Concludes the root workflow trace with performance & outcome metrics."""
        if not self.enabled or not self.root_run:
            return

        total_latency_ms = (time.perf_counter() - self.start_time) * 1000

        try:
            self.root_run.end(
                outputs={
                    "status": final_status,
                    "confidence": confidence,
                    "citations_count": citations_count,
                    "retries_used": retries_used,
                    "latency_ms": round(total_latency_ms, 2),
                },
                error=error,
            )
            self.root_run.patch()
        except Exception as e:
            logger.warning("[LangSmith] Failed to end root trace: %s", type(e).__name__)


def get_tracer(
    request_id: Optional[str] = None,
    correlation_id: Optional[str] = None,
    candidate_id: Optional[str] = None,
    intent: Optional[str] = "general_career",
    project_name: Optional[str] = None,
) -> CareerAssistantTracer:
    """Factory helper to obtain a request-scoped tracer instance."""
    return CareerAssistantTracer(
        request_id=request_id,
        correlation_id=correlation_id,
        candidate_id=candidate_id,
        intent=intent,
        project_name=project_name,
    )
