import time
from typing import List, Dict, Any, Tuple
from ..schemas.rag import RAGGenerateRequest, RAGGenerateResponse, RAGSourceSnippet

class RAGService:
    """
    Grounded RAG generation service enforcing strict fact adherence,
    prompt injection defense, and source citation extraction.
    """

    ADVERSARIAL_PATTERNS = [
        "ignore previous instructions",
        "ignore all previous",
        "reveal your system prompt",
        "show me another candidate",
        "show all candidates",
        "database password",
        "api keys stored",
        "forget your rules",
        "unrestricted ai",
        "bypass security",
    ]

    @classmethod
    def generate_response(cls, request: RAGGenerateRequest) -> RAGGenerateResponse:
        start_time = time.perf_counter()
        query_lower = request.query.lower().strip()

        # 1. Prompt Injection Pre-check
        if any(pat in query_lower for pat in cls.ADVERSARIAL_PATTERNS):
            latency = (time.perf_counter() - start_time) * 1000
            return RAGGenerateResponse(
                success=True,
                status="BLOCKED",
                answer="I can help you with your personalized career data, job matches, skill gaps, and learning roadmaps, but I cannot fulfill requests to bypass security policies or expose internal instructions.",
                sources=[],
                confidence=1.0,
                latency_ms=latency,
            )

        # 2. Speculative / Insufficient Context Handling
        speculative_phrases = ["will i get selected", "guarantee an offer", "predict if i get hired", "what is the interviewer thinking"]
        if any(sp in query_lower for sp in speculative_phrases):
            latency = (time.perf_counter() - start_time) * 1000
            return RAGGenerateResponse(
                success=True,
                status="INSUFFICIENT_CONTEXT",
                answer="I cannot reliably predict hiring outcomes or internal interview decisions. I can, however, evaluate your current profile against the job description to identify skill overlaps, match scores, and learning priorities.",
                sources=request.context_documents[:2],
                confidence=0.9,
                latency_ms=latency,
            )

        # 3. Grounded Context Synthesis
        sources: List[RAGSourceSnippet] = list(request.context_documents)
        answer_parts: List[str] = []

        # Skill Gap / Learning context
        gap_docs = [d for d in sources if d.source_type == "SKILL_GAP"]
        learning_docs = [d for d in sources if d.source_type == "LEARNING_PATH"]
        job_docs = [d for d in sources if d.source_type == "JOB"]
        resume_docs = [d for d in sources if d.source_type == "RESUME"]
        profile_docs = [d for d in sources if d.source_type == "PROFILE"]

        if "skill gap" in query_lower or "missing" in query_lower or request.intent == "SKILL_GAP":
            if gap_docs:
                top_gaps = [d.title for d in gap_docs[:4]]
                answer_parts.append(f"Based on your latest skill gap analysis, your key prioritized areas to develop are: {', '.join(top_gaps)}.")
            else:
                answer_parts.append("According to your profile data, you currently meet the core technical requirements for your active evaluations.")

        if "learn" in query_lower or "prerequisite" in query_lower or request.intent == "LEARNING":
            if learning_docs:
                modules = [d.title for d in learning_docs[:3]]
                answer_parts.append(f"Your personalized learning roadmap recommends focusing on: {', '.join(modules)}.")
            elif gap_docs:
                answer_parts.append(f"To close your current skill gaps, prioritize verified documentation and courses in {gap_docs[0].title}.")

        if "ready" in query_lower or "match" in query_lower or "score" in query_lower or request.intent == "MATCH":
            if job_docs:
                answer_parts.append(f"Evaluating your profile against {job_docs[0].title}: your verified skills and experience provide a strong foundation.")

        if "resume" in query_lower or request.intent == "RESUME":
            if resume_docs:
                answer_parts.append(f"From your parsed resume: {resume_docs[0].snippet or resume_docs[0].title}.")

        if not answer_parts:
            if sources:
                top_source = sources[0]
                answer_parts.append(f"Based on your CareerForge profile data ({top_source.title}): {top_source.snippet or 'your technical profile is synchronized'}.")
            else:
                answer_parts.append("I have analyzed your career profile and active preferences. You can ask me about your job matches, skill gaps, learning roadmap, or resume tailoring.")

        latency = (time.perf_counter() - start_time) * 1000
        return RAGGenerateResponse(
            success=True,
            status="SUCCESS",
            answer=" ".join(answer_parts),
            sources=sources[:5],
            confidence=0.96,
            latency_ms=latency,
        )
