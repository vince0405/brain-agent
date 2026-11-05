"""Pydantic schemas for REST and WebSocket APIs."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ToolCallStep(BaseModel):
    step: int
    tool_name: str
    arguments: Dict[str, Any]
    output: str
    duration_ms: float
    success: bool = True


class RetrievedContextItem(BaseModel):
    source_type: str = Field(..., description="'memory' or 'knowledge'")
    id: str
    title: str
    content: str
    score: float


class ActiveSpecialistBadge(BaseModel):
    id: str
    name: str
    role: str
    domain: str
    icon: str
    chibi: Dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User input message to the agent")
    session_id: Optional[str] = Field(
        default=None, description="Conversation session ID (auto-created if omitted)"
    )
    user_id: str = Field(default="default_user", description="Unique user or tenant identifier")
    specialist_id: Optional[str] = Field(
        default="auto_router",
        description="Target specialist agent ID ('auto_router', 'webapp_architect', 'frontend_ui_agent', 'backend_supabase_agent', 'game_designer', 'game_engine_coder', 'game_world_narrative', 'qa_security_agent')",
    )
    project_mode: Optional[str] = Field(
        default=None,
        description="Optional team preset ('webapp_team' or 'game_team')",
    )
    system_prompt_override: Optional[str] = Field(
        default=None, description="Optional custom system prompt for this request"
    )
    enable_tools: bool = Field(default=True, description="Allow agent to execute registered tools")
    enable_rag: bool = Field(default=True, description="Augment prompt with knowledge base search")
    enable_memory: bool = Field(
        default=True, description="Recall and extract persistent long-term memories"
    )
    provider_override: Optional[str] = Field(
        default=None, description="Override LLM provider ('openai', 'gemini', 'anthropic', 'ollama', 'local')"
    )
    model_override: Optional[str] = Field(
        default=None, description="Override specific model name"
    )
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ChatResponse(BaseModel):
    reply: str
    session_id: str
    user_id: str
    provider: str
    model: str
    active_specialists: List[ActiveSpecialistBadge] = Field(default_factory=list)
    monthly_trends_applied: List[Dict[str, Any]] = Field(default_factory=list)
    tool_calls: List[ToolCallStep] = Field(default_factory=list)
    retrieved_context: List[RetrievedContextItem] = Field(default_factory=list)
    memories_saved: List[str] = Field(default_factory=list)
    latency_ms: float
    usage: Dict[str, int] = Field(default_factory=dict)


class TrendCreateRequest(BaseModel):
    agent_id: str = Field(default="auto_router")
    domain: str = Field(default="webapp", description="'webapp' | 'game' | 'core' | 'orchestrator'")
    trend_title: str = Field(..., min_length=3)
    trend_summary: str = Field(..., min_length=5)
    trend_tags: List[str] = Field(default_factory=list)
    momentum_score: int = Field(default=90, ge=1, le=100)
    month_key: Optional[str] = None


class SpecialistCreateRequest(BaseModel):
    id: str = Field(..., min_length=2, description="Unique identifier e.g. 'shader_artist'")
    name: str = Field(..., min_length=2)
    role: str = Field(..., min_length=2)
    domain: str = Field(default="webapp", description="'webapp' | 'game' | 'core' | 'custom'")
    icon: str = Field(default="🤖")
    description: str = Field(..., min_length=5)
    system_prompt: str = Field(..., min_length=10)
    keywords: List[str] = Field(default_factory=list)
    preferred_tools: List[str] = Field(default_factory=list)


class MemoryCreateRequest(BaseModel):
    user_id: str = Field(default="default_user")
    content: str = Field(..., min_length=1, description="Fact, preference, or episodic memory to store")
    category: str = Field(
        default="general",
        description="Category tag: 'preference', 'fact', 'project', 'instruction', 'general'",
    )
    importance: int = Field(default=3, ge=1, le=5)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MemoryItem(BaseModel):
    id: str
    user_id: str
    content: str
    category: str
    importance: int
    metadata: Dict[str, Any]
    created_at: str
    updated_at: str
    score: Optional[float] = None


class DocumentIngestRequest(BaseModel):
    title: str = Field(..., min_length=1, description="Document title or filename")
    content: str = Field(..., min_length=1, description="Raw text/markdown/code content to index")
    source: str = Field(default="manual", description="Origin URI, filepath, or tag")
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentSummary(BaseModel):
    id: str
    title: str
    source: str
    tags: List[str]
    chunk_count: int
    char_count: int
    created_at: str


class KnowledgeSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=4, ge=1, le=20)


class RuntimeConfigUpdateRequest(BaseModel):
    llm_provider: Optional[str] = None
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None
    openai_model: Optional[str] = None
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    anthropic_model: Optional[str] = None
    ollama_base_url: Optional[str] = None
    ollama_model: Optional[str] = None
    system_prompt: Optional[str] = None

