"""Monthly Trend Learning Engine (Strictly Trends: Web App, Game Dev & Architecture Trends)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.database import DatabaseManager, db

DEFAULT_MONTHLY_TRENDS: List[Dict[str, Any]] = [
    {
        "agent_id": "auto_router",
        "domain": "orchestrator",
        "trend_title": "Compound Multi-Agent Orchestration & Small Specialist Routing",
        "trend_summary": "Routing domain tasks to focused specialist sub-agents (Architect, UI, Database, Game Loop) reduces token latency by 45% and improves code accuracy over monolithic prompts.",
        "trend_tags": ["multi-agent", "routing", "orchestration", "trends-only"],
        "momentum_score": 96,
    },
    {
        "agent_id": "webapp_architect",
        "domain": "webapp",
        "trend_title": "Local-First Sync Engines & Edge-Cached Server Actions",
        "trend_summary": "Modern web apps increasingly pair optimistic local-first state caches with edge-cached REST/SSE APIs and zero-config container deployments.",
        "trend_tags": ["local-first", "sse", "edge", "architecture"],
        "momentum_score": 93,
    },
    {
        "agent_id": "frontend_ui_agent",
        "domain": "webapp",
        "trend_title": "Interactive Canvas Micro-Worlds & Tactile Bento Grids",
        "trend_summary": "High-engagement web interfaces blend clean dark-mode bento telemetry grids with cozy interactive 2D/Chibi status visualizations and zero-dependency CSS variable theming.",
        "trend_tags": ["bento-ui", "chibi-canvas", "micro-interactions", "css-grid"],
        "momentum_score": 95,
    },
    {
        "agent_id": "backend_supabase_agent",
        "domain": "webapp",
        "trend_title": "Postgres InitPlan RLS Caching, Covering INCLUDE Indexes & HNSW Hybrid RAG",
        "trend_summary": "Wrapping auth.uid() in (SELECT auth.uid()) inside RLS policies, using GENERATED ALWAYS AS IDENTITY PKs, and combining tsvector GIN with pgvector HNSW delivers 100x faster multi-tenant queries.",
        "trend_tags": ["supabase", "postgres", "rls-initplan", "covering-indexes", "hnsw"],
        "momentum_score": 98,
    },
    {
        "agent_id": "game_designer",
        "domain": "game",
        "trend_title": "Cozy Life-Sim & Roguelite Farm/Base-Building Meta-Loops",
        "trend_summary": "Blending tactile base/house construction with seasonal farm harvesting and clear synergetic upgrade trees drives top player retention in indie and web games.",
        "trend_tags": ["cozy-sim", "base-building", "farming-loop", "roguelite"],
        "momentum_score": 94,
    },
    {
        "agent_id": "game_engine_coder",
        "domain": "game",
        "trend_title": "Deterministic 60FPS Fixed-Timestep HTML5 Canvas & WebGPU ECS",
        "trend_summary": "Decoupling fixed delta-time physics updates (dt = 1/60s) from interpolated rendering with lightweight Entity-Component-System (ECS) arrays ensures stutter-free browser gameplay.",
        "trend_tags": ["ecs", "fixed-timestep", "html5-canvas", "60fps"],
        "momentum_score": 92,
    },
    {
        "agent_id": "game_world_narrative",
        "domain": "game",
        "trend_title": "Reactive Environmental Storytelling & Dynamic Chibi Villager Barks",
        "trend_summary": "Short context-aware character speech bubbles ('barks') tied to live world state (building a house or tending farm crops) create living worlds without heavy cutscenes.",
        "trend_tags": ["reactive-barks", "world-building", "chibi-villagers", "narrative"],
        "momentum_score": 90,
    },
    {
        "agent_id": "qa_security_agent",
        "domain": "core",
        "trend_title": "Automated RLS Policy Verification & Frame-Time Budget Auditing",
        "trend_summary": "Continuous verification of Postgres foreign-key index coverage, RLS tenant isolation, and 16.6ms frame-time budgets prevents production regressions.",
        "trend_tags": ["rls-audit", "frame-budget", "fk-indexes", "automated-qa"],
        "momentum_score": 91,
    },
]


class MonthlyTrendLearner:
    """
    Manages monthly trend learning across all specialist agents.
    Strictly learns and stores industry/tech/gameplay trends per calendar month (YYYY-MM) — never personal user data.
    """

    def __init__(self, database: DatabaseManager = db) -> None:
        self.db = database
        self.ensure_current_month_synced()

    @staticmethod
    def current_month_key() -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m")

    def ensure_current_month_synced(self, month_key: Optional[str] = None) -> Dict[str, Any]:
        """Ensure the given YYYY-MM cycle has trend learnings seeded/synced for all specialists."""
        target_month = month_key or self.current_month_key()
        now_iso = datetime.now(timezone.utc).isoformat()
        inserted = 0

        with self.db.connection() as conn:
            for item in DEFAULT_MONTHLY_TRENDS:
                cur = conn.execute(
                    """
                    INSERT OR IGNORE INTO monthly_trend_learnings
                    (month_key, domain, agent_id, trend_title, trend_summary, trend_tags_json, momentum_score, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        target_month,
                        item["domain"],
                        item["agent_id"],
                        item["trend_title"],
                        item["trend_summary"],
                        json.dumps(item["trend_tags"]),
                        item["momentum_score"],
                        now_iso,
                    ),
                )
                inserted += cur.rowcount

        return {
            "month_key": target_month,
            "mode": "strictly_trends_only",
            "new_trends_learned": inserted,
            "total_trends_for_month": len(self.list_trends(month_key=target_month)),
        }

    def add_trend(
        self,
        agent_id: str,
        domain: str,
        trend_title: str,
        trend_summary: str,
        trend_tags: Optional[List[str]] = None,
        momentum_score: int = 88,
        month_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Record a new monthly trend (strictly tech/design/game trends)."""
        target_month = month_key or self.current_month_key()
        now_iso = datetime.now(timezone.utc).isoformat()
        tags = trend_tags or ["trend"]
        score = max(1, min(100, int(momentum_score)))

        with self.db.connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO monthly_trend_learnings
                (month_key, domain, agent_id, trend_title, trend_summary, trend_tags_json, momentum_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    target_month,
                    domain.strip(),
                    agent_id.strip(),
                    trend_title.strip(),
                    trend_summary.strip(),
                    json.dumps(tags),
                    score,
                    now_iso,
                ),
            )

        return {
            "month_key": target_month,
            "agent_id": agent_id,
            "domain": domain,
            "trend_title": trend_title,
            "trend_summary": trend_summary,
            "trend_tags": tags,
            "momentum_score": score,
            "created_at": now_iso,
        }

    def list_trends(
        self,
        month_key: Optional[str] = None,
        domain: Optional[str] = None,
        agent_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query = (
            "SELECT id, month_key, domain, agent_id, trend_title, trend_summary, "
            "trend_tags_json, momentum_score, created_at "
            "FROM monthly_trend_learnings WHERE 1=1"
        )
        params: List[Any] = []
        if month_key:
            query += " AND month_key = ?"
            params.append(month_key)
        if domain and domain != "all":
            query += " AND domain = ?"
            params.append(domain)
        if agent_id:
            query += " AND agent_id = ?"
            params.append(agent_id)

        query += " ORDER BY month_key DESC, momentum_score DESC, id ASC"

        with self.db.connection() as conn:
            rows = conn.execute(query, tuple(params)).fetchall()

        return [
            {
                "id": r["id"],
                "month_key": r["month_key"],
                "domain": r["domain"],
                "agent_id": r["agent_id"],
                "trend_title": r["trend_title"],
                "trend_summary": r["trend_summary"],
                "trend_tags": json.loads(r["trend_tags_json"] or "[]"),
                "momentum_score": r["momentum_score"],
                "created_at": r["created_at"],
            }
            for r in rows
        ]

    def get_trends_for_agents(
        self,
        agent_ids: List[str],
        month_key: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        target_month = month_key or self.current_month_key()
        all_month = self.list_trends(month_key=target_month)
        matched = [t for t in all_month if t["agent_id"] in agent_ids]
        return matched if matched else all_month[:3]


trend_learner = MonthlyTrendLearner()
