import os
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration settings for CareerForge AI Service."""
    
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    LOG_LEVEL: str = "INFO"
    
    # LLM Settings
    PRIMARY_LLM_PROVIDER: str = "gemini"  # gemini, openrouter, openai, mock
    FALLBACK_LLM_PROVIDER: str = "openrouter"  # openrouter, gemini, openai, mock
    LLM_PROVIDER: str = "gemini"  # backward compatibility
    
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-1.5-flash"
    
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_MODEL: str = "liquid/lfm-2.5-2.6b:free"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"
    
    # Embedding Configuration
    EMBEDDING_PROVIDER: str = "fastembed"  # fastembed, sentence_transformers, mock
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIMENSION: int = 384  # 384 dimensions matching FAISS index
    
    # FAISS Storage Configuration
    FAISS_STORAGE_PATH: str = Field(
        default_factory=lambda: os.environ.get(
            "FAISS_STORAGE_PATH",
            os.environ.get(
                "FAISS_INDEX_DIR",
                os.path.abspath(
                    os.path.join(os.path.dirname(__file__), "..", "..", "storage", "faiss")
                ),
            ),
        ),
        description="Persistent filesystem directory where FAISS index binary and chunk mappings reside.",
    )
    FAISS_INDEX_DIR: Optional[str] = None
    
    # PostgreSQL
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/careerforge"
    
    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:4000"]
    
    # Testing Configuration
    RUN_LIVE_AI_TESTS: bool = False
    
    # LangSmith Observability & AI Tracing (Phase 8)
    LANGSMITH_TRACING: bool = False
    LANGSMITH_API_KEY: Optional[str] = None
    LANGSMITH_PROJECT: str = "careerforge-ai"
    LANGSMITH_ENDPOINT: str = "https://api.smith.langchain.com"
    LANGSMITH_SAMPLE_RATE: float = 1.0
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
