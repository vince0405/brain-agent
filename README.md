# 🧠 Brain — Production AI Agent Service

A full-stack, production-ready AI Agent microservice built with **FastAPI**, **SQLite WAL persistence**, **Multi-Provider LLM Orchestration** (OpenAI, Google Gemini, Anthropic Claude, Ollama, plus a zero-config Local Hybrid Engine), **Persistent Long-Term Memory**, **Hybrid RAG Knowledge Base**, **Extensible Tool Calling**, and a built-in **Web Control Studio**.

---

## ✨ Key Production Capabilities

1. **Multi-Provider LLM Engine (`app/agent/orchestrator.py`)**
   - Supports **OpenAI** (`gpt-4o-mini`, `gpt-4o`, or any OpenAI-compatible endpoint like vLLM, Groq, OpenRouter, DeepSeek), **Google Gemini** (`gemini-2.5-flash`), **Anthropic Claude** (`claude-3-5-sonnet-latest`), and **Ollama** (`llama3.2`).
   - Includes a deterministic **Local Hybrid Reasoning Engine** (`brain-local-hybrid-v1`) so the service boots, executes tools, recalls memories, and searches RAG documents immediately even before an external API key is configured.
2. **Dual-Layer Memory System (`app/memory/store.py`)**
   - **Short-Term Session Memory**: Persistent multi-turn conversation history per `session_id` and `user_id`.
   - **Long-Term Episodic Memory**: Automatically extracts durable facts, preferences, and standing instructions from natural conversation and recalls them semantically across sessions.
3. **Hybrid RAG Knowledge Base (`app/rag/knowledge_base.py` & `app/rag/embeddings.py`)**
   - Paragraph-aware recursive document chunking with overlap.
   - Hybrid vector cosine similarity + lexical BM25/recall scoring with citations.
4. **Production Tool Registry (`app/tools/registry.py`)**
   - `search_knowledge_base`: Query RAG documents with relevance scores.
   - `save_memory` / `recall_memory`: Store and search persistent user/tenant memories.
   - `python_calculator`: AST-sandboxed mathematical & statistical expression evaluator.
   - `sql_analytics_query`: Read-only `SELECT` introspection over agent tables.
   - `web_fetch`: Fetch and sanitize readable content from HTTP/HTTPS URLs.
   - `system_clock`: Live UTC/local timestamps and database telemetry.
5. **Production Security & Observability (`app/main.py`)**
   - API Key Authentication (`X-API-Key` or `Authorization: Bearer <token>`) controlled via `BRAIN_API_KEYS`.
   - Per-client sliding-window Rate Limiting (`RATE_LIMIT_PER_MINUTE`).
   - Correlation headers (`X-Request-ID`, `X-Process-Time-Ms`), `/health`, `/ready`, and `/api/v1/status`.

---

## 🚀 Quick Start

### Option 1: Run Locally with Python

```powershell
# 1. Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy environment configuration (optional: add your OPENAI_API_KEY or GEMINI_API_KEY)
Copy-Item .env.example .env

# 4. Start the production server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open **http://localhost:8000** in your browser to launch the **Brain Agent Studio Dashboard**, or visit **http://localhost:8000/docs** for interactive OpenAPI documentation.

### Option 2: Run with Docker Compose

```bash
cp .env.example .env
docker compose up --build -d
```

---

## 🔌 Using Brain as an Agent in Your Production App

### Python SDK (`sdk/brain_client.py`)

```python
from sdk.brain_client import BrainClient

brain = BrainClient(base_url="http://localhost:8000", api_key="your-secret-key")

# 1. Ingest product documentation or runbooks into RAG
brain.ingest_document(
    title="Refund Policy",
    content="Enterprise customers are eligible for a full refund within 30 days of invoice.",
    source="policy://refunds",
    tags=["billing", "policy"],
)

# 2. Store a persistent user/tenant fact
brain.remember(
    content="Customer is on the Enterprise Annual plan.",
    user_id="cust_99",
    category="fact",
)

# 3. Run an agent turn (automatically combines Memory + RAG + Tool Calling)
response = brain.chat(
    message="Am I eligible for a refund after 12 days, and what is 12 / 30 as a percentage?",
    user_id="cust_99",
)
print(response["reply"])
```

### REST API (`POST /api/v1/chat`)

```bash
curl -X POST http://localhost:8000/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-key" \
  -d '{
    "message": "Calculate sqrt(1024) * 15 and check the system clock",
    "user_id": "prod_service_1"
  }'
```

---

## 🧪 Running Tests

```powershell
pytest -v
```

