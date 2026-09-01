from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .core.logging import logger
from .core.middleware import CorrelationIdMiddleware
from .api.router import api_router

def create_app() -> FastAPI:
    """FastAPI application factory for CareerForge AI service."""
    app = FastAPI(
        title="CareerForge AI Service",
        description="High-performance GenAI & Vector Intelligence Service for CareerForge",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc"
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Custom Middleware
    app.add_middleware(CorrelationIdMiddleware)

    # Routes
    app.include_router(api_router)
    app.include_router(api_router, prefix="/api/v1")

    @app.on_event("startup")
    async def startup_event():
        logger.info(
            f"🚀 CareerForge AI Service initialized in {settings.ENVIRONMENT} mode using provider: {settings.LLM_PROVIDER}"
        )

    return app

app = create_app()
