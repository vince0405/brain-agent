"""Configuration management for the Brain Production Agent."""

from __future__ import annotations

import os
from pathlib import Path
from typing import List

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    # Fallback minimal .env parser if python-dotenv is not installed
    env_path = Path(".env")
    if env_path.exists():
        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            os.environ.setdefault(k, v)


class Settings:
    """Centralized production settings loaded from environment variables."""

    def __init__(self) -> None:
        self.app_name: str = os.getenv("APP_NAME", "Brain Production Agent")
        self.app_env: str = os.getenv("APP_ENV", "development")
        self.host: str = os.getenv("HOST", "0.0.0.0")
        self.port: int = int(os.getenv("PORT", "8000"))
        self.log_level: str = os.getenv("LOG_LEVEL", "INFO").upper()

        raw_keys = os.getenv("BRAIN_API_KEYS", "").strip()
        self.api_keys: List[str] = [k.strip() for k in raw_keys.split(",") if k.strip()]
        self.rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

        raw_cors = os.getenv("CORS_ORIGINS", "*").strip()
        self.cors_origins: List[str] = (
            ["*"] if raw_cors == "*" else [o.strip() for o in raw_cors.split(",") if o.strip()]
        )

        # LLM Provider settings
        self.llm_provider: str = os.getenv("LLM_PROVIDER", "auto").lower()

        self.openai_api_key: str = os.getenv("OPENAI_API_KEY", "").strip()
        self.openai_base_url: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").strip()
        self.openai_model: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
        self.openai_embedding_model: str = os.getenv(
            "OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"
        ).strip()

        self.gemini_api_key: str = os.getenv("GEMINI_API_KEY", "").strip()
        self.gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()
        self.gemini_embedding_model: str = os.getenv(
            "GEMINI_EMBEDDING_MODEL", "text-embedding-004"
        ).strip()

        self.anthropic_api_key: str = os.getenv("ANTHROPIC_API_KEY", "").strip()
        self.anthropic_model: str = os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-latest").strip()

        self.ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1").strip()
        self.ollama_model: str = os.getenv("OLLAMA_MODEL", "llama3.2").strip()

        # Agent & RAG behavior
        self.max_tool_iterations: int = int(os.getenv("MAX_TOOL_ITERATIONS", "6"))
        self.session_history_limit: int = int(os.getenv("SESSION_HISTORY_LIMIT", "20"))
        self.auto_extract_memories: bool = (
            os.getenv("AUTO_EXTRACT_MEMORIES", "true").lower() in ("1", "true", "yes")
        )
        self.rag_top_k: int = int(os.getenv("RAG_TOP_K", "4"))
        self.rag_chunk_size: int = int(os.getenv("RAG_CHUNK_SIZE", "600"))
        self.rag_chunk_overlap: int = int(os.getenv("RAG_CHUNK_OVERLAP", "100"))

        # Storage
        self.data_dir: Path = Path(os.getenv("DATA_DIR", "./data"))
        self.database_path: Path = Path(os.getenv("DATABASE_PATH", "./data/brain.db"))
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)

        self.system_prompt: str = os.getenv(
            "SYSTEM_PROMPT",
            (
                "You are Brain, a reliable, deeply capable production AI agent. "
                "You have access to persistent long-term memory, a semantic RAG knowledge base, "
                "and real-time execution tools. "
                "Always ground your answers in retrieved knowledge and verified tool outputs when relevant, "
                "cite sources clearly, remember important user details using memory tools, "
                "and provide concise, actionable responses."
            ),
        )

    def resolve_active_provider(self) -> str:
        """Determine which LLM provider is active based on configuration and credentials."""
        if self.llm_provider in ("openai", "gemini", "anthropic", "ollama", "local"):
            if self.llm_provider == "openai" and not self.openai_api_key:
                return "local"
            if self.llm_provider == "gemini" and not self.gemini_api_key:
                return "local"
            if self.llm_provider == "anthropic" and not self.anthropic_api_key:
                return "local"
            return self.llm_provider

        # "auto" detection order
        if self.openai_api_key:
            return "openai"
        if self.gemini_api_key:
            return "gemini"
        if self.anthropic_api_key:
            return "anthropic"
        return "local"

    def resolve_active_model(self) -> str:
        provider = self.resolve_active_provider()
        if provider == "openai":
            return self.openai_model
        if provider == "gemini":
            return self.gemini_model
        if provider == "anthropic":
            return self.anthropic_model
        if provider == "ollama":
            return self.ollama_model
        return "brain-local-hybrid-v1"


settings = Settings()

