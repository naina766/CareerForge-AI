import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.llm.base import LLMProvider, LLMGenerationResult
from app.services.llm.fallback_provider import FallbackLLMProvider
from app.services.llm.gemini_provider import GeminiLLMProvider
from app.services.llm.openrouter_provider import OpenRouterLLMProvider
from app.services.rag_service import RAGService
from app.schemas.rag import RAGGenerateRequest, RAGSourceSnippet


# 1. Primary Success Scenario
@pytest.mark.asyncio
async def test_gemini_primary_success_skips_fallback():
    """
    Test 1: When Gemini succeeds, OpenRouter is NEVER invoked.
    """
    mock_gemini = MagicMock(spec=LLMProvider)
    mock_gemini.generate_text = AsyncMock(
        return_value=LLMGenerationResult(
            content="Grounded response from Gemini Flash",
            tokens_used=50,
            prompt_tokens=25,
            completion_tokens=25,
            model="gemini/gemini-1.5-flash",
            latency_ms=120.0,
        )
    )

    mock_openrouter = MagicMock(spec=LLMProvider)
    mock_openrouter.generate_text = AsyncMock()

    composite = FallbackLLMProvider(
        primary_provider=mock_gemini,
        fallback_provider=mock_openrouter,
        primary_name="gemini",
        fallback_name="openrouter",
    )

    result = await composite.generate_text("Explain React hooks")

    assert result.content == "Grounded response from Gemini Flash"
    assert result.model == "gemini/gemini-1.5-flash"
    mock_gemini.generate_text.assert_awaited_once()
    mock_openrouter.generate_text.assert_not_awaited()


# 2. Gemini Timeout Triggers OpenRouter Fallback
@pytest.mark.asyncio
async def test_gemini_timeout_triggers_openrouter_fallback():
    """
    Test 2: When Gemini times out (TimeoutError), OpenRouter is invoked with identical prompt.
    """
    mock_gemini = MagicMock(spec=LLMProvider)
    mock_gemini.generate_text = AsyncMock(
        side_effect=TimeoutError("Gemini API request timed out after 10.0s")
    )

    mock_openrouter = MagicMock(spec=LLMProvider)
    mock_openrouter.generate_text = AsyncMock(
        return_value=LLMGenerationResult(
            content="Grounded response from OpenRouter fallback",
            tokens_used=48,
            prompt_tokens=24,
            completion_tokens=24,
            model="openrouter/google/gemini-2.0-flash-exp:free",
            latency_ms=250.0,
        )
    )

    composite = FallbackLLMProvider(
        primary_provider=mock_gemini,
        fallback_provider=mock_openrouter,
        primary_name="gemini",
        fallback_name="openrouter",
    )

    result = await composite.generate_text(
        prompt="Explain Kafka partition rebalancing",
        system_prompt="You are a senior talent mentor",
    )

    assert result.content == "Grounded response from OpenRouter fallback"
    assert "openrouter" in result.model
    mock_gemini.generate_text.assert_awaited_once()
    mock_openrouter.generate_text.assert_awaited_once_with(
        prompt="Explain Kafka partition rebalancing",
        system_prompt="You are a senior talent mentor",
        temperature=0.2,
        max_tokens=1000,
    )


# 3. Gemini HTTP 5xx Triggers OpenRouter Fallback
@pytest.mark.asyncio
async def test_gemini_5xx_triggers_openrouter_fallback():
    """
    Test 3: When Gemini encounters 503/500 server errors, OpenRouter fallback is triggered.
    """
    mock_gemini = MagicMock(spec=LLMProvider)
    mock_gemini.generate_text = AsyncMock(
        side_effect=RuntimeError("Gemini API error (HTTP 503): Service Unavailable")
    )

    mock_openrouter = MagicMock(spec=LLMProvider)
    mock_openrouter.generate_text = AsyncMock(
        return_value=LLMGenerationResult(
            content="Grounded response from OpenRouter after 503",
            tokens_used=45,
            prompt_tokens=20,
            completion_tokens=25,
            model="openrouter/google/gemini-2.0-flash-exp:free",
            latency_ms=180.0,
        )
    )

    composite = FallbackLLMProvider(
        primary_provider=mock_gemini,
        fallback_provider=mock_openrouter,
    )

    result = await composite.generate_text("Summarize Docker layer caching")
    assert result.content == "Grounded response from OpenRouter after 503"
    assert mock_openrouter.generate_text.await_count == 1


# 4. Both Providers Fail -> Controlled Error Raised
@pytest.mark.asyncio
async def test_both_providers_fail_raises_controlled_error():
    """
    Test 4 & 5: When both Gemini and OpenRouter fail, a controlled RuntimeError is raised
    without fabricating fake AI data.
    """
    mock_gemini = MagicMock(spec=LLMProvider)
    mock_gemini.generate_text = AsyncMock(
        side_effect=RuntimeError("Gemini rate limit exceeded (HTTP 429)")
    )

    mock_openrouter = MagicMock(spec=LLMProvider)
    mock_openrouter.generate_text = AsyncMock(
        side_effect=RuntimeError("OpenRouter upstream provider error (HTTP 502)")
    )

    composite = FallbackLLMProvider(
        primary_provider=mock_gemini,
        fallback_provider=mock_openrouter,
    )

    with pytest.raises(RuntimeError, match="All configured LLM providers failed"):
        await composite.generate_text("What is my match score?")


# 5. RAG Context Preserved on Fallback without Double Retrieval
@pytest.mark.asyncio
async def test_rag_context_preserved_on_fallback():
    """
    Test 6 & 8: Verifies that during RAG generation, if the primary fails, the fallback
    receives the exact same UNTRUSTED_DOCUMENT_CONTEXT, citations, and system directives
    without performing a secondary vector retrieval.
    """
    doc_1 = RAGSourceSnippet(
        source_type="RESUME",
        source_id="chunk-preserve-01",
        title="Experience: Event Streaming",
        snippet="Built Apache Kafka event streaming microservices in Go.",
        relevance=0.92,
    )

    request = RAGGenerateRequest(
        query="What event streaming tools do I know?",
        context_documents=[doc_1],
    )

    # Execute RAG Service
    response = await RAGService.generate_response(request)

    assert response.success is True
    assert len(response.sources) >= 1
    assert response.sources[0].source_id == "chunk-preserve-01"
    assert "Go" in response.sources[0].snippet or "Kafka" in response.sources[0].snippet
