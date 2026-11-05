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

    return registry


tool_registry = build_default_registry()

