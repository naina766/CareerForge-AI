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
    assert "storage_path" in data
    assert "rebuild_required" in data


# Phase 3: Persistence, Atomic Writes, Corruption Handling & Isolation Tests

def test_missing_storage_directory_creation(tmp_path):
    """
    Tests that FAISSVectorStore safely creates the configured storage directory
    and initial artifacts if the directory does not exist.
    """
    nested_dir = tmp_path / "deep" / "nested" / "faiss_storage"
    assert not nested_dir.exists()

    provider = MockEmbeddingProvider(dimension=384)
    store = FAISSVectorStore(embedding_provider=provider, storage_dir=str(nested_dir))

    assert nested_dir.exists()
    assert (nested_dir / "resume.index").exists()
    assert (nested_dir / "resume_chunk_ids.json").exists()
    assert store.index.ntotal == 0
    assert store.rebuild_required is False


def test_restart_persistence_and_reload(tmp_path):
    """
    Demonstrates lifecycle persistence across restarts:
    1. Create/index FAISS data
    2. Persist artifacts atomically to disk
    3. Re-instantiate FAISSVectorStore pointing to the same storage
    4. Verify index and chunk metadata load accurately
    5. Perform search and verify retrieved chunks
    """
    storage_dir = tmp_path / "restart_test_storage"
    provider = MockEmbeddingProvider(dimension=384)

    # 1. First run: index candidate data
    store1 = FAISSVectorStore(embedding_provider=provider, storage_dir=str(storage_dir))
    chunks = [
        ChunkInput(
            id="chunk-persist-1",
            resume_id="cand-persist-100",
            content="Senior Platform Engineer with Kubernetes, Terraform, and Go experience.",
            section="experience",
            chunk_index=0,
            content_hash="hash_p1",
        ),
        ChunkInput(
            id="chunk-persist-2",
            resume_id="cand-persist-100",
            content="Specialized in building high-throughput event processing with Kafka and Redis.",
            section="skills",
            chunk_index=1,
            content_hash="hash_p2",
        ),
    ]
    added = store1.add_chunks("cand-persist-100", chunks)
    assert added == 2
    assert store1.index.ntotal == 2

    # 2. Simulate process restart: instantiate new store on same storage
    store2 = FAISSVectorStore(embedding_provider=provider, storage_dir=str(storage_dir))
    assert store2.index.ntotal == 2
    assert len(store2.id_mapping) == 2
    assert store2.rebuild_required is False

    # 3. Perform search on restarted store
    results = store2.search("Kubernetes and Terraform infrastructure", top_k=5, resume_id_filter="cand-persist-100")
    assert len(results) >= 1
    assert results[0].resume_id == "cand-persist-100"
    assert results[0].chunk_id in ("chunk-persist-1", "chunk-persist-2")


def test_atomic_persistence_no_orphan_tmp_files(tmp_path):
    """
    Verifies that atomic persistence writes through temporary files and replaces them,
    leaving no orphaned .tmp files in storage.
    """
    storage_dir = tmp_path / "atomic_tmp_test"
    provider = MockEmbeddingProvider(dimension=384)
    store = FAISSVectorStore(embedding_provider=provider, storage_dir=str(storage_dir))

    chunks = [
        ChunkInput(
            id="c-atomic-1",
            resume_id="r-atomic-1",
            content="Database performance tuning and indexing expert.",
            section="skills",
            chunk_index=0,
            content_hash="h1",
        )
    ]
    store.add_chunks("r-atomic-1", chunks)

    tmp_files = list(storage_dir.glob("*.tmp"))
    assert len(tmp_files) == 0, f"Found unexpected orphaned tmp files: {tmp_files}"
    assert (storage_dir / "resume.index").exists()
    assert (storage_dir / "resume_chunk_ids.json").exists()


def test_atomic_persistence_preserves_previous_artifacts_on_error(tmp_path, monkeypatch):
    """
    Verifies that if a crash or disk failure occurs during persistence,
    the previous valid index and metadata artifacts are NOT corrupted or overwritten.
    """
    import json
    storage_dir = tmp_path / "atomic_failure_test"
    provider = MockEmbeddingProvider(dimension=384)
    store = FAISSVectorStore(embedding_provider=provider, storage_dir=str(storage_dir))

    initial_chunk = [
        ChunkInput(
            id="c-initial-1",
            resume_id="r-initial-1",
            content="Initial valid production candidate data.",
            section="experience",
            chunk_index=0,
            content_hash="h_init",
        )
    ]
    store.add_chunks("r-initial-1", initial_chunk)
    assert store.index.ntotal == 1

    # Read original metadata and binary size
    original_index_size = (storage_dir / "resume.index").stat().st_size
    with open(storage_dir / "resume_chunk_ids.json", "r", encoding="utf-8") as f:
        original_mapping = json.load(f)

    # Monkeypatch json.dump to simulate disk failure during metadata write
    def fail_json_dump(*args, **kwargs):
        raise IOError("Simulated disk full / permission error during json.dump")

    monkeypatch.setattr("json.dump", fail_json_dump)

    failing_chunk = [
        ChunkInput(
            id="c-fail-2",
            resume_id="r-fail-2",
            content="This write should fail and roll back safely.",
            section="experience",
            chunk_index=1,
            content_hash="h_fail",
        )
    ]

    with pytest.raises(IOError, match="Simulated disk full"):
        store.add_chunks("r-fail-2", failing_chunk)

    # Verify original files are preserved intact
    assert (storage_dir / "resume.index").stat().st_size == original_index_size
    with open(storage_dir / "resume_chunk_ids.json", "r", encoding="utf-8") as f:
        current_mapping = json.load(f)
    assert current_mapping == original_mapping

    # Verify no dangling .tmp files remain
    tmp_files = list(storage_dir.glob("*.tmp"))
    assert len(tmp_files) == 0


def test_corrupted_index_binary_handling(tmp_path):
    """
    Verifies that a corrupted FAISS binary file is safely quarantined with a
    .corrupted timestamp suffix, and an empty rebuildable index is initialized
    without crashing the service.
    """
    import json
    storage_dir = tmp_path / "corrupt_index_test"
    storage_dir.mkdir(parents=True, exist_ok=True)

    # Write corrupt binary and valid empty metadata
    (storage_dir / "resume.index").write_bytes(b"NOT_A_VALID_FAISS_HEADER_GARBAGE_BYTES")
    with open(storage_dir / "resume_chunk_ids.json", "w", encoding="utf-8") as f:
        json.dump({}, f)

    provider = MockEmbeddingProvider(dimension=384)
    store = FAISSVectorStore(embedding_provider=provider, storage_dir=str(storage_dir))

    # Should quarantine corrupt file and enter rebuild_required state
    assert store.rebuild_required is True
    assert store.index.ntotal == 0

    corrupted_files = list(storage_dir.glob("resume.index.corrupted.*"))
    assert len(corrupted_files) >= 1
    assert (storage_dir / "resume.index").exists()


def test_corrupted_metadata_json_handling(tmp_path):
    """
    Verifies that a corrupted metadata JSON file is safely quarantined and
    reinitialized without silent data loss.
    """
    storage_dir = tmp_path / "corrupt_json_test"
    provider = MockEmbeddingProvider(dimension=384)

    # First create a valid index
    store1 = FAISSVectorStore(embedding_provider=provider, storage_dir=str(storage_dir))

    # Corrupt the JSON metadata
    (storage_dir / "resume_chunk_ids.json").write_text("{ MALFORMED_JSON_SYNTAX_CORRUPTED: [", encoding="utf-8")

    # Restart store
    store2 = FAISSVectorStore(embedding_provider=provider, storage_dir=str(storage_dir))
    assert store2.rebuild_required is True
    assert store2.index.ntotal == 0

    corrupted_json_files = list(storage_dir.glob("resume_chunk_ids.json.corrupted.*"))
    assert len(corrupted_json_files) >= 1


def test_index_metadata_count_mismatch_handling(tmp_path):
    """
    Verifies that when vector count does not match metadata mapping count,
    the inconsistency is caught, artifacts are quarantined, and rebuild_required is set.
    """
    import json
    storage_dir = tmp_path / "mismatch_test"
    provider = MockEmbeddingProvider(dimension=384)

    store1 = FAISSVectorStore(embedding_provider=provider, storage_dir=str(storage_dir))
    chunks = [
        ChunkInput(id="c1", resume_id="r1", content="Chunk 1", section="summary", chunk_index=0, content_hash="h1"),
        ChunkInput(id="c2", resume_id="r1", content="Chunk 2", section="experience", chunk_index=1, content_hash="h2"),
    ]
    store1.add_chunks("r1", chunks)
    assert store1.index.ntotal == 2

    # Manually delete one entry from JSON mapping to create an inconsistency
    with open(storage_dir / "resume_chunk_ids.json", "r", encoding="utf-8") as f:
        mapping = json.load(f)
    del mapping["1"]
    with open(storage_dir / "resume_chunk_ids.json", "w", encoding="utf-8") as f:
        json.dump(mapping, f)

    # Re-initialize store
    store2 = FAISSVectorStore(embedding_provider=provider, storage_dir=str(storage_dir))
    assert store2.rebuild_required is True
    assert store2.index.ntotal == 0


def test_orphan_partial_artifacts_handling(tmp_path):
    """
    Verifies that when only one artifact exists (e.g. index exists but mapping was lost),
    the orphan file is quarantined and a clean rebuildable index is initialized.
    """
    storage_dir = tmp_path / "orphan_test"
    provider = MockEmbeddingProvider(dimension=384)

    store1 = FAISSVectorStore(embedding_provider=provider, storage_dir=str(storage_dir))
    # Delete mapping file to simulate partial storage failure
    (storage_dir / "resume_chunk_ids.json").unlink()

    store2 = FAISSVectorStore(embedding_provider=provider, storage_dir=str(storage_dir))
    assert store2.rebuild_required is True
    assert (storage_dir / "resume.index").exists()
    assert (storage_dir / "resume_chunk_ids.json").exists()


def test_multi_tenant_candidate_isolation_exhaustive(tmp_path):
    """
    Exhaustively tests that querying with resume_id_filter strictly isolates
    candidate data and never returns cross-tenant chunk results.
    """
    storage_dir = tmp_path / "isolation_test"
    provider = MockEmbeddingProvider(dimension=384)
    store = FAISSVectorStore(embedding_provider=provider, storage_dir=str(storage_dir))

    # Candidate A: Financial Risk & Quantitative Finance
    chunks_a = [
        ChunkInput(
            id="chunk-fin-alpha",
            resume_id="cand-alpha",
            content="Built real-time Black-Scholes quantitative options pricing engine in C++.",
            section="experience",
            chunk_index=0,
            content_hash="h_fin",
        )
    ]
    # Candidate B: Deep Learning & Computer Vision
    chunks_b = [
        ChunkInput(
            id="chunk-cv-bravo",
            resume_id="cand-bravo",
            content="Trained YOLOv8 and Vision Transformers for surgical instrument detection in PyTorch.",
            section="experience",
            chunk_index=0,
            content_hash="h_cv",
        )
    ]

    store.add_chunks("cand-alpha", chunks_a)
    store.add_chunks("cand-bravo", chunks_b)

    # Query for finance while scoped to Candidate B -> must return NOTHING
    results_for_b = store.search("Black-Scholes quantitative options pricing", top_k=5, resume_id_filter="cand-bravo")
    for r in results_for_b:
        assert r.resume_id == "cand-bravo"
        assert r.chunk_id != "chunk-fin-alpha"

    # Query for computer vision while scoped to Candidate A -> must return NOTHING
    results_for_a = store.search("YOLOv8 Vision Transformers surgical PyTorch", top_k=5, resume_id_filter="cand-alpha")
    for r in results_for_a:
        assert r.resume_id == "cand-alpha"
        assert r.chunk_id != "chunk-cv-bravo"

    # Query scoped to non-existent candidate -> must return empty list
    results_empty = store.search("Quantitative options pricing", top_k=5, resume_id_filter="cand-nonexistent")
    assert results_empty == []


def test_rebuild_index_resets_rebuild_required(tmp_path):
    """
    Verifies that calling rebuild_index with authoritative chunks clears the
    rebuild_required flag and populates the index correctly.
    """
    storage_dir = tmp_path / "rebuild_recovery_test"
    provider = MockEmbeddingProvider(dimension=384)
    store = FAISSVectorStore(embedding_provider=provider, storage_dir=str(storage_dir))

    store.rebuild_required = True
    new_chunks = [
        ChunkInput(
            id="chunk-rebuilt-1",
            resume_id="cand-recov",
            content="Recovered candidate chunk from PostgreSQL source of truth.",
            section="experience",
            chunk_index=0,
            content_hash="h_recov",
        )
    ]

    rebuilt_count = store.rebuild_index(new_chunks)
    assert rebuilt_count == 1
    assert store.rebuild_required is False
    assert store.index.ntotal == 1

