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

router = APIRouter(prefix="/rag")

@router.post("/generate", response_model=RAGGenerateResponse, status_code=status.HTTP_200_OK)
async def generate_rag_response(request: RAGGenerateRequest):
    """
    Executes grounded RAG generation using candidate-isolated context, semantic retrieval, and strict fact guardrails.
    """
    try:
        return await RAGService.generate_response(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG generation error: {str(e)}",
        )

@router.post("/skill-gap", response_model=SkillGapAnalysisResponse, status_code=status.HTTP_200_OK)
async def analyze_skill_gap(request: SkillGapAnalysisRequest):
    """
    Evaluates candidate skills against benchmark target role requirements to identify missing skills and priorities.
    """
    try:
        return await RAGService.analyze_skill_gap(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Skill gap analysis error: {str(e)}",
        )

@router.post("/recommend-roles", response_model=CareerRoleRecommendationResponse, status_code=status.HTTP_200_OK)
async def recommend_career_roles(request: CareerRoleRecommendationRequest):
    """
    Recommends career roles grounded in verified candidate skills and trajectory.
    """
    try:
        return await RAGService.recommend_career_roles(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Career role recommendation error: {str(e)}",
        )

@router.post("/learning-roadmap", response_model=LearningRoadmapResponse, status_code=status.HTTP_200_OK)
async def generate_learning_roadmap(request: LearningRoadmapRequest):
    """
    Generates structured, prioritized learning modules for closing verified skill gaps.
    """
    try:
        return await RAGService.generate_learning_roadmap(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Learning roadmap generation error: {str(e)}",
        )
