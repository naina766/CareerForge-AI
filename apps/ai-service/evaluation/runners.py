import asyncio
import json
import sys
from pathlib import Path

try:
    from .evaluator import CareerForgeAIEvaluator
    from .models import EvaluationSummary
    from .validator import DatasetIntegrator, DatasetIntegrityError
except ImportError:
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from evaluation.evaluator import CareerForgeAIEvaluator
    from evaluation.models import EvaluationSummary
    from evaluation.validator import DatasetIntegrator, DatasetIntegrityError


REPORTS_DIR = Path(__file__).parent / "reports"


def print_scorecard(summary: EvaluationSummary):
    """Prints a structured ASCII scorecard of the evaluation run."""
    print("=" * 60)
    print("           CareerForge AI Quality & Safety Scorecard        ")
    print("=" * 60)
    print(f"Dataset Version:                    {summary.dataset}")
    print(f"Evaluation Framework Version:       {summary.evaluation_version}")
    print(f"Total Evaluation Cases Evaluated:   {summary.total_cases}")
    print(f"Passed Cases:                       {summary.passed_cases} ({summary.pass_rate * 100:.1f}%)")
    print("-" * 60)
    print("QUALITY & GROUNDING METRICS:")
    print(f"  Answer Relevance:                 {summary.avg_relevance * 100:.1f}%")
    print(f"  Groundedness:                     {summary.avg_groundedness * 100:.1f}%")
    print(f"  Citation Correctness:             {summary.avg_citation_correctness * 100:.1f}%")
    print(f"  Unsupported Claim Rate:           {summary.unsupported_claim_rate * 100:.1f}%")
    print("-" * 60)
    print("SECURITY & TENANT ISOLATION METRICS:")
    print(f"  Prompt Injection Resistance:      {summary.injection_pass_rate * 100:.1f}%")
    print(f"  Candidate Data Isolation:         {summary.isolation_pass_rate * 100:.1f}%")
    print(f"  Secret Leakage Prevention:        {summary.secret_leakage_pass_rate * 100:.1f}%")
    print("-" * 60)
    print("DETERMINISTIC FORMULAS:")
    print(f"  Deterministic Formula Accuracy:   {summary.deterministic_formula_accuracy * 100:.1f}%")

    retrieval = summary.category_metrics.get("retrieval", {})
    if retrieval:
        print("-" * 60)
        print("FAISS RETRIEVAL BENCHMARKS:")
        print(f"  Recall@1:                         {retrieval.get('recall_at_1', 0.0) * 100:.1f}%")
        print(f"  Recall@3:                         {retrieval.get('recall_at_3', 0.0) * 100:.1f}%")
        print(f"  Recall@5:                         {retrieval.get('recall_at_5', 0.0) * 100:.1f}%")
        print(f"  HitRate@5:                        {retrieval.get('hit_rate_at_5', 0.0) * 100:.1f}%")

    print("=" * 60)
    print(f"Hard Security Gates:                {'[PASS]' if summary.hard_gates_passed else '[FAIL]'}")
    print(f"Quality Gates:                      {'[PASS]' if summary.quality_gates_passed else '[FAIL]'}")
    print(f"Final Outcome:                      [{summary.status}]")
    print("=" * 60)

    if not summary.thresholds_passed:
        print("\n" + "=" * 60)
        print("                 AI REGRESSION DETECTED                     ")
        print("=" * 60)
        q_gates = summary.gate_details.get("quality_gates", {})
        h_gates = summary.gate_details.get("hard_gates", {})
        for gate, passed in h_gates.items():
            if not passed:
                print(f"  FAILED HARD GATE:   {gate}")
        for gate, passed in q_gates.items():
            if not passed:
                print(f"  FAILED QUALITY GATE:{gate}")
        if summary.failed_cases:
            print(f"  Failed Cases:       {', '.join(summary.failed_cases)}")
        print("=" * 60 + "\n")


async def run_evaluation_cli() -> EvaluationSummary:
    """Runs dataset validation, evaluation benchmark, and writes the JSON report."""
    print("Validating dataset integrity...")
    try:
        val_result = DatasetIntegrator.validate_all()
        print(f"Dataset integrity verified: {val_result['total_cases_validated']} cases validated.")
    except DatasetIntegrityError as e:
        print(f"\n[FATAL] Dataset Integrity Violation: {e}")
        sys.exit(1)

    evaluator = CareerForgeAIEvaluator()
    summary = await evaluator.run_full_suite()

    print_scorecard(summary)

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    summary_file = REPORTS_DIR / "evaluation_summary.json"
    report_file = REPORTS_DIR / "evaluation_report.json"

    data = summary.model_dump()
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    with open(report_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"[Summary Report Saved] -> {summary_file}")
    print(f"[Detailed Report Saved]-> {report_file}")

    if not summary.thresholds_passed:
        print("\nCI Gate Check: FAILED. Exiting with non-zero status code.")
        sys.exit(1)

    print("\nCI Gate Check: ALL GATES PASSED (100%).")
    return summary


if __name__ == "__main__":
    asyncio.run(run_evaluation_cli())
