import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.vector import ChunkInput
from app.services.vector_store import FAISSVectorStore
from app.services.embedding_provider import MockEmbeddingProvider
from app.services.chunker import ResumeChunker

client = TestClient(app)

def test_resume_chunker():
    sample_data = {
        "summary": "Experienced Full-Stack Engineer with React and Node.js expertise.",
        "skills": ["JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL"],
        "experience": [
            {
                "title": "Senior Engineer",
                "company": "Tech Corp",
                "start_date": "2022-01",
                "end_date": "Present",
                "description": "Architected distributed systems.",
                "technologies": ["Node.js", "PostgreSQL"],
            }
        ],
        "education": [
            {
                "institution": "Tech University",
                "degree": "B.S.",
                "field_of_study": "Computer Science",
                "start_date": "2018",
                "end_date": "2022",
            }
        ],
        "projects": [
            {
                "name": "Search Engine",
                "description": "FAISS vector search engine.",
                "technologies": ["Python", "FAISS"],
            }
        ],
    }

    chunks = ResumeChunker.chunk_structured_resume("test-resume-123", sample_data)
    assert len(chunks) == 5
    sections = [c.section for c in chunks]
    assert "summary" in sections
    assert "skills" in sections
    assert "experience" in sections
    assert "education" in sections
    assert "projects" in sections
    assert chunks[0].content_hash != ""

def test_mock_embedding_provider_deterministic():
    provider = MockEmbeddingProvider(dimension=384)
    v1 = provider.embed_text("React and TypeScript developer")
    v2 = provider.embed_text("React and TypeScript developer")
    assert v1.shape == (384,)
    assert (v1 == v2).all()

    # Different text produces different vector
    v3 = provider.embed_text("DevOps and Kubernetes engineer")
    assert not (v1 == v3).all()

def test_faiss_indexing_and_search():
    chunks = [
        {
            "id": "chunk-1",
            "resume_id": "res-1",
            "content": "Expert backend developer with Node.js, Express, and PostgreSQL databases.",
            "section": "experience",
            "chunk_index": 0,
            "content_hash": "hash1",
        },
        {
            "id": "chunk-2",
            "resume_id": "res-1",
            "content": "Frontend development building user interfaces with React and Tailwind CSS.",
            "section": "experience",
            "chunk_index": 1,
            "content_hash": "hash2",
        },
    ]

    # Index chunks for res-1
    res = client.post(
        "/api/v1/vector/index/resume",
        json={"resume_id": "res-1", "chunks": chunks},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["indexed_count"] == 2
    assert data["embedding_dimension"] == 384

    # Search for backend
    search_res = client.post(
        "/api/v1/vector/search",
        json={"query": "Expert backend developer with Node.js", "top_k": 5},
    )
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert len(search_data["results"]) >= 1
    assert isinstance(search_data["results"][0]["similarity_score"], float)

def test_vector_stats():
    res = client.get("/api/v1/vector/stats")
    assert res.status_code == 200
    data = res.json()
    assert data["embedding_dimension"] == 384
    assert data["total_vectors"] >= 2
