"""Zero-dependency Python SDK for calling the Brain Production Agent from any service."""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from typing import Any, Dict, Iterator, List, Optional


class BrainClient:
    """
    Production client for interacting with the Brain Agent microservice.

    Example:
        ```python
        from sdk.brain_client import BrainClient

        brain = BrainClient(base_url="http://localhost:8000", api_key="my-secret-key")
        res = brain.chat("Remember that our release window is Tuesdays at 14:00 UTC", user_id="team_ops")
        print(res["reply"])
        ```
    """

    def __init__(
        self,
        base_url: str = "http://localhost:8000",
        api_key: Optional[str] = None,
        timeout: float = 45.0,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout = timeout

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-API-Key"] = self.api_key
        return headers

    def _request(
        self,
        method: str,
        path: str,
        payload: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        data = json.dumps(payload).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(
            url,
            data=data,
            headers=self._headers(),
            method=method.upper(),
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def health(self) -> Dict[str, Any]:
        return self._request("GET", "/health")

    def chat(
        self,
        message: str,
        user_id: str = "default_user",
        session_id: Optional[str] = None,
        specialist_id: str = "auto_router",
        project_mode: Optional[str] = None,
        enable_tools: bool = True,
        enable_rag: bool = True,
        enable_memory: bool = True,
        provider_override: Optional[str] = None,
        model_override: Optional[str] = None,
        system_prompt_override: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Run a full synchronous agent turn and return reply, routed specialists, tool calls, and retrieved context."""
        payload = {
            "message": message,
            "user_id": user_id,
            "session_id": session_id,
            "specialist_id": specialist_id,
            "project_mode": project_mode,
            "enable_tools": enable_tools,
            "enable_rag": enable_rag,
            "enable_memory": enable_memory,
            "provider_override": provider_override,
            "model_override": model_override,
            "system_prompt_override": system_prompt_override,
        }
        return self._request("POST", "/api/v1/chat", payload)

    def chat_stream(
        self,
        message: str,
        user_id: str = "default_user",
        session_id: Optional[str] = None,
    ) -> Iterator[Dict[str, Any]]:
        """Stream Server-Sent Events (SSE) from `/api/v1/chat/stream`."""
        url = f"{self.base_url}/api/v1/chat/stream"
        payload = {
            "message": message,
            "user_id": user_id,
            "session_id": session_id,
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=self._headers(),
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=self.timeout) as resp:
            for raw_line in resp:
                line = raw_line.decode("utf-8").strip()
                if line.startswith("data: "):
                    yield json.loads(line[6:])

    def remember(
        self,
        content: str,
        user_id: str = "default_user",
        category: str = "fact",
        importance: int = 4,
    ) -> Dict[str, Any]:
        """Store a long-term memory for a user or tenant."""
        return self._request(
            "POST",
            "/api/v1/memories",
            {
                "user_id": user_id,
                "content": content,
                "category": category,
                "importance": importance,
            },
        )

    def ingest_document(
        self,
        title: str,
        content: str,
        source: str = "sdk",
        tags: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Ingest a document into the Brain RAG knowledge base."""
        return self._request(
            "POST",
            "/api/v1/knowledge",
            {
                "title": title,
                "content": content,
                "source": source,
                "tags": tags or [],
            },
        )

    def search_knowledge(self, query: str, top_k: int = 4) -> Dict[str, Any]:
        """Search the RAG knowledge base."""
        return self._request(
            "POST",
            "/api/v1/knowledge/search",
            {"query": query, "top_k": top_k},
        )

