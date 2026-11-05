"""Automated unit and integration tests for the Brain Production Agent."""

from __future__ import annotations

from pathlib import Path
from fastapi.testclient import TestClient

from app.agent.orchestrator import BrainAgent
from app.database import DatabaseManager
from app.main import app
from app.memory.store import EpisodicMemoryStore, SessionStore
from app.rag.knowledge_base import KnowledgeBase
from app.schemas import ChatRequest
from app.tools.registry import build_default_registry


def test_health_and_status_endpoints():
    client = TestClient(app)
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "healthy"

    status = client.get("/api/v1/status")
    assert status.status_code == 200
    assert "stats" in status.json()


def test_memory_extraction_and_recall(tmp_path: Path):
    test_db = DatabaseManager(tmp_path / "test_mem.db")
    mem_store = EpisodicMemoryStore(test_db)

    extracted = mem_store.auto_extract_from_message(
        "Hi! Remember that our production database is PostgreSQL 16 on AWS RDS.",
        user_id="user_123",
    )
    assert len(extracted) >= 1

    recalled = mem_store.search_memories("What database do we use?", user_id="user_123")
    assert len(recalled) >= 1
    assert "PostgreSQL 16" in recalled[0]["content"]


def test_rag_ingestion_and_semantic_search(tmp_path: Path):
    test_db = DatabaseManager(tmp_path / "test_rag.db")
    kb = KnowledgeBase(test_db)

    doc = kb.ingest_document(
        title="Incident Escalation Policy",
        content=(
            "Severity 1 (SEV-1) incidents require an on-call engineer response within 15 minutes. "
            "All database failover events must be logged in the #incident-response channel."
        ),
        source="runbook://sev1",
        tags=["sre", "incident"],
    )
    assert doc["chunk_count"] >= 1

    hits = kb.search("How fast must on-call respond to SEV-1 incidents?", top_k=3)
    assert len(hits) >= 1
    assert "15 minutes" in hits[0]["content"]


def test_tools_execution():
    registry = build_default_registry()
    calc_res = registry.execute("python_calculator", {"expression": "sqrt(144) + mean([10, 20, 30])"})
    assert calc_res["success"] is True
    assert "32.0" in calc_res["output"]

    clock_res = registry.execute("system_clock", {})
    assert clock_res["success"] is True
    assert "utc_iso" in clock_res["output"]


def test_end_to_end_chat_turn():
    client = TestClient(app)

    # 1. Send message that saves a memory and runs a calculation
    resp = client.post(
        "/api/v1/chat",
        json={
            "message": "Remember that my name is Jordan. Also calculate 25 * 4 + 50",
            "user_id": "test_e2e_user",
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["session_id"].startswith("sess_")
    assert any(tc["tool_name"] == "python_calculator" for tc in body["tool_calls"])
    assert "150" in body["reply"]


def test_multi_agent_webapp_and_game_routing():
    client = TestClient(app)

    # 1. Auto-route a Web App + Supabase task
    webapp_resp = client.post(
        "/api/v1/chat",
        json={
            "message": "Build a SaaS dashboard web app with React frontend and Supabase RLS database schema.",
            "user_id": "dev_user",
        },
    )
    assert webapp_resp.status_code == 200
    w_body = webapp_resp.json()
    w_domains = {s["domain"] for s in w_body["active_specialists"]}
    assert "webapp" in w_domains
    assert any(tc["tool_name"] == "generate_webapp_blueprint" for tc in w_body["tool_calls"])

    # 2. Auto-route a Game Development task
    game_resp = client.post(
        "/api/v1/chat",
        json={
            "message": "Make a 2D roguelike platformer game in HTML5 Canvas with sprite collision and physics.",
            "user_id": "dev_user",
        },
    )
    assert game_resp.status_code == 200
    g_body = game_resp.json()
    g_domains = {s["domain"] for s in g_body["active_specialists"]}
    assert "game" in g_domains
    assert any(tc["tool_name"] == "generate_game_blueprint" for tc in g_body["tool_calls"])

