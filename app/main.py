"""FastAPI production application entrypoint for the Brain Agent."""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from collections import defaultdict, deque
from pathlib import Path
from typing import Any, AsyncIterator, Deque, Dict, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from app import __version__
from app.agent.orchestrator import brain_agent
from app.agent.specialists import specialist_registry
from app.agent.trends import trend_learner
from app.config import settings
from app.database import db
from app.memory.store import memory_store, session_store
from app.rag.knowledge_base import knowledge_base
from app.schemas import (
    ChatRequest,
    ChatResponse,
    DocumentIngestRequest,
    KnowledgeSearchRequest,
    MemoryCreateRequest,
    RuntimeConfigUpdateRequest,
    SpecialistCreateRequest,
    TrendCreateRequest,
)
from app.tools.registry import tool_registry

# ============================================================================
# Structured Logging Setup
# ============================================================================
logging.basicConfig(
    level=getattr(logging, settings.log_level, logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("brain.api")

app = FastAPI(
    title=settings.app_name,
    version=__version__,
    description=(
        "Production AI Agent Brain with Persistent Long-Term Memory, "
        "Hybrid RAG Knowledge Base, Multi-Provider Tool Calling, REST/SSE, and WebSocket APIs."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Security: Rate Limiting & API Key Authentication
# ============================================================================
_rate_buckets: Dict[str, Deque[float]] = defaultdict(deque)


@app.middleware("http")
async def observability_and_rate_limit_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:10]}"
    start = time.perf_counter()

    # Rate limit check for API routes
    if request.url.path.startswith("/api/"):
        client_id = (
            request.headers.get("X-API-Key")
            or (request.client.host if request.client else "local")
        )
        now = time.monotonic()
        bucket = _rate_buckets[client_id]
        while bucket and now - bucket[0] > 60.0:
            bucket.popleft()
        if len(bucket) >= settings.rate_limit_per_minute:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "limit_per_minute": settings.rate_limit_per_minute,
                    "request_id": request_id,
                },
            )
        bucket.append(now)

    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - start) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-Ms"] = str(elapsed_ms)
    return response


async def verify_api_key(
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
) -> Optional[str]:
    """Enforce API key authentication when BRAIN_API_KEYS is configured."""
    if not settings.api_keys:
        return None

    token = x_api_key
    if not token and authorization and authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if not token or token not in settings.api_keys:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key. Provide 'X-API-Key' or 'Authorization: Bearer <key>'.",
        )
    return token


# ============================================================================
# Health, Readiness & System Telemetry Endpoints
# ============================================================================
@app.get("/health", tags=["System"])
async def health_check() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": __version__,
        "active_provider": settings.resolve_active_provider(),
        "active_model": settings.resolve_active_model(),
    }


@app.get("/ready", tags=["System"])
async def readiness_check() -> Dict[str, Any]:
    with db.connection() as conn:
        conn.execute("SELECT 1").fetchone()
    return {"status": "ready", "database": "connected"}


@app.get("/api/v1/status", dependencies=[Depends(verify_api_key)], tags=["System"])
async def system_status() -> Dict[str, Any]:
    with db.connection() as conn:
        sessions_count = conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
        messages_count = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
        memories_count = conn.execute("SELECT COUNT(*) FROM memories").fetchone()[0]
        docs_count = conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
        chunks_count = conn.execute("SELECT COUNT(*) FROM document_chunks").fetchone()[0]
        avg_latency = (
            conn.execute("SELECT AVG(latency_ms) FROM telemetry_logs").fetchone()[0] or 0.0
        )

    return {
        "app_name": settings.app_name,
        "version": __version__,
        "environment": settings.app_env,
        "auth_enabled": bool(settings.api_keys),
        "active_provider": settings.resolve_active_provider(),
        "active_model": settings.resolve_active_model(),
        "providers_configured": {
            "openai": bool(settings.openai_api_key),
            "gemini": bool(settings.gemini_api_key),
            "anthropic": bool(settings.anthropic_api_key),
            "ollama": True,
            "local": True,
        },
        "stats": {
            "sessions": sessions_count,
            "messages": messages_count,
            "memories": memories_count,
            "documents": docs_count,
            "chunks": chunks_count,
            "avg_latency_ms": round(float(avg_latency), 2),
        },
        "supabase": {
            "project_ref": settings.supabase_project_ref,
            "url": settings.supabase_url,
            "configured": bool(settings.supabase_anon_key or settings.supabase_service_role_key),
        },
        "specialists_count": len(specialist_registry.list_agents()),
        "monthly_trends_count": len(trend_learner.list_trends()),
        "current_trend_month": trend_learner.current_month_key(),
        "tools_registered": len(tool_registry.list_tools()),
    }


# ============================================================================
# Agent Chat Endpoints (REST, SSE Streaming, WebSocket)
# ============================================================================
@app.post(
    "/api/v1/chat",
    response_model=ChatResponse,
    dependencies=[Depends(verify_api_key)],
    tags=["Agent Chat"],
)
async def chat_endpoint(req: ChatRequest) -> ChatResponse:
    """Execute a synchronous production agent turn with memory recall, RAG, and tool calling."""
    return await asyncio.to_thread(brain_agent.run_turn, req)


@app.post(
    "/api/v1/chat/stream",
    dependencies=[Depends(verify_api_key)],
    tags=["Agent Chat"],
)
async def chat_stream_endpoint(req: ChatRequest) -> StreamingResponse:
    """
    Server-Sent Events (SSE) streaming endpoint.
    Emits structured events: `context`, `tool_call`, `token`, and `done`.
    """

    async def event_generator() -> AsyncIterator[str]:
        res: ChatResponse = await asyncio.to_thread(brain_agent.run_turn, req)

        if res.retrieved_context or res.memories_saved:
            ctx_payload = {
                "type": "context",
                "session_id": res.session_id,
                "memories_saved": res.memories_saved,
                "retrieved_context": [c.model_dump() for c in res.retrieved_context],
            }
            yield f"data: {json.dumps(ctx_payload)}\n\n"

        for step in res.tool_calls:
            tool_payload = {"type": "tool_call", "step": step.model_dump()}
            yield f"data: {json.dumps(tool_payload)}\n\n"

        # Stream reply tokens smoothly for real-time UI rendering
        words = res.reply.split(" ")
        chunk_size = 4
        for i in range(0, len(words), chunk_size):
            piece = " ".join(words[i : i + chunk_size])
            if i + chunk_size < len(words):
                piece += " "
            yield f"data: {json.dumps({'type': 'token', 'content': piece})}\n\n"
            await asyncio.sleep(0.015)

        done_payload = {
            "type": "done",
            "response": res.model_dump(),
        }
        yield f"data: {json.dumps(done_payload)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.websocket("/ws/chat/{session_id}")
async def websocket_chat_endpoint(websocket: WebSocket, session_id: str) -> None:
    """Bidirectional WebSocket endpoint for real-time agent interaction."""
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_text()
            payload = json.loads(raw)

            # Verify API key if configured
            if settings.api_keys:
                api_key = payload.get("api_key") or websocket.headers.get("X-API-Key")
                if api_key not in settings.api_keys:
                    await websocket.send_json({"type": "error", "error": "Unauthorized API key"})
                    continue

            chat_req = ChatRequest(
                message=payload.get("message", ""),
                session_id=session_id,
                user_id=payload.get("user_id", "default_user"),
                enable_tools=payload.get("enable_tools", True),
                enable_rag=payload.get("enable_rag", True),
                enable_memory=payload.get("enable_memory", True),
                provider_override=payload.get("provider_override"),
                model_override=payload.get("model_override"),
            )
            await websocket.send_json({"type": "status", "status": "thinking"})
            res = await asyncio.to_thread(brain_agent.run_turn, chat_req)
            await websocket.send_json({"type": "response", "data": res.model_dump()})
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for session %s", session_id)
    except Exception as exc:
        logger.exception("WebSocket error: %s", exc)
        try:
            await websocket.send_json({"type": "error", "error": str(exc)})
        except Exception:
            pass


# ============================================================================
# Sessions & Conversation History Endpoints
# ============================================================================
@app.get("/api/v1/sessions", dependencies=[Depends(verify_api_key)], tags=["Sessions"])
async def list_sessions(user_id: Optional[str] = None) -> Dict[str, Any]:
    sessions = session_store.list_sessions(user_id=user_id)
    return {"sessions": sessions}


@app.get(
    "/api/v1/sessions/{session_id}/messages",
    dependencies=[Depends(verify_api_key)],
    tags=["Sessions"],
)
async def get_session_messages(session_id: str, limit: int = 50) -> Dict[str, Any]:
    messages = session_store.get_history(session_id=session_id, limit=limit)
    return {"session_id": session_id, "messages": messages}


@app.delete(
    "/api/v1/sessions/{session_id}",
    dependencies=[Depends(verify_api_key)],
    tags=["Sessions"],
)
async def delete_session(session_id: str) -> Dict[str, Any]:
    deleted = session_store.delete_session(session_id=session_id)
    return {"deleted": deleted, "session_id": session_id}


# ============================================================================
# Long-Term Episodic Memory Endpoints
# ============================================================================
@app.get("/api/v1/memories", dependencies=[Depends(verify_api_key)], tags=["Memory"])
async def list_memories(
    user_id: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
) -> Dict[str, Any]:
    items = memory_store.list_memories(user_id=user_id, category=category, limit=limit)
    return {"count": len(items), "memories": items}


@app.post("/api/v1/memories", dependencies=[Depends(verify_api_key)], tags=["Memory"])
async def create_memory(req: MemoryCreateRequest) -> Dict[str, Any]:
    item = memory_store.add_memory(
        content=req.content,
        user_id=req.user_id,
        category=req.category,
        importance=req.importance,
        metadata=req.metadata,
    )
    return {"memory": item}


@app.post("/api/v1/memories/search", dependencies=[Depends(verify_api_key)], tags=["Memory"])
async def search_memories(
    query: str,
    user_id: str = "default_user",
    top_k: int = 5,
) -> Dict[str, Any]:
    hits = memory_store.search_memories(query=query, user_id=user_id, top_k=top_k)
    return {"query": query, "results": hits}


@app.delete(
    "/api/v1/memories/{memory_id}",
    dependencies=[Depends(verify_api_key)],
    tags=["Memory"],
)
async def delete_memory(memory_id: str) -> Dict[str, Any]:
    deleted = memory_store.delete_memory(memory_id=memory_id)
    return {"deleted": deleted, "memory_id": memory_id}


# ============================================================================
# Knowledge Base (RAG) Endpoints
# ============================================================================
@app.get("/api/v1/knowledge", dependencies=[Depends(verify_api_key)], tags=["Knowledge Base"])
async def list_knowledge_documents() -> Dict[str, Any]:
    docs = knowledge_base.list_documents()
    return {"count": len(docs), "documents": docs}


@app.post("/api/v1/knowledge", dependencies=[Depends(verify_api_key)], tags=["Knowledge Base"])
async def ingest_knowledge_document(req: DocumentIngestRequest) -> Dict[str, Any]:
    doc = knowledge_base.ingest_document(
        title=req.title,
        content=req.content,
        source=req.source,
        tags=req.tags,
        metadata=req.metadata,
    )
    return {"document": doc}


@app.post(
    "/api/v1/knowledge/search",
    dependencies=[Depends(verify_api_key)],
    tags=["Knowledge Base"],
)
async def search_knowledge(req: KnowledgeSearchRequest) -> Dict[str, Any]:
    hits = knowledge_base.search(query=req.query, top_k=req.top_k)
    return {"query": req.query, "count": len(hits), "results": hits}


@app.delete(
    "/api/v1/knowledge/{doc_id}",
    dependencies=[Depends(verify_api_key)],
    tags=["Knowledge Base"],
)
async def delete_knowledge_document(doc_id: str) -> Dict[str, Any]:
    deleted = knowledge_base.delete_document(doc_id=doc_id)
    return {"deleted": deleted, "document_id": doc_id}


# ============================================================================
# Specialist Sub-Agents (Web App & Game Development) Endpoints
# ============================================================================
@app.get("/api/v1/specialists", dependencies=[Depends(verify_api_key)], tags=["Specialist Agents"])
async def list_specialists(domain: Optional[str] = None) -> Dict[str, Any]:
    agents = specialist_registry.list_agents(domain=domain)
    return {"count": len(agents), "specialists": agents}


@app.post("/api/v1/specialists", dependencies=[Depends(verify_api_key)], tags=["Specialist Agents"])
async def create_specialist(req: SpecialistCreateRequest) -> Dict[str, Any]:
    created = specialist_registry.create_custom_agent(
        agent_id=req.id,
        name=req.name,
        role=req.role,
        domain=req.domain,
        icon=req.icon,
        description=req.description,
        system_prompt=req.system_prompt,
        keywords=req.keywords,
        preferred_tools=req.preferred_tools,
    )
    return {"specialist": created}


@app.delete(
    "/api/v1/specialists/{agent_id}",
    dependencies=[Depends(verify_api_key)],
    tags=["Specialist Agents"],
)
async def delete_specialist(agent_id: str) -> Dict[str, Any]:
    deleted = specialist_registry.delete_custom_agent(agent_id=agent_id)
    return {"deleted": deleted, "agent_id": agent_id}


# ============================================================================
# Monthly Trend Learning Endpoints (Strictly Industry & Tech Trends Only)
# ============================================================================
@app.get("/api/v1/trends", dependencies=[Depends(verify_api_key)], tags=["Monthly Trends"])
async def list_monthly_trends(
    month_key: Optional[str] = None,
    domain: Optional[str] = None,
    agent_id: Optional[str] = None,
) -> Dict[str, Any]:
    trends = trend_learner.list_trends(month_key=month_key, domain=domain, agent_id=agent_id)
    return {
        "current_month": trend_learner.current_month_key(),
        "policy": "strictly_trends_only",
        "count": len(trends),
        "trends": trends,
    }


@app.post("/api/v1/trends/sync", dependencies=[Depends(verify_api_key)], tags=["Monthly Trends"])
async def sync_monthly_trends(month_key: Optional[str] = None) -> Dict[str, Any]:
    return trend_learner.ensure_current_month_synced(month_key=month_key)


@app.post("/api/v1/trends", dependencies=[Depends(verify_api_key)], tags=["Monthly Trends"])
async def add_monthly_trend(req: TrendCreateRequest) -> Dict[str, Any]:
    trend = trend_learner.add_trend(
        agent_id=req.agent_id,
        domain=req.domain,
        trend_title=req.trend_title,
        trend_summary=req.trend_summary,
        trend_tags=req.trend_tags,
        momentum_score=req.momentum_score,
        month_key=req.month_key,
    )
    return {"trend": trend}


# ============================================================================
# Tools & Runtime Configuration Endpoints
# ============================================================================
@app.get("/api/v1/tools", dependencies=[Depends(verify_api_key)], tags=["Tools"])
async def list_registered_tools() -> Dict[str, Any]:
    tools = tool_registry.list_tools()
    return {"count": len(tools), "tools": tools}


@app.post(
    "/api/v1/tools/{tool_name}/execute",
    dependencies=[Depends(verify_api_key)],
    tags=["Tools"],
)
async def execute_tool_directly(tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    return await asyncio.to_thread(tool_registry.execute, tool_name, arguments)


@app.get("/api/v1/config", dependencies=[Depends(verify_api_key)], tags=["System"])
async def get_runtime_config() -> Dict[str, Any]:
    return {
        "llm_provider": settings.llm_provider,
        "active_provider": settings.resolve_active_provider(),
        "active_model": settings.resolve_active_model(),
        "openai_base_url": settings.openai_base_url,
        "openai_model": settings.openai_model,
        "openai_key_set": bool(settings.openai_api_key),
        "gemini_model": settings.gemini_model,
        "gemini_key_set": bool(settings.gemini_api_key),
        "anthropic_model": settings.anthropic_model,
        "anthropic_key_set": bool(settings.anthropic_api_key),
        "ollama_base_url": settings.ollama_base_url,
        "ollama_model": settings.ollama_model,
        "system_prompt": settings.system_prompt,
    }


@app.post("/api/v1/config", dependencies=[Depends(verify_api_key)], tags=["System"])
async def update_runtime_config(req: RuntimeConfigUpdateRequest) -> Dict[str, Any]:
    if req.llm_provider is not None:
        settings.llm_provider = req.llm_provider.strip().lower()
    if req.openai_api_key is not None and req.openai_api_key.strip():
        settings.openai_api_key = req.openai_api_key.strip()
    if req.openai_base_url is not None and req.openai_base_url.strip():
        settings.openai_base_url = req.openai_base_url.strip()
    if req.openai_model is not None and req.openai_model.strip():
        settings.openai_model = req.openai_model.strip()
    if req.gemini_api_key is not None and req.gemini_api_key.strip():
        settings.gemini_api_key = req.gemini_api_key.strip()
    if req.gemini_model is not None and req.gemini_model.strip():
        settings.gemini_model = req.gemini_model.strip()
    if req.anthropic_api_key is not None and req.anthropic_api_key.strip():
        settings.anthropic_api_key = req.anthropic_api_key.strip()
    if req.anthropic_model is not None and req.anthropic_model.strip():
        settings.anthropic_model = req.anthropic_model.strip()
    if req.ollama_base_url is not None and req.ollama_base_url.strip():
        settings.ollama_base_url = req.ollama_base_url.strip()
    if req.ollama_model is not None and req.ollama_model.strip():
        settings.ollama_model = req.ollama_model.strip()
    if req.system_prompt is not None and req.system_prompt.strip():
        settings.system_prompt = req.system_prompt.strip()

    return {
        "status": "updated",
        "active_provider": settings.resolve_active_provider(),
        "active_model": settings.resolve_active_model(),
    }


# ============================================================================
# Static Web Dashboard & Chat Studio
# ============================================================================
STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/", include_in_schema=False)
async def serve_dashboard() -> FileResponse:
    return FileResponse(str(STATIC_DIR / "index.html"))

