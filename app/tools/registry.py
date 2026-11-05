"""Extensible tool registry with OpenAI/Gemini/Anthropic schema export and built-in tools."""

from __future__ import annotations

import ast
import json
import math
import operator
import re
import statistics
import time
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List

from app.database import db
from app.memory.store import memory_store
from app.rag.knowledge_base import knowledge_base


@dataclass
class ToolDefinition:
    name: str
    description: str
    parameters: Dict[str, Any]
    handler: Callable[..., Any]

    def to_openai_schema(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }

    def to_anthropic_schema(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.parameters,
        }


class ToolRegistry:
    """Central registry for agent tools with safe execution and telemetry."""

    def __init__(self) -> None:
        self._tools: Dict[str, ToolDefinition] = {}

    def register(
        self,
        name: str,
        description: str,
        parameters: Dict[str, Any],
        handler: Callable[..., Any],
    ) -> None:
        self._tools[name] = ToolDefinition(
            name=name,
            description=description,
            parameters=parameters,
            handler=handler,
        )

    def list_tools(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": t.name,
                "description": t.description,
                "parameters": t.parameters,
            }
            for t in self._tools.values()
        ]

    def get_openai_tools(self) -> List[Dict[str, Any]]:
        return [t.to_openai_schema() for t in self._tools.values()]

    def get_anthropic_tools(self) -> List[Dict[str, Any]]:
        return [t.to_anthropic_schema() for t in self._tools.values()]

    def execute(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        start = time.perf_counter()
        tool = self._tools.get(name)
        if not tool:
            return {
                "tool_name": name,
                "arguments": arguments,
                "output": json.dumps({"error": f"Unknown tool '{name}'"}),
                "duration_ms": round((time.perf_counter() - start) * 1000, 2),
                "success": False,
            }

        try:
            result = tool.handler(**arguments)
            output_str = (
                result
                if isinstance(result, str)
                else json.dumps(result, ensure_ascii=False, default=str)
            )
            return {
                "tool_name": name,
                "arguments": arguments,
                "output": output_str,
                "duration_ms": round((time.perf_counter() - start) * 1000, 2),
                "success": True,
            }
        except Exception as exc:
            return {
                "tool_name": name,
                "arguments": arguments,
                "output": json.dumps({"error": str(exc)}),
                "duration_ms": round((time.perf_counter() - start) * 1000, 2),
                "success": False,
            }


# ============================================================================
# Safe Math & Expression Evaluator
# ============================================================================

SAFE_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}

SAFE_FUNCTIONS: Dict[str, Any] = {
    "abs": abs,
    "round": round,
    "min": min,
    "max": max,
    "sum": sum,
    "len": len,
    "sqrt": math.sqrt,
    "sin": math.sin,
    "cos": math.cos,
    "tan": math.tan,
    "log": math.log,
    "log10": math.log10,
    "exp": math.exp,
    "ceil": math.ceil,
    "floor": math.floor,
    "factorial": math.factorial,
    "mean": statistics.mean,
    "median": statistics.median,
    "stdev": statistics.stdev,
    "pi": math.pi,
    "e": math.e,
}


def _eval_ast_node(node: ast.AST) -> Any:
    if isinstance(node, ast.Expression):
        return _eval_ast_node(node.body)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)):
        return node.value
    if isinstance(node, ast.Name):
        if node.id in SAFE_FUNCTIONS and isinstance(SAFE_FUNCTIONS[node.id], (int, float)):
            return SAFE_FUNCTIONS[node.id]
        raise ValueError(f"Unknown constant: {node.id}")
    if isinstance(node, (ast.List, ast.Tuple)):
        return [_eval_ast_node(el) for el in node.elts]
    if isinstance(node, ast.UnaryOp) and type(node.op) in SAFE_OPERATORS:
        return SAFE_OPERATORS[type(node.op)](_eval_ast_node(node.operand))
    if isinstance(node, ast.BinOp) and type(node.op) in SAFE_OPERATORS:
        left = _eval_ast_node(node.left)
        right = _eval_ast_node(node.right)
        if isinstance(node.op, ast.Pow) and right > 1000:
            raise ValueError("Exponent too large")
        return SAFE_OPERATORS[type(node.op)](left, right)
    if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
        fn_name = node.func.id
        fn = SAFE_FUNCTIONS.get(fn_name)
        if not callable(fn):
            raise ValueError(f"Disallowed function: {fn_name}")
        args = [_eval_ast_node(a) for a in node.args]
        return fn(*args)
    raise ValueError(f"Unsupported expression syntax: {type(node).__name__}")


def tool_python_calculator(expression: str) -> Dict[str, Any]:
    """Evaluate a mathematical or statistical expression safely."""
    cleaned = expression.strip().replace("^", "**")
    tree = ast.parse(cleaned, mode="eval")
    value = _eval_ast_node(tree)
    return {"expression": expression, "result": value}


def tool_search_knowledge_base(query: str, top_k: int = 4) -> Dict[str, Any]:
    """Search the RAG knowledge base for documents and chunks matching a query."""
    hits = knowledge_base.search(query=query, top_k=top_k)
    return {
        "query": query,
        "count": len(hits),
        "results": hits,
    }


def tool_save_memory(
    content: str,
    category: str = "general",
    importance: int = 4,
    user_id: str = "default_user",
) -> Dict[str, Any]:
    """Persist an important fact, preference, or instruction to long-term memory."""
    saved = memory_store.add_memory(
        content=content,
        user_id=user_id,
        category=category,
        importance=importance,
        metadata={"source": "agent_tool"},
    )
    return {"status": "saved", "memory": saved}


def tool_recall_memory(
    query: str,
    user_id: str = "default_user",
    top_k: int = 5,
) -> Dict[str, Any]:
    """Search long-term episodic memories for a user."""
    memories = memory_store.search_memories(query=query, user_id=user_id, top_k=top_k)
    return {"query": query, "count": len(memories), "memories": memories}


def tool_web_fetch(url: str, max_chars: int = 4000) -> Dict[str, Any]:
    """Fetch an HTTP/HTTPS URL and extract readable text or JSON."""
    if not url.startswith(("http://", "https://")):
        raise ValueError("URL must start with http:// or https://")

    req = urllib.request.Request(
        url,
        headers={"User-Agent": "BrainProductionAgent/1.0 (+https://localhost)"},
    )
    with urllib.request.urlopen(req, timeout=8.0) as resp:
        raw_bytes = resp.read(200_000)
        content_type = resp.headers.get("Content-Type", "")
        text = raw_bytes.decode("utf-8", errors="replace")

    if "html" in content_type.lower() or "<html" in text[:500].lower():
        # Strip scripts, styles, and HTML tags
        text = re.sub(r"<(script|style)[^>]*>.*?</\1>", " ", text, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", text)
        text = re.sub(r"\s+", " ", text).strip()

    return {
        "url": url,
        "content_type": content_type,
        "excerpt": text[:max_chars],
    }


def tool_sql_analytics_query(sql_query: str) -> Dict[str, Any]:
    """Run a read-only SELECT query on the Brain SQLite database for analytics or inspection."""
    normalized = sql_query.strip().lstrip("(")
    if not normalized.upper().startswith("SELECT"):
        raise ValueError("Only read-only SELECT queries are permitted.")
    forbidden = re.search(
        r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|ATTACH|DETACH|PRAGMA|REPLACE|CREATE)\b",
        normalized,
        flags=re.IGNORECASE,
    )
    if forbidden:
        raise ValueError(f"Disallowed SQL keyword: {forbidden.group(1)}")

    with db.connection() as conn:
        rows = conn.execute(sql_query). fetchmany(50)
        data = [dict(r) for r in rows]

    return {"row_count": len(data), "rows": data}


def tool_system_clock() -> Dict[str, Any]:
    """Return current UTC and local system time and database statistics."""
    now_utc = datetime.now(timezone.utc)
    now_local = datetime.now().astimezone()
    with db.connection() as conn:
        sessions_count = conn.execute("SELECT COUNT(*) FROM sessions").fetchone()[0]
        memories_count = conn.execute("SELECT COUNT(*) FROM memories").fetchone()[0]
        docs_count = conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0]

    return {
        "utc_iso": now_utc.isoformat(),
        "local_iso": now_local.isoformat(),
        "weekday": now_local.strftime("%A"),
        "stats": {
            "sessions": sessions_count,
            "memories": memories_count,
            "documents": docs_count,
        },
    }


def tool_generate_webapp_blueprint(
    app_name: str,
    features: str = "authentication, dashboard, real-time CRUD",
    stack: str = "Next.js + FastAPI + Supabase",
) -> Dict[str, Any]:
    """Generate a full-stack Web App blueprint (Architecture, Supabase SQL schema + RLS, and API routes)."""
    slug = re.sub(r"[^a-z0-9_]", "_", app_name.lower().strip()).strip("_") or "webapp"
    return {
        "app_name": app_name,
        "stack": stack,
        "features": features,
        "architecture": {
            "frontend": f"src/app/({slug})/page.tsx, src/components/{slug}/Dashboard.tsx",
            "backend": f"app/routers/{slug}.py, app/services/{slug}_service.py",
            "database": f"supabase/migrations/create_{slug}_tables.sql (Supabase Project: yqvbwrhhqivnmmiuxbgz)",
        },
        "supabase_sql_snippet": (
            f"-- Supabase Postgres Best Practices: IDENTITY PK + Composite Covering Index + Cached RLS\n"
            f"create table if not exists public.{slug}_items (\n"
            f"  id bigint generated always as identity primary key,\n"
            f"  user_id uuid not null references auth.users(id) on delete cascade,\n"
            f"  title text not null,\n"
            f"  status text not null default 'active',\n"
            f"  payload jsonb not null default '{{}}'::jsonb,\n"
            f"  created_at timestamptz not null default now()\n"
            f");\n\n"
            f"-- Index FK & equality columns first, range last, with INCLUDE for Index-Only Scans\n"
            f"create index if not exists idx_{slug}_user_status_created\n"
            f"  on public.{slug}_items (user_id, status, created_at desc)\n"
            f"  include (title);\n\n"
            f"-- GIN jsonb_path_ops index (2-3x smaller than default jsonb_ops)\n"
            f"create index if not exists idx_{slug}_payload_gin\n"
            f"  on public.{slug}_items using gin (payload jsonb_path_ops);\n\n"
            f"alter table public.{slug}_items enable row level security;\n\n"
            f"-- Wrap auth.uid() in (SELECT auth.uid()) so Postgres caches it once per query (100x faster)\n"
            f"create policy \"Users manage own {slug}_items\" on public.{slug}_items\n"
            f"  for all to authenticated\n"
            f"  using ((select auth.uid()) = user_id)\n"
            f"  with check ((select auth.uid()) = user_id);"
        ),
    }


def tool_generate_game_blueprint(
    game_title: str,
    genre: str = "2D Action / Arcade",
    engine: str = "HTML5 Canvas / Phaser / Godot",
) -> Dict[str, Any]:
    """Generate a Game Design Blueprint (Core Loop, ECS Entities, Physics Math, and Runnable Game Loop)."""
    return {
        "game_title": game_title,
        "genre": genre,
        "engine": engine,
        "core_loop": [
            "1. Input & Intent (WASD / Arrow / Gamepad polling)",
            "2. Fixed-step Physics & Collision Resolution (dt = 1/60s, AABB & Circle checks)",
            "3. Entity State & AI Behaviour Tree Tick",
            "4. Render Pass (Tilemap -> Sprites -> Particles -> HUD Overlay)",
        ],
        "starter_game_loop_js": (
            "class GameEngine {\n"
            "  constructor(canvas) {\n"
            "    this.ctx = canvas.getContext('2d');\n"
            "    this.player = { x: 120, y: 120, vx: 0, vy: 0, speed: 240, hp: 100 };\n"
            "    this.lastTime = performance.now();\n"
            "  }\n"
            "  update(dt, keys) {\n"
            "    const dx = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);\n"
            "    const dy = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);\n"
            "    this.player.x += dx * this.player.speed * dt;\n"
            "    this.player.y += dy * this.player.speed * dt;\n"
            "  }\n"
            "  render() {\n"
            "    this.ctx.clearRect(0, 0, 800, 600);\n"
            "    this.ctx.fillStyle = '#6366f1';\n"
            "    this.ctx.fillRect(this.player.x - 16, this.player.y - 16, 32, 32);\n"
            "  }\n"
            "}"
        ),
    }


def build_default_registry() -> ToolRegistry:
    registry = ToolRegistry()

    registry.register(
        name="search_knowledge_base",
        description="Search the RAG knowledge base for documentation, runbooks, notes, and facts.",
        parameters={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Semantic or keyword search query"},
                "top_k": {"type": "integer", "description": "Max chunks to return (default 4)", "default": 4},
            },
            "required": ["query"],
        },
        handler=tool_search_knowledge_base,
    )

    registry.register(
        name="save_memory",
        description="Save an important fact, user preference, or instruction to persistent long-term memory.",
        parameters={
            "type": "object",
            "properties": {
                "content": {"type": "string", "description": "The fact or preference to remember"},
                "category": {
                    "type": "string",
                    "description": "Category: 'preference', 'fact', 'project', 'instruction', 'general'",
                    "default": "general",
                },
                "importance": {"type": "integer", "description": "Importance from 1 to 5", "default": 4},
                "user_id": {"type": "string", "description": "User ID", "default": "default_user"},
            },
            "required": ["content"],
        },
        handler=tool_save_memory,
    )

    registry.register(
        name="recall_memory",
        description="Search persistent long-term memory for facts and preferences about the user or project.",
        parameters={
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Query to search in long-term memories"},
                "user_id": {"type": "string", "description": "User ID", "default": "default_user"},
                "top_k": {"type": "integer", "description": "Max memories to return", "default": 5},
            },
            "required": ["query"],
        },
        handler=tool_recall_memory,
    )

    registry.register(
        name="python_calculator",
        description="Evaluate math, financial, or statistical expressions (e.g. 'sqrt(144) + mean([10, 20, 35])').",
        parameters={
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": "Mathematical expression using numbers, +, -, *, /, **, sqrt, mean, median, stdev, sin, cos, log",
                }
            },
            "required": ["expression"],
        },
        handler=tool_python_calculator,
    )

    registry.register(
        name="web_fetch",
        description="Fetch a public URL (HTTP/HTTPS) and extract its readable text or JSON response.",
        parameters={
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "Full http:// or https:// URL to fetch"},
                "max_chars": {"type": "integer", "description": "Maximum characters to return", "default": 4000},
            },
            "required": ["url"],
        },
        handler=tool_web_fetch,
    )

    registry.register(
        name="sql_analytics_query",
        description="Execute a read-only SELECT SQL query against the Brain database tables (sessions, messages, memories, documents, telemetry_logs).",
        parameters={
            "type": "object",
            "properties": {
                "sql_query": {"type": "string", "description": "Read-only SELECT SQL query"}
            },
            "required": ["sql_query"],
        },
        handler=tool_sql_analytics_query,
    )

    registry.register(
        name="system_clock",
        description="Get the current UTC/local date, time, weekday, and Brain database counts.",
        parameters={
            "type": "object",
            "properties": {},
        },
        handler=tool_system_clock,
    )

    registry.register(
        name="generate_webapp_blueprint",
        description="Generate a full-stack Web App architecture, Supabase SQL migration + RLS policy, and component structure.",
        parameters={
            "type": "object",
            "properties": {
                "app_name": {"type": "string", "description": "Name or topic of the web application"},
                "features": {"type": "string", "description": "Key features to include", "default": "authentication, dashboard, CRUD"},
                "stack": {"type": "string", "description": "Tech stack", "default": "Next.js + FastAPI + Supabase"},
            },
            "required": ["app_name"],
        },
        handler=tool_generate_webapp_blueprint,
    )

    registry.register(
        name="generate_game_blueprint",
        description="Generate a Game Design Document (GDD), ECS entity breakdown, and playable HTML5 Canvas / JS game loop.",
        parameters={
            "type": "object",
            "properties": {
                "game_title": {"type": "string", "description": "Title or concept of the game"},
                "genre": {"type": "string", "description": "Game genre (e.g. 2D Platformer, Roguelike, RPG, Shooter)", "default": "2D Action / Arcade"},
                "engine": {"type": "string", "description": "Target game engine", "default": "HTML5 Canvas / Phaser / Godot"},
            },
            "required": ["game_title"],
        },
        handler=tool_generate_game_blueprint,
    )

    return registry


tool_registry = build_default_registry()

