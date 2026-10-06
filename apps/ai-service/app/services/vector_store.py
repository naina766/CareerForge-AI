import os
import json
import time
import threading
from typing import List, Dict, Any, Optional, Tuple
import numpy as np
import faiss

from ..schemas.vector import ChunkInput, VectorSearchMatch
from ..core.config import settings
from ..core.logging import logger
from .embedding_provider import get_embedding_provider, EmbeddingProvider

STORAGE_DIR = os.environ.get(
    "FAISS_STORAGE_PATH",
    os.environ.get(
        "FAISS_INDEX_DIR",
        getattr(settings, "FAISS_STORAGE_PATH", None)
        or os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage", "faiss")),
    ),
)
INDEX_FILE_PATH = os.path.join(STORAGE_DIR, "resume.index")
MAPPING_FILE_PATH = os.path.join(STORAGE_DIR, "resume_chunk_ids.json")


class FAISSVectorStore:
    """
    Singleton manager for persistent FAISS vector indexing and semantic retrieval.
    Maps integer vector indices to PostgreSQL ResumeChunk UUIDs.
    Uses IndexFlatIP with L2-normalized vectors (Inner Product == Cosine Similarity).

    Architecture invariants:
    - PostgreSQL is the authoritative source of truth.
    - FAISS is a derived semantic retrieval index.
    - All persistence operations use atomic rename (tmp -> target).
    - Storage directory is configurable via FAISS_STORAGE_PATH / FAISS_INDEX_DIR.
    - Missing directories are auto-created on initialization.
    - Corrupt or mismatched artifacts are quarantined safely with .corrupted timestamps.
    """
    _instance: Optional["FAISSVectorStore"] = None
    _lock = threading.RLock()

    def __init__(
        self,
        embedding_provider: Optional[EmbeddingProvider] = None,
        storage_dir: Optional[str] = None,
    ):
        self.embedding_provider = embedding_provider or get_embedding_provider()
        self.dimension = self.embedding_provider.get_dimension()
        self.index_version = 1
        self.embedding_model = settings.EMBEDDING_MODEL

        # Configurable storage directory
        self.storage_dir = os.path.abspath(
            storage_dir
            or getattr(settings, "FAISS_STORAGE_PATH", None)
            or os.environ.get("FAISS_STORAGE_PATH")
            or os.environ.get("FAISS_INDEX_DIR")
            or STORAGE_DIR
        )
        self.index_file_path = os.path.join(self.storage_dir, "resume.index")
        self.mapping_file_path = os.path.join(self.storage_dir, "resume_chunk_ids.json")
        self.rebuild_required: bool = False

        # Ensure directory initialization
        os.makedirs(self.storage_dir, exist_ok=True)
        self.id_mapping: Dict[str, Dict[str, Any]] = {}  # str(idx) -> { chunk_id, resume_id, section, content_hash }
        self.index: Optional[faiss.IndexFlatIP] = None

        self._load_or_initialize_index()

    @classmethod
    def get_instance(cls, storage_dir: Optional[str] = None) -> "FAISSVectorStore":
        with cls._lock:
            if cls._instance is None:
                cls._instance = FAISSVectorStore(storage_dir=storage_dir)
            return cls._instance

    @classmethod
    def _reset_instance(cls):
        """Testing helper to reset singleton instance."""
        with cls._lock:
            cls._instance = None

    def _quarantine_corrupted_artifacts(self):
        """Quarantine corrupted or inconsistent artifacts by renaming with timestamp."""
        timestamp = int(time.time())
        for file_path, label in [
            (self.index_file_path, "index"),
            (self.mapping_file_path, "metadata"),
        ]:
            if os.path.exists(file_path):
                quarantine_target = f"{file_path}.corrupted.{timestamp}"
                try:
                    os.replace(file_path, quarantine_target)
                    logger.warning(
                        "Quarantined corrupted FAISS %s artifact to %s", label, quarantine_target
                    )
                except OSError as err:
                    logger.error("Failed to quarantine corrupted artifact %s: %s", file_path, err)

    def _load_or_initialize_index(self):
        """Loads index and ID mappings from disk, or initializes a new IndexFlatIP."""
        index_exists = os.path.exists(self.index_file_path)
        mapping_exists = os.path.exists(self.mapping_file_path)

        if index_exists and mapping_exists:
            try:
                loaded_index = faiss.read_index(self.index_file_path)
                with open(self.mapping_file_path, "r", encoding="utf-8") as f:
                    loaded_mapping = json.load(f)

                # Validate dimensions
                if loaded_index.d != self.dimension:
                    raise ValueError(
                        f"FAISS index dimension mismatch: Index has {loaded_index.d} vs model {self.dimension}"
                    )

                # Validate consistency between vector count and mapping count
                if loaded_index.ntotal != len(loaded_mapping):
                    raise ValueError(
                        f"FAISS artifact count mismatch: Index contains {loaded_index.ntotal} vectors "
                        f"but mapping contains {len(loaded_mapping)} entries"
                    )

                self.index = loaded_index
                self.id_mapping = loaded_mapping
                self.rebuild_required = False
                logger.info(
                    "FAISS index successfully loaded from %s (%d vectors, dim %d)",
                    self.storage_dir,
                    self.index.ntotal,
                    self.dimension,
                )
                return
            except Exception as e:
                logger.error(
                    "FAISS storage corruption or validation failure at %s: %s: %s",
                    self.storage_dir,
                    type(e).__name__,
                    str(e),
                )
                self._quarantine_corrupted_artifacts()
        elif index_exists or mapping_exists:
            # Partial/inconsistent artifacts on disk
            logger.error(
                "FAISS storage inconsistency: Partial artifacts found at %s (index_exists=%s, mapping_exists=%s)",
                self.storage_dir,
                index_exists,
                mapping_exists,
            )
            self._quarantine_corrupted_artifacts()
        else:
            logger.info("No existing FAISS index found at %s. Initializing fresh index.", self.storage_dir)

        # Clean initialization
        self.index = faiss.IndexFlatIP(self.dimension)
        self.id_mapping = {}
        if index_exists or mapping_exists:
            # If we had to quarantine corrupted/partial files, mark rebuild required
            self.rebuild_required = True
        self._save_to_disk()

    def _save_to_disk(self):
        """
        Atomically persists FAISS index binary and ID mapping JSON to disk.
        
        Write pattern:
        1. Write temporary files (.tmp) in the designated storage directory.
        2. Flush and fsync JSON to disk media.
        3. Verify temporary files exist and are valid.
        4. Atomically rename/replace temp files with final targets using os.replace().
        5. Clean up temporary files if any step fails.
        """
        with self._lock:
            if self.index is None:
                return

            tmp_index_path = f"{self.index_file_path}.tmp"
            tmp_mapping_path = f"{self.mapping_file_path}.tmp"

            try:
                # 1. Write index binary to temporary file
                faiss.write_index(self.index, tmp_index_path)

                # 2. Write metadata mapping to temporary file with flush & fsync
                with open(tmp_mapping_path, "w", encoding="utf-8") as f:
                    json.dump(self.id_mapping, f, indent=2)
                    f.flush()
                    os.fsync(f.fileno())

                # 3. Verify temporary files exist and are non-empty
                if not (os.path.exists(tmp_index_path) and os.path.getsize(tmp_index_path) > 0):
                    raise IOError(f"Temporary FAISS index file is missing or empty: {tmp_index_path}")
                if not (os.path.exists(tmp_mapping_path) and os.path.getsize(tmp_mapping_path) > 0):
                    raise IOError(f"Temporary FAISS mapping file is missing or empty: {tmp_mapping_path}")

                # 4. Atomic rename into target destinations
                os.replace(tmp_index_path, self.index_file_path)
                os.replace(tmp_mapping_path, self.mapping_file_path)

            except Exception as e:
                logger.error("Failed to atomically persist FAISS index: %s: %s", type(e).__name__, str(e))
                # Clean up temporary files to avoid leaking orphaned .tmp files
                for tmp_file in (tmp_index_path, tmp_mapping_path):
                    if os.path.exists(tmp_file):
                        try:
                            os.remove(tmp_file)
                        except OSError:
                            pass
                raise

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
        Enforces candidate isolation through resume_id_filter.
        """
        if not self.index or self.index.ntotal == 0:
            return []

        query_vec = self.embedding_provider.embed_text(query).reshape(1, -1)

        # Query sufficient candidate vectors if filtering by resume_id
        search_k = min(self.index.ntotal, max(top_k * 20, 100) if resume_id_filter else top_k)
        if search_k <= 0:
            return []

        distances, indices = self.index.search(query_vec, search_k)
        results: List[VectorSearchMatch] = []

        for dist, idx in zip(distances[0], indices[0]):
            if idx < 0:
                continue

            meta = self.id_mapping.get(str(idx))
            if not meta or not isinstance(meta, dict):
                continue

            # Step 7: RAG poisoning defense - validate metadata integrity
            chunk_id = meta.get("chunk_id")
            chunk_resume_id = meta.get("resume_id")
            if not chunk_id or not isinstance(chunk_id, str):
                continue
            if not chunk_resume_id or not isinstance(chunk_resume_id, str):
                continue

            # Enforce candidate/resume isolation filter
            if resume_id_filter and chunk_resume_id != resume_id_filter:
                continue

            # In IndexFlatIP with normalized vectors, score is in [-1.0, 1.0]
            # Convert to clean rounded float
            similarity = float(np.clip(dist, -1.0, 1.0))

            results.append(
                VectorSearchMatch(
                    chunk_id=chunk_id,
                    resume_id=chunk_resume_id,
                    section=str(meta.get("section", "general")),
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
            self.rebuild_required = False
            self._save_to_disk()

            return len(all_chunks)

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_vectors": self.index.ntotal if self.index else 0,
            "embedding_dimension": self.dimension,
            "embedding_model": self.embedding_model,
            "index_version": self.index_version,
            "rebuild_required": self.rebuild_required,
            "storage_path": self.storage_dir,
        }

