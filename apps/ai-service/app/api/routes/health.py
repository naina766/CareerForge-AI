from datetime import datetime, timezone
from fastapi import APIRouter, Request, Response, status
from ...core.config import settings
from ...schemas.health import HealthResponse, HealthResponseData, HealthMeta
from ...services.vector_store import FAISSVectorStore

router = APIRouter()

@router.get("/live")
async def get_liveness():
    """Lightweight process liveness probe."""
    return {"status": "alive", "service": "ai-service"}

@router.get("/health", response_model=HealthResponse)
async def get_health(request: Request):
    """Health check endpoint returning service status, runtime environment, and active LLM provider."""
    correlation_id = getattr(request.state, "correlation_id", None)
    request_id = getattr(request.state, "request_id", None)
    
    return HealthResponse(
        success=True,
        data=HealthResponseData(
            status="ok",
            service="ai-service",
            version="1.0.0",
            environment=settings.ENVIRONMENT,
            provider=settings.LLM_PROVIDER
        ),
        meta=HealthMeta(
            correlationId=correlation_id,
            requestId=request_id,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    )

@router.get("/ready")
async def get_readiness(response: Response):
    """Deep readiness probe verifying FAISS vector store and embedding provider initialization."""
    is_vector_ready = False
    details = {}

    try:
        store = FAISSVectorStore.get_instance()
        stats = store.get_stats()
        is_vector_ready = store.index is not None
        details["vector_store"] = {
            "status": "ready" if is_vector_ready else "not_initialized",
            "total_vectors": stats.get("total_vectors", 0),
            "dimension": stats.get("embedding_dimension", 384),
        }
    except Exception as e:
        details["vector_store"] = {"status": "error", "message": str(e)}

    is_ready = is_vector_ready

    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return {
        "status": "ready" if is_ready else "not_ready",
        "service": "ai-service",
        "provider": settings.LLM_PROVIDER,
        "embedding_provider": settings.EMBEDDING_PROVIDER,
        "dependencies": details,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
