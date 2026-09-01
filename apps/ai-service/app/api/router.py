from fastapi import APIRouter
from .routes import health, resume, vector, rag

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(resume.router, tags=["Resume Intelligence"])
api_router.include_router(vector.router, tags=["Vector Search & FAISS"])
api_router.include_router(rag.router, tags=["Grounded Career RAG"])

