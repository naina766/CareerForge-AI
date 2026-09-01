import uuid
import time
# pyrefly: ignore [missing-import]
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from .logging import logger

class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """Propagates and sets correlation and request IDs for distributed tracing."""
    
    async def dispatch(self, request: Request, call_next):
        correlation_id = request.headers.get("x-correlation-id") or request.headers.get("x-request-id")
        if not correlation_id:
            correlation_id = f"req_{uuid.uuid4().hex[:16]}"
            
        request_id = f"rq_{uuid.uuid4().hex[:16]}"
        
        request.state.correlation_id = correlation_id
        request.state.request_id = request_id
        
        start_time = time.perf_counter()
        response: Response = await call_next(request)
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        response.headers["X-Correlation-ID"] = correlation_id
        response.headers["X-Request-ID"] = request_id
        
        logger.info(
            f"HTTP {request.method} {request.url.path} {response.status_code} - {duration_ms:.2f}ms [{correlation_id}]"
        )
        
        return response
