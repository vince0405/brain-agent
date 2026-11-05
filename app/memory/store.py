"""Conversation session store and persistent long-term semantic memory."""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.config import settings
from app.database import DatabaseManager, db
from app.rag.embeddings import embed_text, hybrid_relevance_score


class SessionStore:
    """Manages short-term conversation sessions and message history."""

    def __init__(self, database: DatabaseManager = db) -> None:
        self.db = database

    def ensure_session(
        self,
        session_id: Optional[str] = None,
        user_id: str = "default_user",
        title: str = "New Conversation",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        sid = session_id or f"sess_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        with self.db.connection() as conn:
            existing = conn.execute("SELECT id FROM sessions WHERE id = ?", (sid,)).fetchone()
            if not existing:
                conn.execute(
                    """
                    INSERT INTO sessions (id, user_id, title, metadata_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (sid, user_id, title[:80], json.dumps(metadata or {}), now, now),
                )
        return sid

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        tool_calls: Optional[List[Dict[str, Any]]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self.db.connection() as conn:
            conn.execute(
                """
                INSERT INTO messages (session_id, role, content, tool_calls_json, metadata_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    role,
                    content,
                    json.dumps(tool_calls or []),
                    json.dumps(metadata or {}),
                    now,
                ),
            )
            # Auto-update session title on first user message
            if role == "user":
                sess = conn.execute(
                    "SELECT title FROM sessions WHERE id = ?", (session_id,)
                ).fetchone()
                if sess and sess["title"] == "New Conversation":
                    clean_title = re.sub(r"\s+", " ", content).strip()[:60]
                    conn.execute(
                        "UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?",
                        (clean_title or "Conversation", now, session_id),
                    )
                else:
                    conn.execute(
                        "UPDATE sessions SET updated_at = ? WHERE id = ?",
                        (now, session_id),
                    )
            else:
                conn.execute(
                    "UPDATE sessions SET updated_at = ? WHERE id = ?",
                    (now, session_id),
                )

    def get_history(
        self,
        session_id: str,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        max_msgs = limit or settings.session_history_limit
        with self.db.connection() as conn:
            rows = conn.execute(
                """
                SELECT id, role, content, tool_calls_json, metadata_json, created_at
                FROM (
                    SELECT id, role, content, tool_calls_json, metadata_json, created_at
                    FROM messages
                    WHERE session_id = ?
                    ORDER BY id DESC
                    LIMIT ?
                )
                ORDER BY id ASC
                """,
                (session_id, max_msgs),
            ).fetchall()

        return [
            {
                "id": r["id"],
                "role": r["role"],
                "content": r["content"],
                "tool_calls": json.loads(r["tool_calls_json"] or "[]"),
                "metadata": json.loads(r["metadata_json"] or "{}"),
                "created_at": r["created_at"],
            }
            for r in rows
        ]

    def list_sessions(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self.db.connection() as conn:
            if user_id:
                rows = conn.execute(
                    """
                    SELECT s.id, s.user_id, s.title, s.created_at, s.updated_at,
                           COUNT(m.id) as message_count
                    FROM sessions s
                    LEFT JOIN messages m ON s.id = m.session_id
                    WHERE s.user_id = ?
                    GROUP BY s.id
                    ORDER BY s.updated_at DESC
                    """,
                    (user_id,),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT s.id, s.user_id, s.title, s.created_at, s.updated_at,
                           COUNT(m.id) as message_count
                    FROM sessions s
                    LEFT JOIN messages m ON s.id = m.session_id
                    GROUP BY s.id
                    ORDER BY s.updated_at DESC
                    """
                ).fetchall()

        return [dict(r) for r in rows]

    def delete_session(self, session_id: str) -> bool:
        with self.db.connection() as conn:
            cur = conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            return cur.rowcount > 0


class EpisodicMemoryStore:
    """Manages persistent long-term user/agent facts, preferences, and instructions."""

    EXTRACTION_PATTERNS = [
        (r"\b(?:remember that|please remember|keep in mind that|note that)\s+(.{5,200})", "instruction", 5),
        (r"\b(?:my name is|i am called|call me)\s+([A-Za-z0-9 _\-]{2,40})", "fact", 5),
        (r"\b(?:i work as|my role is|my job is|i'm a|i am a)\s+([A-Za-z0-9 ,_\-]{3,80})", "fact", 4),
        (r"\b(?:i prefer|my favorite|i always use|we use)\s+(.{4,140})", "preference", 4),
        (r"\b(?:our project is|we are building|my company is)\s+(.{4,140})", "project", 4),
    ]

    def __init__(self, database: DatabaseManager = db) -> None:
        self.db = database

    def add_memory(
        self,
        content: str,
        user_id: str = "default_user",
        category: str = "general",
        importance: int = 3,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        clean = content.strip()
        now = datetime.now(timezone.utc).isoformat()

        # Check for exact or near-exact duplicate for the same user
        with self.db.connection() as conn:
            existing = conn.execute(
                "SELECT id, content, category, importance, metadata_json, created_at FROM memories WHERE user_id = ? AND LOWER(content) = LOWER(?)",
                (user_id, clean),
            ).fetchone()
            if existing:
                conn.execute(
                    "UPDATE memories SET updated_at = ?, importance = MAX(importance, ?) WHERE id = ?",
                    (now, importance, existing["id"]),
                )
                return {
                    "id": existing["id"],
                    "user_id": user_id,
                    "content": existing["content"],
                    "category": existing["category"],
                    "importance": max(existing["importance"], importance),
                    "metadata": json.loads(existing["metadata_json"] or "{}"),
                    "created_at": existing["created_at"],
                    "updated_at": now,
                }

            mem_id = f"mem_{uuid.uuid4().hex[:12]}"
            embedding = embed_text(clean)
            conn.execute(
                """
                INSERT INTO memories (id, user_id, content, category, importance, embedding_json, metadata_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    mem_id,
                    user_id,
                    clean,
                    category,
                    max(1, min(5, int(importance))),
                    json.dumps(embedding),
                    json.dumps(metadata or {}),
                    now,
                    now,
                ),
            )

        return {
            "id": mem_id,
            "user_id": user_id,
            "content": clean,
            "category": category,
            "importance": importance,
            "metadata": metadata or {},
            "created_at": now,
            "updated_at": now,
        }

    def list_memories(
        self,
        user_id: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        query = "SELECT id, user_id, content, category, importance, metadata_json, created_at, updated_at FROM memories WHERE 1=1"
        params: List[Any] = []
        if user_id:
            query += " AND user_id = ?"
            params.append(user_id)
        if category:
            query += " AND category = ?"
            params.append(category)
        query += " ORDER BY importance DESC, updated_at DESC LIMIT ?"
        params.append(limit)

        with self.db.connection() as conn:
            rows = conn.execute(query, tuple(params)).fetchall()

        return [
            {
                "id": r["id"],
                "user_id": r["user_id"],
                "content": r["content"],
                "category": r["category"],
                "importance": r["importance"],
                "metadata": json.loads(r["metadata_json"] or "{}"),
                "created_at": r["created_at"],
                "updated_at": r["updated_at"],
            }
            for r in rows
        ]

    def search_memories(
        self,
        query: str,
        user_id: str = "default_user",
        top_k: int = 5,
    ) -> List[Dict[str, Any]]:
        query_vec = embed_text(query)
        with self.db.connection() as conn:
            rows = conn.execute(
                """
                SELECT id, user_id, content, category, importance, embedding_json, metadata_json, created_at, updated_at
                FROM memories
                WHERE user_id = ?
                ORDER BY importance DESC, updated_at DESC
                """,
                (user_id,),
            ).fetchall()

        results: List[Dict[str, Any]] = []
        for r in rows:
            emb = json.loads(r["embedding_json"] or "[]")
            rel = hybrid_relevance_score(query, query_vec, r["content"], emb)
            # High-importance core facts (importance >= 4) get a baseline boost so persona/user identity stays in context
            importance_boost = 0.15 if r["importance"] >= 4 else 0.05
            final_score = round(min(1.0, rel + importance_boost), 4)
            if final_score >= 0.12 or r["importance"] >= 4:
                results.append(
                    {
                        "id": r["id"],
                        "user_id": r["user_id"],
                        "content": r["content"],
                        "category": r["category"],
                        "importance": r["importance"],
                        "metadata": json.loads(r["metadata_json"] or "{}"),
                        "created_at": r["created_at"],
                        "updated_at": r["updated_at"],
                        "score": final_score,
                    }
                )

        results.sort(key=lambda x: (x["score"], x["importance"]), reverse=True)
        return results[:top_k]

    def delete_memory(self, memory_id: str) -> bool:
        with self.db.connection() as conn:
            cur = conn.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
            return cur.rowcount > 0

    def auto_extract_from_message(self, message: str, user_id: str = "default_user") -> List[str]:
        """Automatically detect and store durable user facts/preferences from natural conversation."""
        if not settings.auto_extract_memories:
            return []

        saved: List[str] = []
        for pattern, category, importance in self.EXTRACTION_PATTERNS:
            match = re.search(pattern, message, flags=re.IGNORECASE)
            if match:
                extracted = match.group(0).strip().rstrip(".!,;")
                if len(extracted) >= 6:
                    item = self.add_memory(
                        content=extracted,
                        user_id=user_id,
                        category=category,
                        importance=importance,
                        metadata={"source": "auto_extracted"},
                    )
                    saved.append(item["content"])
        return saved


session_store = SessionStore()
memory_store = EpisodicMemoryStore()

