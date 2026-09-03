import json
import time
from typing import List, Optional, Type
import httpx
from pydantic import BaseModel
from .base import LLMProvider, LLMGenerationResult
from ...core.config import settings
from ...core.logging import logger


class GeminiLLMProvider(LLMProvider):
    """
    Real Google Gemini LLM provider utilizing direct async HTTP execution.
    Features 10s request timeouts, bounded exponential retries, safe logging,
    and structured JSON schema generation.
    """
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None, dimension: int = 384):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        self.dimension = dimension
        self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"

        if not self.api_key:
            raise ValueError(
                "GEMINI_API_KEY is not configured. Set GEMINI_API_KEY in environment or .env."
            )

    async def _post_with_retry(self, endpoint: str, payload: dict, max_retries: int = 3, timeout_s: float = 10.0) -> dict:
        url = f"{self.base_url}/{self.model}:{endpoint}?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        last_error = None
        for attempt in range(1, max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=timeout_s) as client:
                    response = await client.post(url, headers=headers, json=payload)

                    if response.status_code == 200:
                        return response.json()

                    # Transient rate-limit (429) or server degradation (500/503/504)
                    if response.status_code in (429, 500, 502, 503, 504) and attempt < max_retries:
                        logger.warn(f"[GeminiLLMProvider] Attempt {attempt}/{max_retries} received HTTP {response.status_code}. Retrying...")
                        delay = (2 ** (attempt - 1)) * 0.5 + 0.1
                        await httpx.AsyncClient().get("http://localhost", timeout=0.001) # non-blocking tick
                        time.sleep(delay)
                        continue

                    # Non-retryable error
                    error_detail = response.text[:200]
                    raise RuntimeError(f"Gemini API error (HTTP {response.status_code}): {error_detail}")

            except httpx.TimeoutException as e:
                last_error = e
                logger.warn(f"[GeminiLLMProvider] Attempt {attempt}/{max_retries} timed out after {timeout_s}s.")
                if attempt < max_retries:
                    time.sleep(0.5 * attempt)
                    continue
                raise TimeoutError(f"Gemini API request timed out after {timeout_s}s") from e

            except Exception as e:
                last_error = e
                if attempt >= max_retries:
                    raise

        raise last_error or RuntimeError("Gemini API call failed after retries")

    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1000,
    ) -> LLMGenerationResult:
        start_time = time.perf_counter()

        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": f"System Instructions: {system_prompt}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood. I will strictly follow these system instructions."}]})

        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }

        data = await self._post_with_retry("generateContent", payload)
        latency_ms = (time.perf_counter() - start_time) * 1000

        try:
            candidate = data["candidates"][0]
            text = candidate["content"]["parts"][0]["text"]
            usage = data.get("usageMetadata", {})
            prompt_tokens = usage.get("promptTokenCount", len(prompt) // 4)
            completion_tokens = usage.get("candidatesTokenCount", len(text) // 4)
            total_tokens = usage.get("totalTokenCount", prompt_tokens + completion_tokens)
        except (KeyError, IndexError) as e:
            raise RuntimeError(f"Unexpected Gemini response structure: {data}") from e

        return LLMGenerationResult(
            content=text,
            tokens_used=total_tokens,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            model=f"gemini/{self.model}",
            latency_ms=latency_ms,
        )

    async def generate_structured(
        self,
        prompt: str,
        schema: Type[BaseModel],
        system_prompt: Optional[str] = None,
        temperature: float = 0.0,
    ) -> tuple[BaseModel, LLMGenerationResult]:
        schema_json = json.dumps(schema.model_json_schema())
        structured_prompt = (
            f"{prompt}\n\n"
            f"You MUST respond ONLY with a valid JSON object strictly matching this schema:\n"
            f"{schema_json}\n"
            f"Do NOT include markdown formatting like ```json or additional commentary."
        )

        result = await self.generate_text(
            prompt=structured_prompt,
            system_prompt=system_prompt,
            temperature=temperature,
            max_tokens=1500,
        )

        cleaned_text = result.content.strip()
        if cleaned_text.startswith("```json"):
            cleaned_text = cleaned_text[7:]
        if cleaned_text.startswith("```"):
            cleaned_text = cleaned_text[3:]
        if cleaned_text.endswith("```"):
            cleaned_text = cleaned_text[:-3]
        cleaned_text = cleaned_text.strip()

        try:
            parsed_data = json.loads(cleaned_text)
            instance = schema.model_validate(parsed_data)
        except Exception as e:
            logger.error(f"[GeminiLLMProvider] Failed to validate structured response: {e}")
            raise ValueError(f"Gemini structured output validation failed: {e}") from e

        return instance, result

    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        from ..embedding_provider import get_embedding_provider
        provider = get_embedding_provider()
        matrix = provider.embed_documents(texts)
        return matrix.tolist()
