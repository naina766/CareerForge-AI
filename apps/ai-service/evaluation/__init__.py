"""
Phase 9 — AI Evaluation & Quality Framework for CareerForge AI.
Provides deterministic metric calculations, synthetic datasets, and test harnesses
to evaluate Groundedness, Relevance, Retrieval (Recall@K), Citations, Candidate Isolation,
and Prompt Injection Defenses without compromising candidate privacy or requiring live production keys.
"""

from .models import EvaluationCase, EvaluationResult, EvaluationSummary
from .metrics import (
    compute_answer_relevance,
    compute_groundedness,
    compute_citation_correctness,
    detect_unsupported_claims,
    compute_recall_at_k,
    compute_hit_rate_at_k,
    compute_precision_at_k,
    evaluate_candidate_isolation,
    evaluate_prompt_injection_resistance,
    evaluate_insufficient_context,
    evaluate_skill_gap,
    evaluate_matching_score,
    evaluate_recommendation_score,
)
from .datasets import EvaluationDatasetLoader
from .evaluator import CareerForgeAIEvaluator

__all__ = [
    "EvaluationCase",
    "EvaluationResult",
    "EvaluationSummary",
    "compute_answer_relevance",
    "compute_groundedness",
    "compute_citation_correctness",
    "detect_unsupported_claims",
    "compute_recall_at_k",
    "compute_hit_rate_at_k",
    "compute_precision_at_k",
    "evaluate_candidate_isolation",
    "evaluate_prompt_injection_resistance",
    "evaluate_insufficient_context",
    "evaluate_skill_gap",
    "evaluate_matching_score",
    "evaluate_recommendation_score",
    "EvaluationDatasetLoader",
    "CareerForgeAIEvaluator",
]
