from typing import Optional
from .base import LLMProvider
from .gemini_provider import GeminiLLMProvider
from .openrouter_provider import OpenRouterLLMProvider
from .openai_provider import OpenAILLMProvider
from .mock_provider import MockLLMProvider
from .fallback_provider import FallbackLLMProvider
from ...core.config import settings
from ...core.logging import logger

_llm_instance: Optional[LLMProvider] = None


def instantiate_single_provider(name: str) -> LLMProvider:
    """Helper to instantiate a standalone provider by name."""
    p = name.lower().strip()
    if p == "gemini":
        return GeminiLLMProvider()
    elif p == "openrouter":
        return OpenRouterLLMProvider()
    elif p == "openai":
        return OpenAILLMProvider()
    elif p == "mock":
        return MockLLMProvider(dimension=settings.EMBEDDING_DIMENSION)
    raise ValueError(f"Unsupported LLM provider: {name}")


def get_llm_provider(force_provider: Optional[str] = None) -> LLMProvider:
    """
    Factory function returning the active LLM provider instance.
    Primary: Google Gemini
    Fallback: OpenRouter
    Prohibits 'mock' provider in production environment.
    """
    global _llm_instance

    if force_provider:
        return instantiate_single_provider(force_provider)

    if _llm_instance is not None:
        return _llm_instance

    primary_name = (settings.PRIMARY_LLM_PROVIDER or settings.LLM_PROVIDER or "gemini").lower().strip()
    fallback_name = (settings.FALLBACK_LLM_PROVIDER or "openrouter").lower().strip()

    if settings.ENVIRONMENT == "production" and primary_name == "mock":
        raise RuntimeError(
            "FATAL: LLM_PROVIDER=mock is strictly prohibited in production environment. "
            "Configure GEMINI_API_KEY and OPENROUTER_API_KEY."
        )

    # If explicitly set to mock
    if primary_name == "mock":
        logger.warning("Using MockLLMProvider (intended for tests and offline development only)")
        _llm_instance = MockLLMProvider(dimension=settings.EMBEDDING_DIMENSION)
        return _llm_instance

    # Try building Primary
    primary_provider: Optional[LLMProvider] = None
    try:
        primary_provider = instantiate_single_provider(primary_name)
    except Exception as e:
        logger.warning(f"Failed to initialize primary provider '{primary_name}': {e}")

    # Try building Fallback
    fallback_provider: Optional[LLMProvider] = None
    try:
        fallback_provider = instantiate_single_provider(fallback_name)
    except Exception as e:
        logger.warning(f"Failed to initialize fallback provider '{fallback_name}': {e}")

    # Combine into Fallback composite or fallback to Mock in dev
    if primary_provider and fallback_provider:
        _llm_instance = FallbackLLMProvider(
            primary_provider=primary_provider,
            fallback_provider=fallback_provider,
            primary_name=primary_name,
            fallback_name=fallback_name,
        )
    elif primary_provider:
        _llm_instance = primary_provider
    elif fallback_provider:
        logger.warning(f"Primary provider '{primary_name}' unavailable. Using '{fallback_name}' as active provider.")
        _llm_instance = fallback_provider
    else:
        if settings.ENVIRONMENT != "production":
            logger.warning("No live LLM API keys configured. Falling back to MockLLMProvider for local development.")
            _llm_instance = MockLLMProvider(dimension=settings.EMBEDDING_DIMENSION)
        else:
            raise RuntimeError(
                "FATAL: Neither primary (Gemini) nor fallback (OpenRouter) LLM provider is configured in production."
            )

    return _llm_instance

