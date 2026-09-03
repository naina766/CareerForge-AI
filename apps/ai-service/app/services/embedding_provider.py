import abc
import hashlib
import math
from typing import List, Optional
import numpy as np
from ..core.config import settings
from ..core.logging import logger

class EmbeddingProvider(abc.ABC):
    @abc.abstractmethod
    def get_dimension(self) -> int:
        """Returns vector dimensionality."""
        pass

    @abc.abstractmethod
    def embed_text(self, text: str) -> np.ndarray:
        """Embed a single text string into a 1D float32 L2-normalized vector."""
        pass

    @abc.abstractmethod
    def embed_documents(self, texts: List[str]) -> np.ndarray:
        """Embed multiple text strings into a 2D float32 L2-normalized matrix (N, D)."""
        pass


class FastEmbedEmbeddingProvider(EmbeddingProvider):
    """
    Real dense semantic embedding provider powered by FastEmbed (ONNX Runtime).
    Generates 384-dimensional dense semantic vectors with L2 normalization for cosine similarity.
    Model: BAAI/bge-small-en-v1.5 (or configured EMBEDDING_MODEL).
    """
    def __init__(self, model_name: str = "BAAI/bge-small-en-v1.5", dimension: int = 384):
        self.model_name = model_name
        self.dimension = dimension
        self._model = None

    def _get_model(self):
        if self._model is None:
            try:
                from fastembed import TextEmbedding
                logger.info(f"Loading FastEmbed model: {self.model_name}")
                self._model = TextEmbedding(model_name=self.model_name)
            except Exception as e:
                logger.error(f"Failed to load FastEmbed model '{self.model_name}': {e}")
                raise RuntimeError(f"Embedding model initialization failed: {e}") from e
        return self._model

    def get_dimension(self) -> int:
        return self.dimension

    def embed_text(self, text: str) -> np.ndarray:
        cleaned = text.strip()
        if not cleaned:
            vec = np.zeros(self.dimension, dtype=np.float32)
            vec[0] = 1.0
            return vec

        model = self._get_model()
        generator = model.embed([cleaned])
        vector = next(generator).astype(np.float32)

        # L2-normalize vector so dot-product in FAISS equals cosine similarity
        norm = np.linalg.norm(vector)
        if norm > 0:
            vector = vector / norm
        else:
            vector[0] = 1.0

        if len(vector) != self.dimension:
            raise ValueError(f"Embedding dimension mismatch: expected {self.dimension}, got {len(vector)}")

        return vector

    def embed_documents(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)

        model = self._get_model()
        cleaned_texts = [t.strip() if t.strip() else "empty document" for t in texts]
        embeddings = list(model.embed(cleaned_texts))

        normalized = []
        for vec in embeddings:
            v = np.array(vec, dtype=np.float32)
            norm = np.linalg.norm(v)
            if norm > 0:
                v = v / norm
            else:
                v = np.zeros(self.dimension, dtype=np.float32)
                v[0] = 1.0
            normalized.append(v)

        matrix = np.vstack(normalized).astype(np.float32)
        if matrix.shape[1] != self.dimension:
            raise ValueError(f"Embedding dimension mismatch: expected {self.dimension}, got {matrix.shape[1]}")

        return matrix


class MockEmbeddingProvider(EmbeddingProvider):
    """
    Deterministic offline embedding provider generating reproducible 384-dimension vectors.
    Strictly for unit tests and local mock development.
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

        hash_digest = hashlib.sha256(cleaned.encode("utf-8")).digest()
        seed_ints = [int.from_bytes(hash_digest[i:i+4], "big") for i in range(0, 32, 4)]

        vec = np.zeros(self.dimension, dtype=np.float32)
        for i in range(self.dimension):
            val = 0.0
            for idx, s in enumerate(seed_ints):
                freq = ((s % 50) + 1) * 0.1
                phase = (s % 100) * 0.01
                val += math.sin(i * freq + phase) * (1.0 / (idx + 1))
            vec[i] = val

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


_provider_instance: Optional[EmbeddingProvider] = None

def get_embedding_provider() -> EmbeddingProvider:
    """
    Factory function returning the active embedding provider based on environment configuration.
    Prohibits 'mock' provider in production environment.
    """
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    provider_name = (settings.EMBEDDING_PROVIDER or "fastembed").lower().strip()

    if settings.ENVIRONMENT == "production" and provider_name == "mock":
        raise RuntimeError("FATAL: EMBEDDING_PROVIDER=mock is strictly prohibited in production environment.")

    if provider_name in ("fastembed", "sentence_transformers"):
        _provider_instance = FastEmbedEmbeddingProvider(
            model_name=settings.EMBEDDING_MODEL,
            dimension=settings.EMBEDDING_DIMENSION
        )
    elif provider_name == "mock":
        logger.warning("Using MockEmbeddingProvider (intended for testing and offline development only)")
        _provider_instance = MockEmbeddingProvider(dimension=settings.EMBEDDING_DIMENSION)
    else:
        logger.warning(f"Unknown embedding provider '{provider_name}', falling back to FastEmbed")
        _provider_instance = FastEmbedEmbeddingProvider(
            model_name=settings.EMBEDDING_MODEL,
            dimension=settings.EMBEDDING_DIMENSION
        )

    return _provider_instance
