# ADR-025: Real AI Semantic Embeddings, LLM Integration & Grounded RAG Architecture

## Status
Accepted (Implemented in Phase 2)

## Context
In Phase 1, CareerForge-AI was built with an AI-ready architecture where semantic embeddings and LLM providers were represented via deterministic offline mock providers. To transition into an enterprise-grade GenAI & RAG platform, we require real dense semantic embeddings, production LLM integrations (Google Gemini & OpenAI), grounded RAG pipelines with verifiable citations, multi-layer prompt-injection defenses, and hallucination resistance.

## Decisions

### 1. Real Semantic Embedding Engine
- Integrated **FastEmbed** (`BAAI/bge-small-en-v1.5` / ONNX runtime quantized models) to generate 384-dimensional dense vectors with strict L2-normalization.
- Configured dimensionality (384) exactly matching the persistent FAISS vector index (`IndexFlatIP`).
- Dot-product on normalized vectors yields exact cosine similarity without runtime re-normalization overhead.
- `MockEmbeddingProvider` is strictly quarantined for offline unit tests and cannot run when `ENVIRONMENT=production`.

### 2. Multi-Provider LLM Architecture
- Implemented **GeminiLLMProvider** (`gemini-1.5-flash`) and **OpenAILLMProvider** (`gpt-4o-mini`) via direct asynchronous HTTP clients (`httpx.AsyncClient`).
- Implemented provider-level resilience: 10s request timeouts, bounded exponential backoff on transient 429/5xx errors, and structured Pydantic schema validation.
- Implemented safe structured logging: zero leakage of API keys, bearer tokens, or raw candidate PII.

### 3. Grounded RAG Pipeline & Untrusted Context Sandboxing
- Implemented strict isolation of retrieved documents using structured boundaries:
  ```text
  <<<UNTRUSTED_DOCUMENT_CONTEXT>>>
  [Doc 1: Title | Score: 0.92]
  Document text...
  <<<END_UNTRUSTED_DOCUMENT_CONTEXT>>>
  ```
- Explicit system prompt instructions dictate that text within untrusted context tags cannot override system policies or developer directives.
- All candidate recommendations and match explanations cite specific retrieved documents with document IDs and similarity scores.

### 4. Hallucination Resistance & Insufficient Context Handling
- Unsupported or speculative queries (e.g. predicting hiring decisions or querying missing data) trigger explicit `INSUFFICIENT_CONTEXT` responses.
- The system never hallucinates fake jobs, compensation numbers, or credentials.

### 5. AI Evaluation Suite
- Created `apps/ai-service/tests/test_ai_evaluation.py` containing deterministic evaluations for:
  1. Semantic similarity ordering (`similarity(React, Frontend) > similarity(React, Mechanical)`).
  2. Top-K FAISS retrieval and irrelevant document rejection.
  3. Grounded RAG generation with verifiable citation payloads.
  4. Hallucination resistance on zero-context queries.
  5. Prompt-injection defense against adversarial system overrides.

## Consequences
- CareerForge-AI operates as a fully functional, grounded GenAI and RAG platform.
- Zero mock providers in production environments.
- Comprehensive AI quality gates verify semantic accuracy and prompt injection defense on every CI run.
