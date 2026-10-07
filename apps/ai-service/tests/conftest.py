import pytest
from app.core.config import settings
import app.services.llm.factory as llm_factory


@pytest.fixture(autouse=True)
def reset_llm_factory_and_use_mock(monkeypatch):
    """
    Ensures unit tests default to fast local mock provider unless specifically
    testing live or composite providers.
    """
    monkeypatch.setattr(settings, "PRIMARY_LLM_PROVIDER", "mock")
    monkeypatch.setattr(settings, "FALLBACK_LLM_PROVIDER", "mock")
    monkeypatch.setattr(settings, "LLM_PROVIDER", "mock")
    llm_factory._llm_instance = None
    yield
    llm_factory._llm_instance = None


@pytest.fixture(scope="session", autouse=True)
def isolate_session_faiss_vector_store(tmp_path_factory):
    """
    Isolates FAISS storage per test session so pytest tests do not mutate
    or accumulate vectors in the runtime storage/faiss directory.
    """
    from app.services.vector_store import FAISSVectorStore
    test_storage = str(tmp_path_factory.mktemp("faiss_test_store"))
    FAISSVectorStore._reset_instance()
    orig_init = FAISSVectorStore.__init__

    def patched_init(self, *args, **kwargs):
        if "storage_dir" not in kwargs or kwargs.get("storage_dir") is None:
            kwargs["storage_dir"] = test_storage
        orig_init(self, *args, **kwargs)

    FAISSVectorStore.__init__ = patched_init
    yield
    FAISSVectorStore.__init__ = orig_init
    FAISSVectorStore._reset_instance()

