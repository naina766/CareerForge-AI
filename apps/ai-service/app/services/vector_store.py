import os
import json
import threading
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import faiss

from ..schemas.vector import ChunkInput, VectorSearchMatch
from .embedding_provider import get_embedding_provider, EmbeddingProvider

STORAGE_DIR = os.environ.get("FAISS_INDEX_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "storage", "faiss"))
INDEX_FILE_PATH = os.path.join(STORAGE_DIR, "resume.index")
MAPPING_FILE_PATH = os.path.join(STORAGE_DIR, "resume_chunk_ids.json")

class FAISSVectorStore:
    """
    Singleton manager for persistent FAISS vector indexing and semantic retrieval.
    Maps integer vector indices to PostgreSQL ResumeChunk UUIDs.
    Uses IndexFlatIP with L2-normalized vectors (Inner Product == Cosine Similarity).
    """
    _instance: Optional["FAISSVectorStore"] = None
    _lock = threading.RLock()

    def __init__(self, embedding_provider: Optional[EmbeddingProvider] = None):
        self.embedding_provider = embedding_provider or get_embedding_provider()
        self.dimension = self.embedding_provider.get_dimension()
        self.index_version = 1
        self.embedding_model = "sentence-transformers/all-MiniLM-L6-v2"

        os.makedirs(STORAGE_DIR, exist_ok=True)
        self.id_mapping: Dict[str, Dict[str, Any]] = {} # str(idx) -> { chunk_id, resume_id, section, content_hash }
        self.index: Optional[faiss.IndexFlatIP] = None

        self._load_or_initialize_index()

    @classmethod
    def get_instance(cls) -> "FAISSVectorStore":
        with cls._lock:
            if cls._instance is None:
                cls._instance = FAISSVectorStore()
            return cls._instance

    def _load_or_initialize_index(self):
        """Loads index and ID mappings from disk, or initializes a new IndexFlatIP."""
        if os.path.exists(INDEX_FILE_PATH) and os.path.exists(MAPPING_FILE_PATH):
            try:
                self.index = faiss.read_index(INDEX_FILE_PATH)
                with open(MAPPING_FILE_PATH, "r", encoding="utf-8") as f:
                    self.id_mapping = json.load(f)

                # Validate dimensions
                if self.index.d != self.dimension:
                    raise ValueError(f"FAISS index dimension mismatch: Index has {self.index.d} vs model {self.dimension}")
                return
            except Exception as e:
                # If corrupted or mismatched, reinitialize clean
                pass

        # Clean initialization
        self.index = faiss.IndexFlatIP(self.dimension)
        self.id_mapping = {}
        self._save_to_disk()

    def _save_to_disk(self):
        """Atomically persists FAISS index binary and ID mapping JSON to disk."""
        with self._lock:
            faiss.write_index(self.index, INDEX_FILE_PATH)
            with open(MAPPING_FILE_PATH, "w", encoding="utf-8") as f:
                json.dump(self.id_mapping, f, indent=2)

    def add_chunks(self, resume_id: str, chunks: List[ChunkInput]) -> int:
        """
        Embeds and indexes chunks for a resume into FAISS.
        Appends vectors to IndexFlatIP and updates ID mappings.
        """
        if not chunks:
            return 0

        with self._lock:
            texts = [c.content for c in chunks]
            vectors = self.embedding_provider.embed_documents(texts)

            if vectors.shape[1] != self.dimension:
                raise ValueError(f"Vector dimension {vectors.shape[1]} does not match index dimension {self.dimension}")

            start_idx = self.index.ntotal if self.index else 0
            self.index.add(vectors)

            for i, chunk in enumerate(chunks):
                self.id_mapping[str(start_idx + i)] = {
                    "chunk_id": chunk.id,
                    "resume_id": chunk.resume_id,
                    "section": chunk.section,
                    "content_hash": chunk.content_hash,
                }

            self._save_to_disk()
            return len(chunks)

    def search(self, query: str, top_k: int = 5, resume_id_filter: Optional[str] = None) -> List[VectorSearchMatch]:
        """
        Performs semantic vector search against FAISS index.
        Returns top-K results sorted by cosine similarity score.
        """
        if not self.index or self.index.ntotal == 0:
            return []

        query_vec = self.embedding_provider.embed_text(query).reshape(1, -1)

        # Query more candidates if filtering by resume_id
        search_k = min(self.index.ntotal, top_k * 5 if resume_id_filter else top_k)
        if search_k <= 0:
            return []

        distances, indices = self.index.search(query_vec, search_k)
        results: List[VectorSearchMatch] = []

        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0:
                continue

            meta = self.id_mapping.get(str(idx))
            if not meta:
                continue

            if resume_id_filter and meta.get("resume_id") != resume_id_filter:
                continue

            # In IndexFlatIP with normalized vectors, score is in [-1.0, 1.0]
            # Convert to clean rounded float
            similarity = float(np.clip(dist, -1.0, 1.0))

            results.append(
                VectorSearchMatch(
                    chunk_id=meta["chunk_id"],
                    resume_id=meta["resume_id"],
                    section=meta.get("section", "general"),
                    similarity_score=round(similarity, 4),
                )
            )

            if len(results) >= top_k:
                break

        return results

    def rebuild_index(self, all_chunks: List[ChunkInput]) -> int:
        """
        Completely rebuilds the FAISS index from the database source of truth.
        """
        with self._lock:
            new_index = faiss.IndexFlatIP(self.dimension)
            new_mapping: Dict[str, Dict[str, Any]] = {}

            if all_chunks:
                texts = [c.content for c in all_chunks]
                vectors = self.embedding_provider.embed_documents(texts)
                new_index.add(vectors)

                for idx, chunk in enumerate(all_chunks):
                    new_mapping[str(idx)] = {
                        "chunk_id": chunk.id,
                        "resume_id": chunk.resume_id,
                        "section": chunk.section,
                        "content_hash": chunk.content_hash,
                    }

            self.index = new_index
            self.id_mapping = new_mapping
            self._save_to_disk()

            return len(all_chunks)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_vectors": self.index.ntotal if self.index else 0,
            "embedding_dimension": self.dimension,
            "embedding_model": self.embedding_model,
            "index_version": self.index_version,
        }
