import abc
import hashlib
import math
from typing import List
import numpy as np

class EmbeddingProvider(abc.ABC):
    @abc.abstractmethod
    def get_dimension(self) -> int:
        pass

    @abc.abstractmethod
    def embed_text(self, text: str) -> np.ndarray:
        """Embed a single text string into a 1D float32 normalized vector."""
        pass

    @abc.abstractmethod
    def embed_documents(self, texts: List[str]) -> np.ndarray:
        """Embed multiple text strings into a 2D float32 normalized matrix (N, D)."""
        pass

class MockEmbeddingProvider(EmbeddingProvider):
    """
    Deterministic, offline embedding provider generating reproducible 384-dimension vectors.
    Uses SHA-256 hash seeds and trigonometric projections with L2 normalization.
    """
    def __init__(self, dimension: int = 384):
        self.dimension = dimension

    def get_dimension(self) -> int:
        return self.dimension

    def _generate_vector(self, text: str) -> np.ndarray:
        cleaned = text.strip().lower()
        if not cleaned:
            vec = np.zeros(self.dimension, dtype=np.float32)
            vec[0] = 1.0
            return vec

        # Use SHA-256 hash of text as seed for deterministic pseudo-random vector
        hash_digest = hashlib.sha256(cleaned.encode("utf-8")).digest()
        seed_ints = [int.from_bytes(hash_digest[i:i+4], "big") for i in range(0, 32, 4)]

        # Generate smooth harmonic wave representing the semantic tokens
        vec = np.zeros(self.dimension, dtype=np.float32)
        for i in range(self.dimension):
            val = 0.0
            for idx, s in enumerate(seed_ints):
                freq = ((s % 50) + 1) * 0.1
                phase = (s % 100) * 0.01
                val += math.sin(i * freq + phase) * (1.0 / (idx + 1))
            vec[i] = val

        # L2 Normalization so dot-product equals cosine similarity
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0

        return vec.astype(np.float32)

    def embed_text(self, text: str) -> np.ndarray:
        return self._generate_vector(text)

    def embed_documents(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)
        vectors = [self._generate_vector(t) for t in texts]
        return np.vstack(vectors).astype(np.float32)

# Global default provider
_default_provider: EmbeddingProvider = MockEmbeddingProvider(dimension=384)

def get_embedding_provider() -> EmbeddingProvider:
    return _default_provider
