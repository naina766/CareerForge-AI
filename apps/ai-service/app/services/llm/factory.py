from typing import Optional
from .base import LLMProvider
from .gemini_provider import GeminiLLMProvider
from .openai_provider import OpenAILLMProvider
from .mock_provider import MockLLMProvider
from ...core.config import settings
from ...core.logging import logger

_llm_instance: Optional[LLMProvider] = None

def get_llm_provider(force_provider: Optional[str] = None) -> LLMProvider:
    """
    Factory function returning the active LLM provider instance.
    Supports 'gemini', 'openai', and 'mock'.
    Prohibits 'mock' provider in production environment.
    """
    global _llm_instance

    if force_provider:
        p = force_provider.lower().strip()
        if p == "gemini":
            return GeminiLLMProvider()
        elif p == "openai":
            return OpenAILLMProvider()
        elif p == "mock":
            return MockLLMProvider(dimension=settings.EMBEDDING_DIMENSION)
        raise ValueError(f"Unsupported LLM provider: {force_provider}")

    if _llm_instance is not None:
        return _llm_instance

    provider_name = (settings.LLM_PROVIDER or "gemini").lower().strip()

    if settings.ENVIRONMENT == "production" and provider_name == "mock":
        raise RuntimeError(
            "FATAL: LLM_PROVIDER=mock is strictly prohibited in production environment. "
            "Configure GEMINI_API_KEY or OPENAI_API_KEY."
        )

    if provider_name == "gemini":
        try:
            _llm_instance = GeminiLLMProvider()
        except ValueError as e:
            if settings.ENVIRONMENT != "production":
                logger.warning(f"Gemini initialization failed ({e}), falling back to MockLLMProvider for development")
                _llm_instance = MockLLMProvider(dimension=settings.EMBEDDING_DIMENSION)
            else:
                raise
    elif provider_name == "openai":
        try:
            _llm_instance = OpenAILLMProvider()
        except ValueError as e:
            if settings.ENVIRONMENT != "production":
                logger.warning(f"OpenAI initialization failed ({e}), falling back to MockLLMProvider for development")
                _llm_instance = MockLLMProvider(dimension=settings.EMBEDDING_DIMENSION)
            else:
                raise
    elif provider_name == "mock":
        logger.warning("Using MockLLMProvider (intended for tests and offline development only)")
        _llm_instance = MockLLMProvider(dimension=settings.EMBEDDING_DIMENSION)
    else:
        logger.warning(f"Unknown LLM provider '{provider_name}', falling back to MockLLMProvider")
        _llm_instance = MockLLMProvider(dimension=settings.EMBEDDING_DIMENSION)

    return _llm_instance
