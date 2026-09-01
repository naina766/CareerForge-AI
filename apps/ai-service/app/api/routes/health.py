from datetime import datetime, timezone
from fastapi import APIRouter, Request
from ...core.config import settings
from ...schemas.health import HealthResponse, HealthResponseData, HealthMeta

router = APIRouter()

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
