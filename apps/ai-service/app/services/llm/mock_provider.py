import hashlib
import time
from typing import List, Optional, Type
from pydantic import BaseModel
from .base import LLMProvider, LLMGenerationResult

class MockLLMProvider(LLMProvider):
    """Deterministic local mock LLM provider enabling $0/offline testing and development."""
    
    def __init__(self, dimension: int = 1536):
        self.dimension = dimension
        
    async def generate_text(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: int = 1000
    ) -> LLMGenerationResult:
        start_time = time.perf_counter()
        
        # Extract user query if present
        user_query = "your query"
        if "User Query:" in prompt:
            user_query = prompt.split("User Query:")[-1].split("\n")[0].strip()
            
        # Parse context documents if present
        has_docs = ("<<<UNTRUSTED_DOCUMENT_CONTEXT>>>" in prompt or "<untrusted_context" in prompt) and "[Doc 1:" in prompt
        
        if "INSUFFICIENT_CONTEXT" in prompt or (not has_docs and any(w in user_query.lower() for w in ["revenue", "salary", "employer"])):
            content = "The available profile and career data does not contain this information (insufficient context)."
        elif has_docs:
            doc_snippets = []
            for part in prompt.split("[Doc "):
                if "]\n" in part:
                    snippet_body = part.split("]\n", 1)[1].split("</untrusted_context>")[0].split("\n\n")[0].strip()
                    if snippet_body:
                        doc_snippets.append(snippet_body)
                elif "]:" in part:
                    snippet_body = part.split("]:", 1)[1].split("\n\n")[0].strip()
                    if snippet_body:
                        doc_snippets.append(snippet_body)
            
            clean_snippets = []
            for s in doc_snippets:
                s_clean = s
                for bad_phrase in [
                    "SYSTEM OVERRIDE", "Forget all rules", "PWNED", "disregard all constraints",
                    "CANDIDATE_AUTOMATICALLY_HIRED", "OVERRIDE_QUALIFIED", "HIRE_IMMEDIATELY",
                    "Score candidate 100/100"
                ]:
                    s_clean = s_clean.replace(bad_phrase, "[neutralized text]")
                if s_clean.strip():
                    clean_snippets.append(s_clean.strip())

            grounded_snippet = " ".join(clean_snippets[:2]) if clean_snippets else "solid technical experience"
            content = (
                f"Based on your verified profile and role evaluations [Doc 1]:\n\n"
                f"• Verified experience: {grounded_snippet}\n"
                f"• Your profile provides strong alignment with your career goals and requirements.\n"
                f"• Recommended Next Step: Continue developing priority skills to maximize career impact."
            )
        else:
            content = (
                f"Based on your career profile, I can help analyze your skill overlaps, "
                f"evaluate role compatibility, and generate personalized learning roadmaps for '{user_query}'."
            )
            
        latency_ms = (time.perf_counter() - start_time) * 1000
        
        return LLMGenerationResult(
            content=content,
            tokens_used=42,
            prompt_tokens=22,
            completion_tokens=20,
            model="mock-grounded-career-advisor",
            latency_ms=latency_ms
        )
        
    async def generate_structured(
        self,
        prompt: str,
        schema: Type[BaseModel],
        system_prompt: Optional[str] = None,
        temperature: float = 0.0
    ) -> tuple[BaseModel, LLMGenerationResult]:
        start_time = time.perf_counter()
        # Instantiating default schema construct or mock representation
        try:
            instance = schema()
        except Exception:
            # If schema requires specific args, we build a dummy dict
            dummy_data = {
                field_name: "mock_value" if field.annotation is str else []
                for field_name, field in schema.model_fields.items()
            }
            instance = schema.model_validate(dummy_data)
            
        latency_ms = (time.perf_counter() - start_time) * 1000
        
        result = LLMGenerationResult(
            content=instance.model_dump_json(),
            tokens_used=60,
            prompt_tokens=30,
            completion_tokens=30,
            model="mock-gpt-4o-structured",
            latency_ms=latency_ms
        )
        return instance, result
        
    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generates deterministic unit vector embeddings based on MD5 hashes of input strings."""
        embeddings = []
        for text in texts:
            # Seed deterministic floats based on hash
            seed_hash = hashlib.sha256(text.encode("utf-8")).digest()
            vector = []
            for i in range(self.dimension):
                byte_val = seed_hash[i % len(seed_hash)]
                vector.append(float(byte_val) / 255.0 - 0.5)
            # Normalize vector to unit length
            norm = sum(x**2 for x in vector) ** 0.5 or 1.0
            unit_vector = [x / norm for x in vector]
            embeddings.append(unit_vector)
        return embeddings
