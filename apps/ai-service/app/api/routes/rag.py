from fastapi import APIRouter, HTTPException, status
from ...schemas.rag import (
    RAGGenerateRequest,
    RAGGenerateResponse,
    SkillGapAnalysisRequest,
    SkillGapAnalysisResponse,
    CareerRoleRecommendationRequest,
    CareerRoleRecommendationResponse,
    LearningRoadmapRequest,
    LearningRoadmapResponse,
)
from ...services.rag_service import RAGService
from ...core.logging import logger

router = APIRouter(prefix="/rag")

@router.post("/generate", response_model=RAGGenerateResponse, status_code=status.HTTP_200_OK)
async def generate_rag_response(request: RAGGenerateRequest):
    """
    Executes grounded RAG generation using candidate-isolated context, semantic retrieval, and strict fact guardrails.
    """
    try:
        return await RAGService.generate_response(request)
    except Exception as e:
        logger.error("RAG generation failure: %s: %s", type(e).__name__, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI generation service temporarily unavailable. Please try again later.",
        )

@router.post("/skill-gap", response_model=SkillGapAnalysisResponse, status_code=status.HTTP_200_OK)
async def analyze_skill_gap(request: SkillGapAnalysisRequest):
    """
    Evaluates candidate skills against benchmark target role requirements to identify missing skills and priorities.
    """
    try:
        return await RAGService.analyze_skill_gap(request)
    except Exception as e:
        logger.error("Skill gap analysis failure: %s: %s", type(e).__name__, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Skill gap analysis service temporarily unavailable.",
        )

@router.post("/recommend-roles", response_model=CareerRoleRecommendationResponse, status_code=status.HTTP_200_OK)
async def recommend_career_roles(request: CareerRoleRecommendationRequest):
    """
    Recommends career roles grounded in verified candidate skills and trajectory.
    """
    try:
        return await RAGService.recommend_career_roles(request)
    except Exception as e:
        logger.error("Career role recommendation failure: %s: %s", type(e).__name__, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Career role recommendation service temporarily unavailable.",
        )

@router.post("/learning-roadmap", response_model=LearningRoadmapResponse, status_code=status.HTTP_200_OK)
async def generate_learning_roadmap(request: LearningRoadmapRequest):
    """
    Generates structured, prioritized learning modules for closing verified skill gaps.
    """
    try:
        return await RAGService.generate_learning_roadmap(request)
    except Exception as e:
        logger.error("Learning roadmap generation failure: %s: %s", type(e).__name__, str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Learning roadmap service temporarily unavailable.",
        )
