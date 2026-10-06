import re
from typing import List, Dict, Any, Set
from pathlib import Path

try:
    from .datasets import EvaluationDatasetLoader
except ImportError:
    import sys
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from evaluation.datasets import EvaluationDatasetLoader


class DatasetIntegrityError(Exception):
    """Raised when evaluation datasets fail consistency, uniqueness, or security rules."""
    pass


class DatasetIntegrator:
    """
    Validates synthetic golden evaluation datasets for Phase 10 regression CI.
    Ensures that test cases are well-formed, non-empty, strictly scoped,
    and contain zero secrets or production PII.
    """

    SECRET_PATTERNS = [
        re.compile(r"AIzaSy[A-Za-z0-9_-]{33}"),
        re.compile(r"sk-[A-Za-z0-9]{20,}"),
        re.compile(r"lsv2_[A-Za-z0-9_-]{20,}"),
        re.compile(r"Bearer\s+eyJ[A-Za-z0-9_-]{20,}", re.IGNORECASE),
        re.compile(r"eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}"),
        re.compile(r"(postgres(?:ql)?|redis)://[^\s:@]*:[^\s@]+@[^\s/]+", re.IGNORECASE),
    ]

    PII_PATTERNS = [
        # Real SSN format
        re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
        # Real credit card format
        re.compile(r"\b(?:\d{4}[-\s]?){3}\d{4}\b"),
    ]

    VALID_CATEGORIES = {
        "factual", "resume", "skill_gap", "job_fit", "faiss_retrieval",
        "pg_context", "hybrid", "insufficient_context", "prompt_injection",
        "candidate_isolation", "career_guidance", "learning_roadmap"
    }

    @classmethod
    def validate_all(cls) -> Dict[str, Any]:
        """
        Runs comprehensive validation across all evaluation fixtures.
        Returns validation summary dictionary or raises DatasetIntegrityError.
        """
        # 1. Validate Candidate Profiles
        candidates = EvaluationDatasetLoader.get_candidate_profiles()
        if not candidates or len(candidates) < 2:
            raise DatasetIntegrityError("At least 2 synthetic candidates (Candidate A & B) must be defined.")

        valid_candidate_ids: Set[str] = set()
        valid_chunk_ids: Set[str] = set()

        for c in candidates:
            cid = c.get("candidate_id")
            if not cid:
                raise DatasetIntegrityError("Candidate profile missing candidate_id.")
            if cid in valid_candidate_ids:
                raise DatasetIntegrityError(f"Duplicate candidate_id: {cid}")
            valid_candidate_ids.add(cid)

            chunks = c.get("resume_chunks", [])
            if not chunks:
                raise DatasetIntegrityError(f"Candidate {cid} has no resume chunks defined.")

            for chunk in chunks:
                chk_id = chunk.get("id")
                if not chk_id:
                    raise DatasetIntegrityError(f"Candidate {cid} chunk missing id.")
                if chk_id in valid_chunk_ids:
                    raise DatasetIntegrityError(f"Duplicate chunk id: {chk_id}")
                valid_chunk_ids.add(chk_id)
                cls._check_secrets_and_pii(chunk.get("content", ""), f"Chunk {chk_id}")

        # 2. Validate RAG Cases
        rag_cases = EvaluationDatasetLoader.get_rag_cases()
        if not rag_cases or len(rag_cases) < 10:
            raise DatasetIntegrityError("RAG evaluation suite requires at least 10 evaluation cases.")

        seen_case_ids: Set[str] = set()
        for case in rag_cases:
            if not case.id:
                raise DatasetIntegrityError("RAG case missing id.")
            if case.id in seen_case_ids:
                raise DatasetIntegrityError(f"Duplicate case id: {case.id}")
            seen_case_ids.add(case.id)

            if case.candidate_id not in valid_candidate_ids:
                raise DatasetIntegrityError(f"Case {case.id} references invalid candidate_id: {case.candidate_id}")

            if not case.question or not case.question.strip():
                raise DatasetIntegrityError(f"Case {case.id} has empty question.")

            if case.category not in cls.VALID_CATEGORIES:
                raise DatasetIntegrityError(f"Case {case.id} has invalid category: {case.category}")

            # Verify expected context chunks exist
            for exp_chk in case.expected_context:
                if exp_chk.startswith("chunk-") and exp_chk not in valid_chunk_ids:
                    raise DatasetIntegrityError(f"Case {case.id} references non-existent expected chunk: {exp_chk}")

            # Security checks
            cls._check_secrets_and_pii(case.question, f"Case {case.id} question")

        # 3. Validate Injection Cases
        inj_cases = EvaluationDatasetLoader.get_injection_cases()
        if not inj_cases or len(inj_cases) < 10:
            raise DatasetIntegrityError("Prompt injection suite requires at least 10 attack cases.")

        for ic in inj_cases:
            iid = ic.get("id")
            if not iid:
                raise DatasetIntegrityError("Injection case missing id.")
            if iid in seen_case_ids:
                raise DatasetIntegrityError(f"Duplicate case id: {iid}")
            seen_case_ids.add(iid)

            if not ic.get("prompt"):
                raise DatasetIntegrityError(f"Injection case {iid} has empty prompt.")

        # 4. Validate Isolation Cases
        iso_cases = EvaluationDatasetLoader.get_isolation_cases()
        if not iso_cases or len(iso_cases) < 3:
            raise DatasetIntegrityError("Candidate isolation suite requires at least 3 cases.")

        for isc in iso_cases:
            isid = isc.get("id")
            if not isid:
                raise DatasetIntegrityError("Isolation case missing id.")
            if isid in seen_case_ids:
                raise DatasetIntegrityError(f"Duplicate case id: {isid}")
            seen_case_ids.add(isid)

            auth_c = isc.get("authenticated_candidate_id")
            if auth_c not in valid_candidate_ids:
                raise DatasetIntegrityError(f"Isolation case {isid} references invalid candidate: {auth_c}")

        return {
            "status": "VALID",
            "total_candidates": len(valid_candidate_ids),
            "total_chunks": len(valid_chunk_ids),
            "total_cases_validated": len(seen_case_ids),
            "secrets_detected": 0,
            "pii_detected": 0,
        }

    @classmethod
    def _check_secrets_and_pii(cls, text: str, context_label: str):
        """Scans synthetic text for real production credentials or PII leaks."""
        for pattern in cls.SECRET_PATTERNS:
            if pattern.search(text):
                raise DatasetIntegrityError(
                    f"Real credential or token pattern detected in {context_label}. "
                    "Evaluation datasets must remain 100% synthetic without production secrets."
                )

        for pii in cls.PII_PATTERNS:
            if pii.search(text):
                raise DatasetIntegrityError(
                    f"Prohibited PII format detected in {context_label}. "
                    "Evaluation datasets must never include real personal data."
                )


if __name__ == "__main__":
    result = DatasetIntegrator.validate_all()
    print("Dataset Integrity Validation Result:", result)
