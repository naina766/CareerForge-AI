import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from .models import EvaluationCase
from app.schemas.vector import ChunkInput
from app.services.vector_store import FAISSVectorStore


FIXTURES_DIR = Path(__file__).parent / "fixtures"


class EvaluationDatasetLoader:
    """
    Manages loading and provisioning of synthetic evaluation datasets.
    Guarantees that no real candidate PII or production database contents are ever used.
    """

    @staticmethod
    def get_candidate_profiles() -> List[Dict[str, Any]]:
        """Loads synthetic candidate profiles (Candidate A & Candidate B)."""
        path = FIXTURES_DIR / "candidate_profiles.json"
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("candidates", [])

    @staticmethod
    def get_rag_cases() -> List[EvaluationCase]:
        """Loads typed RAG evaluation cases."""
        path = FIXTURES_DIR / "rag_cases.json"
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return [EvaluationCase(**c) for c in data.get("cases", [])]

    @staticmethod
    def get_injection_cases() -> List[Dict[str, Any]]:
        """Loads prompt injection evaluation cases."""
        path = FIXTURES_DIR / "injection_cases.json"
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("cases", [])

    @staticmethod
    def get_isolation_cases() -> List[Dict[str, Any]]:
        """Loads cross-tenant candidate isolation evaluation cases."""
        path = FIXTURES_DIR / "isolation_cases.json"
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("cases", [])

    @staticmethod
    def get_citation_cases() -> List[Dict[str, Any]]:
        """Loads citation validation evaluation cases."""
        path = FIXTURES_DIR / "citation_cases.json"
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("cases", [])

    @staticmethod
    def get_mentor_questions() -> List[Dict[str, Any]]:
        """Loads mentor career questions fixture."""
        path = FIXTURES_DIR / "mentor_questions.json"
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data.get("questions", [])

    @classmethod
    def get_chunk_content_map(cls) -> Dict[str, str]:
        """Returns mapping from chunk_id to text content for synthetic profiles."""
        content_map = {}
        for profile in cls.get_candidate_profiles():
            for c in profile.get("resume_chunks", []):
                content_map[c["id"]] = c["content"]
        return content_map

    @classmethod
    def index_synthetic_candidates_in_faiss(cls, store: Optional[FAISSVectorStore] = None) -> Dict[str, int]:
        """
        Indexes Candidate A and Candidate B synthetic resume chunks into FAISS
        under their respective candidate-scoped resume IDs.
        """
        if store is None:
            store = FAISSVectorStore.get_instance()

        profiles = cls.get_candidate_profiles()
        indexed_counts: Dict[str, int] = {}

        for profile in profiles:
            cand_id = profile["candidate_id"]
            resume_chunks = profile.get("resume_chunks", [])
            chunks_to_add: List[ChunkInput] = []

            for idx, c in enumerate(resume_chunks):
                chunks_to_add.append(
                    ChunkInput(
                        id=c["id"],
                        resume_id=cand_id,
                        content=c["content"],
                        section=c.get("section", "experience"),
                        chunk_index=idx,
                        content_hash=f"eval_hash_{c['id']}",
                    )
                )

            count = store.add_chunks(cand_id, chunks_to_add)
            indexed_counts[cand_id] = count

        return indexed_counts
