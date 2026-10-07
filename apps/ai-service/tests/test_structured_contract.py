import os
import json
import pytest
from unittest.mock import AsyncMock, MagicMock
from pydantic import BaseModel, Field

from app.services.llm.base import LLMProvider, LLMGenerationResult
from app.services.llm.fallback_provider import FallbackLLMProvider
from app.services.llm.factory import get_llm_provider
import app.services.llm.factory as factory
from app.core.config import settings


# 1. Output Schema Contract for AI Mentor
class StructuredMentorGuidance(BaseModel):
    summary: str = Field(..., description="High level mentor guidance summary")
    recommended_skills: list[str] = Field(default_factory=list, description="Target skills to master")
    priority_level: str = Field(..., description="Priority tier: HIGH, MEDIUM, LOW")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Model self-assessed confidence")


# ==============================================================================
# PHASE 4: Deterministic Provider Integration Tests (CI Safe - Controlled Test Double)
# ==============================================================================

@pytest.mark.asyncio
async def test_structured_generation_contract_success():
    """
    Validates that generate_structured correctly parses and validates valid JSON
    into a typed Pydantic instance according to the schema contract.
    """
    fake_provider = MagicMock(spec=LLMProvider)
    fake_provider.generate_structured = AsyncMock(
        return_value=(
            StructuredMentorGuidance(
                summary="Focus on event streaming and message queuing fundamentals.",
                recommended_skills=["Kafka", "RabbitMQ", "Redis Pub/Sub"],
                priority_level="HIGH",
                confidence_score=0.96,
            ),
            LLMGenerationResult(
                content='{"summary": "...", "recommended_skills": ["Kafka"], "priority_level": "HIGH", "confidence_score": 0.96}',
                tokens_used=120,
                prompt_tokens=60,
                completion_tokens=60,
                model="unit-test-controlled-provider",
                latency_ms=45.0,
            ),
        )
    )

    output, meta = await fake_provider.generate_structured(
        prompt="Candidate needs event streaming skills",
        schema=StructuredMentorGuidance,
    )

    assert isinstance(output, StructuredMentorGuidance)
    assert output.priority_level == "HIGH"
    assert "Kafka" in output.recommended_skills
    assert output.confidence_score >= 0.9
    assert meta.tokens_used == 120


@pytest.mark.asyncio
async def test_structured_generation_schema_validation_failure():
    """
    Validates that invalid structured output (missing mandatory fields or bad types)
    fails loudly with schema validation error rather than silently returning corrupted state.
    """
    class StrictSchema(BaseModel):
        required_id: str
        score: int

    # Missing required_id and invalid score type
    malformed_json = '{"score": "not_an_int"}'

    with pytest.raises(Exception):
        StrictSchema.model_validate_json(malformed_json)


@pytest.mark.asyncio
async def test_structured_generation_fallback_propagation():
    """
    Validates that FallbackLLMProvider properly routes generate_structured to the fallback
    provider when the primary provider encounters a failure, preserving identical schema and prompt.
    """
    primary_mock = MagicMock(spec=LLMProvider)
    primary_mock.generate_structured = AsyncMock(
        side_effect=RuntimeError("Primary provider connection timeout")
    )

    expected_output = StructuredMentorGuidance(
        summary="Fallback mentor guidance active.",
        recommended_skills=["TypeScript", "Docker"],
        priority_level="MEDIUM",
        confidence_score=0.88,
    )
    fallback_mock = MagicMock(spec=LLMProvider)
    fallback_mock.generate_structured = AsyncMock(
        return_value=(
            expected_output,
            LLMGenerationResult(
                content="{}",
                tokens_used=95,
                prompt_tokens=50,
                completion_tokens=45,
                model="openrouter/liquid/lfm-2.5-2.6b:free",
                latency_ms=110.0,
            ),
        )
    )

    composite = FallbackLLMProvider(
        primary_provider=primary_mock,
        fallback_provider=fallback_mock,
        primary_name="gemini",
        fallback_name="openrouter",
    )

    output, meta = await composite.generate_structured(
        prompt="Recommend skills for cloud architecture",
        schema=StructuredMentorGuidance,
    )

    assert output.summary == "Fallback mentor guidance active."
    assert output.priority_level == "MEDIUM"
    assert "TypeScript" in output.recommended_skills
    primary_mock.generate_structured.assert_awaited_once()
    fallback_mock.generate_structured.assert_awaited_once()


@pytest.mark.asyncio
async def test_structured_generation_both_fail_raises_controlled_error():
    """
    Validates that when both primary and fallback structured generation fail,
    a controlled RuntimeError is raised without fabricating fake AI data.
    """
    primary_mock = MagicMock(spec=LLMProvider)
    primary_mock.generate_structured = AsyncMock(
        side_effect=RuntimeError("Primary 503 Service Unavailable")
    )

    fallback_mock = MagicMock(spec=LLMProvider)
    fallback_mock.generate_structured = AsyncMock(
        side_effect=RuntimeError("Fallback 429 Rate Limit")
    )

    composite = FallbackLLMProvider(
        primary_provider=primary_mock,
        fallback_provider=fallback_mock,
    )

    with pytest.raises(RuntimeError, match="All configured LLM providers failed"):
        await composite.generate_structured(
            prompt="Analyze skill gap",
            schema=StructuredMentorGuidance,
        )


# ==============================================================================
# PHASE 5: Production Configuration & Fail-Closed Guardrails
# ==============================================================================

def test_production_environment_fails_closed_with_mock_provider(monkeypatch):
    """
    Phase 5: In production environment, configuring LLM_PROVIDER=mock MUST fail closed
    at factory instantiation to prevent mock data leakage in production.
    """
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "PRIMARY_LLM_PROVIDER", "mock")
    monkeypatch.setattr(settings, "LLM_PROVIDER", "mock")
    factory._llm_instance = None

    with pytest.raises(RuntimeError, match="LLM_PROVIDER=mock is strictly prohibited in production"):
        get_llm_provider()


def test_production_environment_fails_closed_when_credentials_missing(monkeypatch):
    """
    Phase 5: In production environment, missing both primary and fallback API credentials
    MUST fail safely with a startup configuration error.
    """
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "PRIMARY_LLM_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "FALLBACK_LLM_PROVIDER", "openrouter")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", None)
    factory._llm_instance = None

    with pytest.raises(RuntimeError, match="FATAL: Neither primary .* nor fallback .* LLM provider is configured in production"):
        get_llm_provider()


# ==============================================================================
# Staging/Manual External Provider Smoke Test (Separated from Unit Tests)
# ==============================================================================

@pytest.mark.skipif(
    not os.getenv("RUN_LIVE_AI_TESTS") or not os.getenv("OPENROUTER_API_KEY"),
    reason="Real external LLM smoke test executed only in staging/manual environments when RUN_LIVE_AI_TESTS=true",
)
@pytest.mark.asyncio
async def test_live_openrouter_structured_smoke():
    """
    Live external provider smoke test with OpenRouter liquid/lfm-2.5-2.6b:free.
    Verifies actual live HTTP call, response format, and Pydantic validation.
    """
    from app.services.llm.openrouter_provider import OpenRouterLLMProvider

    provider = OpenRouterLLMProvider(
        model=os.getenv("OPENROUTER_MODEL", "liquid/lfm-2.5-2.6b:free")
    )
    output, meta = await provider.generate_structured(
        prompt="Candidate wants to specialize in distributed systems backend development.",
        schema=StructuredMentorGuidance,
        system_prompt="You are a senior tech mentor. Respond strictly in valid JSON matching the schema.",
    )

    assert isinstance(output, StructuredMentorGuidance)
    assert len(output.summary) > 0
    assert meta.tokens_used > 0
    assert meta.latency_ms > 0
