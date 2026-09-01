from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

class LLMGenerationResult(BaseModel):
    content: str
    tokens_used: int
    prompt_tokens: int
    completion_tokens: int
    model: str
    latency_ms: float

class LLMProvider(ABC):
    """Abstract interface for LLM operations. Decouples business logic from specific vendors."""
    
    @abstractmethod
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1000
    ) -> LLMGenerationResult:
        """Generates plain text response from the LLM."""
        pass
        
    @abstractmethod
    async def generate_structured(
        self,
        prompt: str,
        schema: type[BaseModel],
        system_prompt: Optional[str] = None,
        temperature: float = 0.0
    ) -> tuple[BaseModel, LLMGenerationResult]:
        """Generates structured Pydantic output validated against the provided schema."""
        pass
        
    @abstractmethod
    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generates vector embeddings for a list of input texts."""
        pass
