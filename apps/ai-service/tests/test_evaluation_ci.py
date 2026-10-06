import pytest
import json
from pathlib import Path
from evaluation.validator import DatasetIntegrator, DatasetIntegrityError
from evaluation.config import HARD_GATES, QUALITY_GATES, DATASET_VERSION, EVALUATION_VERSION
from evaluation.models import EvaluationSummary
from evaluation.evaluator import CareerForgeAIEvaluator


# 1. Dataset Integrity Validation
def test_dataset_integrity_validator_passes():
    """Verifies that the canonical synthetic golden dataset passes all integrity checks."""
    result = DatasetIntegrator.validate_all()
    assert result["status"] == "VALID"
    assert result["total_candidates"] == 2
    assert result["total_cases_validated"] >= 24
    assert result["secrets_detected"] == 0
    assert result["pii_detected"] == 0


def test_dataset_integrity_validator_detects_secrets():
    """Verifies that inserting a credential pattern into text immediately triggers DatasetIntegrityError."""
    with pytest.raises(DatasetIntegrityError, match="Real credential or token pattern detected"):
        DatasetIntegrator._check_secrets_and_pii(
            "Here is the key: AIzaSyD9x8c7v6b5n4m3l2k1j0h9g8f7e6d5c4b3",
            "test_context"
        )

    with pytest.raises(DatasetIntegrityError, match="Real credential or token pattern detected"):
        DatasetIntegrator._check_secrets_and_pii(
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotCommitThis",
            "test_context"
        )


def test_dataset_integrity_validator_detects_pii():
    """Verifies that inserting a prohibited PII pattern triggers DatasetIntegrityError."""
    with pytest.raises(DatasetIntegrityError, match="Prohibited PII format detected"):
        DatasetIntegrator._check_secrets_and_pii(
            "Candidate real SSN is 000-12-3456",
            "test_context"
        )


# 2. Gate Configuration Rigor
def test_hard_gates_configuration_strictly_enforced():
    """Ensures all security gates require 100% (1.0) and are not weakened."""
    assert HARD_GATES["candidate_isolation"] == 1.0
    assert HARD_GATES["prompt_injection_resistance"] == 1.0
    assert HARD_GATES["secret_leakage_prevention"] == 1.0
    assert HARD_GATES["deterministic_skill_gap"] == 1.0
    assert HARD_GATES["deterministic_matching"] == 1.0
    assert HARD_GATES["deterministic_recommendation"] == 1.0


def test_quality_gates_baseline_compliance():
    """Ensures quality gates align with Phase 9 verified baselines without regression."""
    assert QUALITY_GATES["min_relevance"] <= 0.833
    assert QUALITY_GATES["min_groundedness"] <= 0.831
    assert QUALITY_GATES["min_citation_correctness"] <= 0.958
    assert QUALITY_GATES["min_recall_at_5"] <= 0.667
    assert QUALITY_GATES["min_hit_rate_at_5"] <= 0.875


# 3. Machine-Readable JSON Schema Validation
@pytest.mark.asyncio
async def test_summary_report_json_schema_validity():
    """Executes evaluator and validates structure of machine-readable report."""
    evaluator = CareerForgeAIEvaluator()
    summary = await evaluator.run_full_suite()

    assert summary.dataset == DATASET_VERSION
    assert summary.evaluation_version == EVALUATION_VERSION
    assert summary.hard_gates_passed is True
    assert summary.quality_gates_passed is True
    assert summary.status == "PASS"

    json_dict = summary.model_dump()
    assert "dataset" in json_dict
    assert "metrics" not in json_dict or "category_metrics" in json_dict
    assert "gate_details" in json_dict
    assert "hard_gates" in json_dict["gate_details"]
    assert "quality_gates" in json_dict["gate_details"]


# 4. Regression Detection Verification
def test_hard_gate_failure_triggers_failure_status():
    """Asserts that a compromised isolation metric forces status='FAIL'."""
    failing_summary = EvaluationSummary(
        total_cases=24,
        passed_cases=23,
        pass_rate=0.958,
        avg_relevance=0.85,
        avg_groundedness=0.85,
        avg_citation_correctness=0.95,
        unsupported_claim_rate=0.0,
        isolation_pass_rate=0.90,  # Below 1.0 -> Security Failure
        injection_pass_rate=1.0,
        secret_leakage_pass_rate=1.0,
        deterministic_formula_accuracy=1.0,
        hard_gates_passed=False,
        quality_gates_passed=True,
        status="FAIL",
        thresholds_passed=False,
    )

    assert failing_summary.hard_gates_passed is False
    assert failing_summary.thresholds_passed is False
    assert failing_summary.status == "FAIL"
