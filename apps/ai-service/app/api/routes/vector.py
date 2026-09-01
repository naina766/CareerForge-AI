from typing import List
from fastapi import APIRouter, HTTPException, status
from ...schemas.vector import (
    IndexResumeRequest,
    IndexResumeResponse,
    VectorSearchRequest,
    VectorSearchResponse,
    VectorStatsResponse,
    ChunkInput,
)
from ...services.vector_store import FAISSVectorStore

router = APIRouter(prefix="/vector", tags=["Vector Search & FAISS"])

@router.post("/index/resume", response_model=IndexResumeResponse)
async def index_resume(request: IndexResumeRequest):
    """
    Embeds and indexes semantic resume chunks into the persistent FAISS vector store.
    """
    try:
        store = FAISSVectorStore.get_instance()
        indexed_count = store.add_chunks(request.resume_id, request.chunks)

        return IndexResumeResponse(
            success=True,
            resume_id=request.resume_id,
            indexed_count=indexed_count,
            embedding_model=store.embedding_model,
            embedding_dimension=store.dimension,
            index_version=store.index_version,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"FAISS indexing failed: {str(e)}",
        )

@router.post("/search", response_model=VectorSearchResponse)
async def search_vectors(request: VectorSearchRequest):
    """
    Performs normalized cosine similarity search across FAISS index vectors.
    """
    try:
        store = FAISSVectorStore.get_instance()
        results = store.search(
            query=request.query,
            top_k=request.top_k,
            resume_id_filter=request.resume_id_filter,
        )

        return VectorSearchResponse(
            query=request.query,
            results=results,
            total_matched=len(results),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic vector search failed: {str(e)}",
        )

@router.post("/rebuild")
async def rebuild_index(chunks: List[ChunkInput]):
    """
    Rebuilds FAISS index completely from provided authoritative database chunks.
    """
    try:
        store = FAISSVectorStore.get_instance()
        total_rebuilt = store.rebuild_index(chunks)
        return {
            "success": True,
            "total_rebuilt": total_rebuilt,
            "dimension": store.dimension,
            "embedding_model": store.embedding_model,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Index rebuild failed: {str(e)}",
        )

@router.get("/stats", response_model=VectorStatsResponse)
async def get_stats():
    """
    Returns vector index metadata, dimensions, and total vector count.
    """
    store = FAISSVectorStore.get_instance()
    return store.get_stats()
