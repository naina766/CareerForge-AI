from typing import Literal
from langgraph.graph import StateGraph, START, END
from .state import CareerAssistantState
from .nodes import (
    understand_question,
    determine_context,
    retrieve_candidate_context,
    retrieve_semantic_context,
    build_grounded_context,
    generate_answer,
    validate_answer,
    fallback_node,
)


def route_after_understanding(state: CareerAssistantState) -> Literal["continue", "end"]:
    """
    Short-circuits adversarial prompt injection attempts or speculative queries.
    """
    if state.get("is_blocked") or state.get("is_valid"):
        return "end"
    return "continue"


def route_after_validation(state: CareerAssistantState) -> Literal["end", "retry", "fallback"]:
    """
    Evaluates validation output:
    - If valid -> completes at END.
    - If invalid and retries remain -> routes back for context rebuild and generation.
    - If invalid and retries exhausted -> routes to safe fallback.
    """
    if state.get("is_valid", False):
        return "end"

    retry_count = state.get("retry_count", 0)
    max_retries = state.get("max_retries", 2)

    if retry_count < max_retries:
        return "retry"
    return "fallback"


def build_career_assistant_graph() -> StateGraph:
    """
    Constructs the CareerForge AI Career Assistant LangGraph state machine.
    """
    workflow = StateGraph(CareerAssistantState)

    # Register Nodes
    workflow.add_node("understand_question", understand_question)
    workflow.add_node("determine_context", determine_context)
    workflow.add_node("retrieve_candidate_context", retrieve_candidate_context)
    workflow.add_node("retrieve_semantic_context", retrieve_semantic_context)
    workflow.add_node("build_grounded_context", build_grounded_context)
    workflow.add_node("generate_answer", generate_answer)
    workflow.add_node("validate_answer", validate_answer)
    workflow.add_node("fallback_node", fallback_node)

    # Primary Flow
    workflow.add_edge(START, "understand_question")

    workflow.add_conditional_edges(
        "understand_question",
        route_after_understanding,
        {
            "continue": "determine_context",
            "end": END,
        },
    )

    workflow.add_edge("determine_context", "retrieve_candidate_context")
    workflow.add_edge("retrieve_candidate_context", "retrieve_semantic_context")
    workflow.add_edge("retrieve_semantic_context", "build_grounded_context")
    workflow.add_edge("build_grounded_context", "generate_answer")
    workflow.add_edge("generate_answer", "validate_answer")

    # Conditional Routing After Validation
    workflow.add_conditional_edges(
        "validate_answer",
        route_after_validation,
        {
            "end": END,
            "retry": "build_grounded_context",
            "fallback": "fallback_node",
        },
    )

    workflow.add_edge("fallback_node", END)

    return workflow


# Compiled singleton graph instance for runtime execution
career_assistant_workflow = build_career_assistant_graph()
career_assistant_graph = career_assistant_workflow.compile()
