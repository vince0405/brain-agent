"""Knowledge Base & RAG document chunking, indexing, and semantic retrieval."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.config import settings
from app.database import DatabaseManager, db
from app.rag.embeddings import embed_text, hybrid_relevance_score


def chunk_text(
    text: str,
    chunk_size: int = 600,
    chunk_overlap: int = 100,
) -> List[str]:
    """Split text into semantically coherent overlapping chunks preserving paragraphs where possible."""
    cleaned = text.replace("\r\n", "\n").strip()
    if not cleaned:
        return []
    if len(cleaned) <= chunk_size:
        return [cleaned]

    paragraphs = [p.strip() for p in cleaned.split("\n\n") if p.strip()]
    chunks: List[str] = []
    current = ""

    for para in paragraphs:
        if len(current) + len(para) + 2 <= chunk_size:
            current = f"{current}\n\n{para}".strip() if current else para
        else:
            if current:
                chunks.append(current)
            if len(para) <= chunk_size:
                overlap_tail = current[-chunk_overlap:] if current and chunk_overlap > 0 else ""
                current = f"{overlap_tail}\n{para}".strip() if overlap_tail else para
            else:
                # Long single paragraph: slice by character window
                step = max(100, chunk_size - chunk_overlap)
                for i in range(0, len(para), step):
                    piece = para[i : i + chunk_size].strip()
                    if piece:
                        chunks.append(piece)
                current = ""

    if current:
        chunks.append(current)

    return chunks


class KnowledgeBase:
    """Manages RAG document ingestion, chunk storage, and semantic retrieval."""

    def __init__(self, database: DatabaseManager = db) -> None:
        self.db = database
        self._ensure_seed_documents()

    def _ensure_seed_documents(self) -> None:
        """Seed built-in production architecture & API reference docs on first boot."""
        with self.db.connection() as conn:
            count = conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
            if count > 0:
                return

        self.ingest_document(
            title="Brain Agent Production Architecture & Integration Guide",
            source="system://docs/architecture",
            tags=["architecture", "api", "production", "sdk"],
            content=(
                "# Brain Production Agent Architecture\n\n"
                "Brain is a full-stack, production-grade AI agent service built on FastAPI, SQLite WAL storage, "
                "multi-provider LLM orchestration (OpenAI, Google Gemini, Anthropic Claude, Ollama, and Local Hybrid fallback), "
                "persistent Long-Term Episodic Memory, and a Hybrid Semantic RAG Knowledge Base.\n\n"
                "## Production Integration Endpoints\n"
                "- `POST /api/v1/chat`: Synchronous structured agent invocation with tool calling, memory recall, and RAG.\n"
                "- `POST /api/v1/chat/stream`: Server-Sent Events (SSE) streaming endpoint emitting live thought/tool steps and tokens.\n"
                "- `WS /ws/chat/{session_id}`: Real-time bidirectional WebSocket for low-latency chat & agent telemetry.\n"
                "- `POST /api/v1/knowledge`: Ingest documents, markdown runbooks, or product documentation into the RAG store.\n"
                "- `POST /api/v1/memories`: Explicitly store or query per-user long-term memories.\n\n"
                "## Security & Reliability\n"
                "Set `BRAIN_API_KEYS` in `.env` to enforce `X-API-Key` or `Authorization: Bearer <key>` authentication "
                "across all `/api/v1/*` routes. Rate limiting is enforced per client IP/key via `RATE_LIMIT_PER_MINUTE`."
            ),
        )

    def ingest_document(
        self,
        title: str,
        content: str,
        source: str = "manual",
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        doc_id = f"doc_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        tags_list = tags or []
        meta_dict = metadata or {}

        chunks = chunk_text(
            content,
            chunk_size=settings.rag_chunk_size,
            chunk_overlap=settings.rag_chunk_overlap,
        )

        with self.db.connection() as conn:
            conn.execute(
                """
                INSERT INTO documents (id, title, source, tags_json, content, metadata_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    doc_id,
                    title.strip(),
                    source.strip(),
                    json.dumps(tags_list),
                    content,
                    json.dumps(meta_dict),
                    now,
                ),
            )

            for idx, chunk_str in enumerate(chunks):
                chunk_id = f"chk_{uuid.uuid4().hex[:12]}"
                contextual_text = f"{title}\n{chunk_str}"
                embedding = embed_text(contextual_text)
                conn.execute(
                    """
                    INSERT INTO document_chunks (id, document_id, chunk_index, content, embedding_json, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        chunk_id,
                        doc_id,
                        idx,
                        chunk_str,
                        json.dumps(embedding),
                        now,
                    ),
                )

        return {
            "id": doc_id,
            "title": title,
            "source": source,
            "tags": tags_list,
            "chunk_count": len(chunks),
            "char_count": len(content),
            "created_at": now,
        }

    def list_documents(self) -> List[Dict[str, Any]]:
        with self.db.connection() as conn:
            rows = conn.execute(
                """
                SELECT d.id, d.title, d.source, d.tags_json, LENGTH(d.content) as char_count,
                       d.created_at, COUNT(c.id) as chunk_count
                FROM documents d
                LEFT JOIN document_chunks c ON d.id = c.document_id
                GROUP BY d.id
                ORDER BY d.created_at DESC
                """
            ).fetchall()

        return [
            {
                "id": r["id"],
                "title": r["title"],
                "source": r["source"],
                "tags": json.loads(r["tags_json"] or "[]"),
                "chunk_count": r["chunk_count"],
                "char_count": r["char_count"] or 0,
                "created_at": r["created_at"],
            }
            for r in rows
        ]

    def delete_document(self, doc_id: str) -> bool:
        with self.db.connection() as conn:
            cur = conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
            return cur.rowcount > 0

    def search(
        self,
        query: str,
        top_k: int = 4,
        min_score: float = 0.08,
    ) -> List[Dict[str, Any]]:
        query_vec = embed_text(query)
        with self.db.connection() as conn:
            rows = conn.execute(
                """
                SELECT c.id, c.document_id, c.chunk_index, c.content, c.embedding_json,
                       d.title, d.source, d.tags_json
                FROM document_chunks c
                JOIN documents d ON d.id = c.document_id
                """
            ).fetchall()

        scored: List[Dict[str, Any]] = []
        for r in rows:
            emb = json.loads(r["embedding_json"] or "[]")
            full_text = f"{r['title']} {r['content']}"
            score = hybrid_relevance_score(query, query_vec, full_text, emb)
            if score >= min_score:
                scored.append(
                    {
                        "chunk_id": r["id"],
                        "document_id": r["document_id"],
                        "title": r["title"],
                        "source": r["source"],
                        "tags": json.loads(r["tags_json"] or "[]"),
                        "chunk_index": r["chunk_index"],
                        "content": r["content"],
                        "score": score,
                    }
                )

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]


knowledge_base = KnowledgeBase()

