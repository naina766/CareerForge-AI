from fastapi import APIRouter, HTTPException, status
from ...schemas.rag import RAGGenerateRequest, RAGGenerateResponse
from ...services.rag_service import RAGService

router = APIRouter(prefix="/rag")

@router.post("/generate", response_model=RAGGenerateResponse, status_code=status.HTTP_200_OK)
async def generate_rag_response(request: RAGGenerateRequest):
    """
    Executes grounded RAG generation using candidate-isolated context and strict fact guardrails.
    """
    try:
        return RAGService.generate_response(request)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG generation error: {str(e)}",
        )
