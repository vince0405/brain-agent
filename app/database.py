"""SQLite database management with WAL mode and schema migrations."""

from __future__ import annotations

import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.config import settings


class DatabaseManager:
    """Thread-safe SQLite database wrapper for sessions, memories, RAG chunks, and telemetry."""

    def __init__(self, db_path: Path | None = None) -> None:
        self.db_path = Path(db_path or settings.database_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.RLock()
        self._init_schema()

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        with self._lock:
            conn = sqlite3.connect(str(self.db_path), timeout=30.0, check_same_thread=False)
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA foreign_keys=ON;")
            conn.execute("PRAGMA synchronous=NORMAL;")
            try:
                yield conn
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

    def _init_schema(self) -> None:
        with self.connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL DEFAULT 'default_user',
                    title TEXT NOT NULL DEFAULT 'New Conversation',
                    metadata_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id, updated_at DESC);

                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    tool_calls_json TEXT NOT NULL DEFAULT '[]',
                    metadata_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id, id ASC);

                CREATE TABLE IF NOT EXISTS memories (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL DEFAULT 'default_user',
                    content TEXT NOT NULL,
                    category TEXT NOT NULL DEFAULT 'general',
                    importance INTEGER NOT NULL DEFAULT 3,
                    embedding_json TEXT NOT NULL DEFAULT '[]',
                    metadata_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id, importance DESC);
                CREATE INDEX IF NOT EXISTS idx_memories_user_cat_imp ON memories(user_id, category, importance DESC, updated_at DESC);
                CREATE INDEX IF NOT EXISTS idx_memories_core_partial ON memories(user_id, updated_at DESC) WHERE importance >= 4;

                CREATE TABLE IF NOT EXISTS monthly_trend_learnings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    month_key TEXT NOT NULL,
                    domain TEXT NOT NULL,
                    agent_id TEXT NOT NULL,
                    trend_title TEXT NOT NULL,
                    trend_summary TEXT NOT NULL,
                    trend_tags_json TEXT NOT NULL DEFAULT '[]',
                    momentum_score INTEGER NOT NULL DEFAULT 85,
                    created_at TEXT NOT NULL,
                    UNIQUE(month_key, agent_id, trend_title)
                );

                CREATE INDEX IF NOT EXISTS idx_trends_month_domain ON monthly_trend_learnings(month_key, domain, momentum_score DESC);
                CREATE INDEX IF NOT EXISTS idx_trends_agent_id ON monthly_trend_learnings(agent_id, month_key DESC);

                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    source TEXT NOT NULL DEFAULT 'manual',
                    tags_json TEXT NOT NULL DEFAULT '[]',
                    content TEXT NOT NULL,
                    metadata_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS document_chunks (
                    id TEXT PRIMARY KEY,
                    document_id TEXT NOT NULL,
                    chunk_index INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    embedding_json TEXT NOT NULL DEFAULT '[]',
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON document_chunks(document_id, chunk_index ASC);

                CREATE TABLE IF NOT EXISTS telemetry_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    user_id TEXT,
                    provider TEXT,
                    model TEXT,
                    tool_count INTEGER DEFAULT 0,
                    latency_ms REAL DEFAULT 0.0,
                    status TEXT DEFAULT 'ok',
                    created_at TEXT NOT NULL
                );
                """
            )


db = DatabaseManager()

