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
