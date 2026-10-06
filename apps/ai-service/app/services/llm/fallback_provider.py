import time
from typing import List, Optional, Type
from pydantic import BaseModel
from .base import LLMProvider, LLMGenerationResult
from ...core.logging import logger
from ...core.config import settings


class FallbackLLMProvider(LLMProvider):
    """
    Composite LLM provider that executes a primary provider (e.g. Google Gemini)
    and automatically falls back to a secondary provider (e.g. OpenRouter) upon
    transient provider errors, 5xx, or timeouts, without re-retrieving context.
    """

    def __init__(
        self,
        primary_provider: LLMProvider,
        fallback_provider: Optional[LLMProvider] = None,
        primary_name: str = "gemini",
        fallback_name: str = "openrouter",
    ):
        self.primary = primary_provider
        self.fallback = fallback_provider
        self.primary_name = primary_name
        self.fallback_name = fallback_name

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1000,
    ) -> LLMGenerationResult:
        primary_error = None
        try:
            return await self.primary.generate_text(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
            )
        except Exception as e:
            primary_error = e
            logger.warning(
                f"[FallbackLLMProvider] Primary provider '{self.primary_name}' failed ({type(e).__name__}: {e}). "
                f"Falling back to '{self.fallback_name}' with identical grounded prompt."
            )

        if self.fallback is not None:
            try:
                result = await self.fallback.generate_text(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                logger.info(
                    f"[FallbackLLMProvider] Fallback provider '{self.fallback_name}' succeeded."
                )
                return result
            except Exception as fb_error:
                logger.error(
                    f"[FallbackLLMProvider] Fallback provider '{self.fallback_name}' also failed ({fb_error})."
                )
                raise RuntimeError(
                    f"All configured LLM providers failed. Primary ({self.primary_name}): {primary_error}; "
                    f"Fallback ({self.fallback_name}): {fb_error}"
                ) from fb_error

        raise primary_error or RuntimeError(f"Primary provider '{self.primary_name}' failed and no fallback configured.")

    async def generate_structured(
        self,
        prompt: str,
        schema: Type[BaseModel],
        system_prompt: Optional[str] = None,
        temperature: float = 0.0,
    ) -> tuple[BaseModel, LLMGenerationResult]:
        primary_error = None
        try:
            return await self.primary.generate_structured(
                prompt=prompt,
                schema=schema,
                system_prompt=system_prompt,
                temperature=temperature,
            )
        except Exception as e:
            primary_error = e
            logger.warning(
                f"[FallbackLLMProvider] Primary structured generation '{self.primary_name}' failed ({e}). "
                f"Attempting fallback to '{self.fallback_name}'."
            )

        if self.fallback is not None:
            try:
                instance, result = await self.fallback.generate_structured(
                    prompt=prompt,
                    schema=schema,
                    system_prompt=system_prompt,
                    temperature=temperature,
                )
                logger.info(
                    f"[FallbackLLMProvider] Fallback structured generation '{self.fallback_name}' succeeded."
                )
                return instance, result
            except Exception as fb_error:
                logger.error(
                    f"[FallbackLLMProvider] Fallback structured generation '{self.fallback_name}' failed: {fb_error}"
                )
                raise RuntimeError(
                    f"All configured LLM providers failed for structured output. "
                    f"Primary: {primary_error}; Fallback: {fb_error}"
                ) from fb_error

        raise primary_error or RuntimeError(f"Primary provider '{self.primary_name}' failed.")

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        return await self.primary.get_embeddings(texts)
