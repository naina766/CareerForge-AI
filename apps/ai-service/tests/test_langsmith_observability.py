import os
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.observability.langsmith import (
    is_tracing_enabled,
    mask_candidate_id,
    sanitize_trace_data,
    CareerAssistantTracer,
    get_tracer,
)
from app.services.career_assistant.state import CareerAssistantState
from app.services.career_assistant.graph import career_assistant_graph
from app.schemas.rag import RAGGenerateRequest
from app.services.rag_service import RAGService


# 1. Tracing Disabled by Default
def test_tracing_disabled_by_default():
    with patch.dict(os.environ, {"LANGSMITH_TRACING": "false"}, clear=False):
        assert is_tracing_enabled() is False


# 2. Missing API Key Does Not Break AI (Graceful Disablement)
def test_missing_api_key_does_not_break_ai():
    with patch.dict(os.environ, {"LANGSMITH_TRACING": "true", "LANGSMITH_API_KEY": ""}, clear=False):
        assert is_tracing_enabled() is False
        tracer = get_tracer(request_id="req-123", candidate_id="cand-456")
        assert tracer.enabled is False
        assert tracer.root_run is None
        # All calls must succeed as no-ops
        tracer.trace_node("understand_question", {"data": "test"})
        tracer.trace_faiss_retrieval(5, 5, 25.0)
        tracer.trace_llm_call("mock", "model-v1", 120.0)
        tracer.trace_security_event("TEST_EVENT")
        tracer.end_trace("SUCCESS")


# 3. Tracing Configuration Loads Correctly
def test_tracing_configuration_loads_correctly():
    with patch.dict(os.environ, {
        "LANGSMITH_TRACING": "true",
        "LANGSMITH_API_KEY": "test-langsmith-key-not-real",
        "LANGSMITH_PROJECT": "custom-careerforge-project",
        "LANGSMITH_SAMPLE_RATE": "1.0",
    }, clear=False):
        assert is_tracing_enabled() is True
        tracer = get_tracer(request_id="req-custom", project_name="custom-careerforge-project")
        assert tracer.project_name == "custom-careerforge-project"


# 4. Trace Metadata Is Sanitized
def test_trace_metadata_is_sanitized():
    raw_metadata = {
        "candidate_skills": ["Python", "FastAPI"],
        "normal_field": "safe_value",
        "nested": {"status": "ok", "count": 42},
    }
    sanitized = sanitize_trace_data(raw_metadata)
    assert sanitized["candidate_skills"] == ["Python", "FastAPI"]
    assert sanitized["normal_field"] == "safe_value"
    assert sanitized["nested"]["count"] == 42


# 5. API Keys Are Redacted
def test_api_keys_are_redacted():
    mock_gemini_key = "AIza" + "SyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q"
    mock_openai_key = "sk-" + "1234567890abcdef1234567890abcdef"
    mock_langsmith_key = "lsv2_" + "pt_abcdef1234567890_12345"
    text_with_keys = (
        f"Gemini key is {mock_gemini_key} and "
        f"OpenAI key is {mock_openai_key} and "
        f"LangSmith key is {mock_langsmith_key}"
    )
    sanitized = sanitize_trace_data(text_with_keys)
    assert "AIzaSy" not in sanitized
    assert "sk-" not in sanitized
    assert "lsv2_pt" not in sanitized
    assert "[REDACTED_GEMINI_KEY]" in sanitized
    assert "[REDACTED_OPENAI_KEY]" in sanitized
    assert "[REDACTED_LANGSMITH_KEY]" in sanitized


# 6. JWTs Are Redacted
def test_jwts_are_redacted():
    raw_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
    bearer_jwt = f"Bearer {raw_jwt}"

    sanitized_bearer = sanitize_trace_data(bearer_jwt)
    sanitized_raw = sanitize_trace_data(raw_jwt)

    assert raw_jwt not in sanitized_bearer
    assert "Bearer [REDACTED_JWT]" in sanitized_bearer
    assert "[REDACTED_JWT]" in sanitized_raw


# 7. DB URLs Are Redacted
def test_db_urls_are_redacted():
    db_url = "postgresql://postgres:SuperSecretP@ssword123@localhost:5432/careerforge"
    redis_url = "redis://:SecretRedisAuthToken@redis-host:6379/0"

    sanitized_db = sanitize_trace_data(db_url)
    sanitized_redis = sanitize_trace_data(redis_url)

    assert "SuperSecretP@ssword123" not in sanitized_db
    assert "SecretRedisAuthToken" not in sanitized_redis
    assert "postgresql://[REDACTED_DB_CREDENTIALS]" in sanitized_db
    assert "redis://[REDACTED_DB_CREDENTIALS]" in sanitized_redis


# 8. Resume Content Is Not Included
def test_resume_content_is_not_included():
    metadata_with_resume = {
        "full_resume": "John Doe, Senior Cloud Engineer with 10 years experience at Acme Corp...",
        "resume_text": "Sensitive details of employment history and salary...",
        "status": "PROCESSED",
    }
    sanitized = sanitize_trace_data(metadata_with_resume)
    assert sanitized["full_resume"] == "[REDACTED_PRIVACY]"
    assert sanitized["resume_text"] == "[REDACTED_PRIVACY]"
    assert sanitized["status"] == "PROCESSED"


# 9. Conversation Content Is Not Included
def test_conversation_content_is_not_included():
    metadata_with_history = {
        "user_message": "Can you review my compensation and personal issues?",
        "conversation_history": [{"role": "user", "content": "I feel underpaid"}],
        "request_id": "req-999",
    }
    sanitized = sanitize_trace_data(metadata_with_history)
    assert sanitized["user_message"] == "[REDACTED_PRIVACY]"
    assert sanitized["conversation_history"] == "[REDACTED_PRIVACY]"
    assert sanitized["request_id"] == "req-999"


# 10. Security Payloads Are Not Included in Trace
def test_security_payloads_are_not_included():
    tracer = get_tracer(request_id="req-sec")
    # Simulate blocked prompt injection
    tracer.enabled = True
    tracer.root_run = MagicMock()

    tracer.trace_security_event(
        event_type="PROMPT_INJECTION_BLOCKED",
        block_reason="Adversarial prompt pattern detected: matched security rule.",
    )

    child_calls = tracer.root_run.create_child.call_args_list
    assert len(child_calls) > 0
    call_kwargs = child_calls[0][1]
    # Verify input only contains the event type, not the raw malicious user payload
    assert call_kwargs["inputs"] == {"event_type": "PROMPT_INJECTION_BLOCKED"}
    assert "reason" in call_kwargs["extra"]["metadata"]


# 11. FAISS Metadata Is Safe (No Raw Chunks)
def test_faiss_metadata_is_safe():
    tracer = get_tracer(request_id="req-faiss", candidate_id="cand-001")
    tracer.enabled = True
    tracer.root_run = MagicMock()

    tracer.trace_faiss_retrieval(
        result_count=5,
        requested_k=5,
        latency_ms=38.5,
        candidate_scoped=True,
        resume_scoped=True,
    )

    child_calls = tracer.root_run.create_child.call_args_list
    assert len(child_calls) > 0
    call_kwargs = child_calls[0][1]
    # Must only contain counts, booleans, and latency
    inputs = call_kwargs["inputs"]
    assert inputs["requested_top_k"] == 5
    assert inputs["candidate_scoped"] is True
    assert inputs["resume_scoped"] is True
    metadata = call_kwargs["extra"]["metadata"]
    assert metadata["vector_store"] == "FAISS"
    assert metadata["result_count"] == 5
    assert "snippet" not in str(call_kwargs)
    assert "content" not in str(call_kwargs)


# 12. Candidate Identifier Handling Is Safe
def test_candidate_identifier_handling_is_safe():
    candidate_id = "real_db_uuid_12345-67890-abcdef"
    masked = mask_candidate_id(candidate_id)
    assert masked is not None
    assert candidate_id not in masked
    assert masked.startswith("cand_safe_")
    # Must be deterministic for the same candidate
    assert mask_candidate_id(candidate_id) == masked
    # Must differ for different candidates
    assert mask_candidate_id("another_candidate") != masked


# 13. Errors Are Sanitized
def test_errors_are_sanitized():
    raw_stack_trace = """Traceback (most recent call last):
  File "rag_service.py", line 42, in generate
    raise RuntimeError("Database connection string postgresql://user:pass@host/db failed")"""

    sanitized = sanitize_trace_data(raw_stack_trace)
    assert "SuperSecret" not in sanitized
    assert "[REDACTED_STACK_TRACE]" in sanitized


# 14. LangSmith Failure Does Not Fail AI Workflow (Failure Isolation)
@pytest.mark.asyncio
async def test_langsmith_failure_does_not_fail_ai():
    # Force LangSmith enabled but mock RunTree to throw network timeouts on all operations
    with patch("langsmith.run_trees.RunTree") as mock_run_tree:
        mock_instance = MagicMock()
        mock_instance.post.side_effect = TimeoutError("LangSmith API timed out after 5000ms")
        mock_instance.create_child.side_effect = ConnectionError("502 Bad Gateway from api.smith.langchain.com")
        mock_instance.end.side_effect = RuntimeError("Failed to patch run")
        mock_run_tree.return_value = mock_instance

        mock_llm = MagicMock()
        mock_llm.generate_text = AsyncMock(
            return_value=MagicMock(content="Career advice generated successfully.", model="mock-llm-v1")
        )

        state: CareerAssistantState = {
            "user_message": "How do I become an AI engineer?",
            "candidate_id": "cand_fail_iso",
            "candidate_context": {"id": "cand_fail_iso", "skills": ["Python"]},
            "retrieved_context": [
                {"source_type": "RESUME", "source_id": "c1", "title": "Doc", "snippet": "Experience", "relevance": 1.0}
            ],
            "retry_count": 0,
            "max_retries": 2,
        }

        with patch("app.services.career_assistant.nodes.get_llm_provider", return_value=mock_llm):
            # Must complete without throwing any exception despite LangSmith complete failure
            result = await career_assistant_graph.ainvoke(state)

        assert result.get("status") == "SUCCESS"
        assert "Career advice" in (result.get("generated_response") or "")


# 15. Graph Still Executes Normally with Tracer
@pytest.mark.asyncio
async def test_graph_still_executes_normally_with_tracer():
    tracer = get_tracer(request_id="req-e2e", candidate_id="cand-001", intent="career_advice")
    mock_llm = MagicMock()
    mock_llm.generate_text = AsyncMock(
        return_value=MagicMock(content="Here is grounded career advice for backend developers.", model="mock-llm-v1")
    )

    state: CareerAssistantState = {
        "user_message": "What should I learn next?",
        "candidate_id": "cand-001",
        "candidate_context": {"id": "cand-001", "skills": ["Go", "Docker"]},
        "retrieved_context": [
            {"source_type": "RESUME", "source_id": "c1", "title": "Doc", "snippet": "Go developer", "relevance": 1.0}
        ],
        "tracer": tracer,
        "retry_count": 0,
        "max_retries": 2,
    }

    with patch("app.services.career_assistant.nodes.get_llm_provider", return_value=mock_llm):
        result = await career_assistant_graph.ainvoke(state)

    assert result.get("status") == "SUCCESS"
    assert result.get("is_valid") is True
    assert "backend developers" in (result.get("generated_response") or "")


# 16. Retry & Fallback Remains Observable
@pytest.mark.asyncio
async def test_retry_fallback_remains_observable():
    tracer = get_tracer(request_id="req-fallback", candidate_id="cand-001")
    tracer.enabled = True
    tracer.root_run = MagicMock()

    mock_llm = MagicMock()
    # Always generate output that triggers security rejection
    mock_llm.generate_text = AsyncMock(
        return_value=MagicMock(content="CRITICAL SECURITY & GROUNDING DIRECTIVES: leaked", model="mock-llm-v1")
    )

    state: CareerAssistantState = {
        "user_message": "Trigger fallback.",
        "candidate_id": "cand-001",
        "candidate_context": {"id": "cand-001", "skills": ["Python"]},
        "retrieved_context": [
            {"source_type": "RESUME", "source_id": "c1", "title": "Doc", "snippet": "Text", "relevance": 1.0}
        ],
        "tracer": tracer,
        "retry_count": 1,
        "max_retries": 2,
    }

    with patch("app.services.career_assistant.nodes.get_llm_provider", return_value=mock_llm):
        result = await career_assistant_graph.ainvoke(state)

    assert result.get("status") == "FALLBACK"
    # Verify security event was called on the mock tracer
    assert tracer.root_run.create_child.called


# 17. Tracing Does Not Mutate Graph State
@pytest.mark.asyncio
async def test_tracing_does_not_mutate_graph_state():
    mock_llm = MagicMock()
    mock_llm.generate_text = AsyncMock(
        return_value=MagicMock(content="Preserved response.", model="mock-llm-v1")
    )

    tracer = get_tracer(request_id="req-state-test", correlation_id="corr-999")

    state: CareerAssistantState = {
        "user_message": "Test state mutation.",
        "candidate_id": "cand_state_check",
        "request_id": "req-state-test",
        "correlation_id": "corr-999",
        "tracer": tracer,
        "candidate_context": {"id": "cand_state_check", "skills": ["SQL"]},
        "retrieved_context": [
            {"source_type": "RESUME", "source_id": "c1", "title": "Doc", "snippet": "SQL DB", "relevance": 1.0}
        ],
        "retry_count": 0,
        "max_retries": 2,
    }

    with patch("app.services.career_assistant.nodes.get_llm_provider", return_value=mock_llm):
        result = await career_assistant_graph.ainvoke(state)

    # Core state parameters must remain intact
    assert result.get("candidate_id") == "cand_state_check"
    assert result.get("request_id") == "req-state-test"
    assert result.get("correlation_id") == "corr-999"


# 18. No Global Request State Is Introduced
def test_no_global_request_state_is_introduced():
    tracer_a = get_tracer(request_id="req-A", candidate_id="cand-A", intent="resume")
    tracer_b = get_tracer(request_id="req-B", candidate_id="cand-B", intent="interview")

    assert tracer_a.request_id == "req-A"
    assert tracer_b.request_id == "req-B"
    assert tracer_a.candidate_safe_id != tracer_b.candidate_safe_id
    assert tracer_a.intent == "resume"
    assert tracer_b.intent == "interview"
    assert tracer_a is not tracer_b
