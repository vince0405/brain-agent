"""Production Agent Orchestrator with Memory, RAG, and Multi-Provider Tool Calling."""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Dict, List, Optional, Tuple

from app.agent.specialists import specialist_registry
from app.config import settings
from app.database import db
from app.memory.store import memory_store, session_store
from app.rag.knowledge_base import knowledge_base
from app.schemas import (
    ActiveSpecialistBadge,
    ChatRequest,
    ChatResponse,
    RetrievedContextItem,
    ToolCallStep,
)
from app.tools.registry import ToolRegistry, tool_registry


class BrainAgent:
    """
    Core production agent orchestrating:
    1. Long-term memory recall & automatic durable fact extraction
    2. Hybrid RAG knowledge base retrieval
    3. Multi-step tool execution loop (OpenAI, Gemini, Anthropic, Ollama, and Local Hybrid engine)
    4. Persistent session history & telemetry logging
    """

    def __init__(self, registry: ToolRegistry = tool_registry) -> None:
        self.registry = registry

    def _resolve_provider_and_model(
        self, req: ChatRequest
    ) -> Tuple[str, str]:
        provider = (req.provider_override or settings.resolve_active_provider()).lower()
        if provider == "openai" and not settings.openai_api_key:
            provider = "local"
        elif provider == "gemini" and not settings.gemini_api_key:
            provider = "local"
        elif provider == "anthropic" and not settings.anthropic_api_key:
            provider = "local"

        if req.model_override:
            return provider, req.model_override

        if provider == "openai":
            return provider, settings.openai_model
        if provider == "gemini":
            return provider, settings.gemini_model
        if provider == "anthropic":
            return provider, settings.anthropic_model
        if provider == "ollama":
            return provider, settings.ollama_model
        return "local", "brain-local-hybrid-v1"

    def _build_augmented_system_prompt(
        self,
        base_prompt: str,
        active_specialists: List[Dict[str, Any]],
        recalled_memories: List[Dict[str, Any]],
        rag_hits: List[Dict[str, Any]],
        user_id: str,
    ) -> str:
        sections = [base_prompt.strip()]
        sections.append(f"Current UTC Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
        sections.append(f"Active User ID: {user_id}")
        sections.append(f"Linked Supabase Project Ref: {settings.supabase_project_ref} ({settings.supabase_url})")

        if active_specialists:
            spec_blocks = []
            for sp in active_specialists:
                spec_blocks.append(
                    f"### {sp['icon']} {sp['name']} ({sp['role']} | domain={sp['domain']})\n"
                    f"Instructions: {sp['system_prompt']}"
                )
            if len(active_specialists) == 1:
                sections.append(
                    "## Active Specialist Agent Persona\n"
                    "Adopt the following specialist role for this task:\n\n"
                    + "\n\n".join(spec_blocks)
                )
            else:
                sections.append(
                    "## Multi-Agent Specialist Team Mode\n"
                    "Coordinate the following specialist agents in your response, clearly labeling each specialist's contribution:\n\n"
                    + "\n\n".join(spec_blocks)
                )

        if recalled_memories:
            mem_lines = [
                f"- [{m['category'].upper()} | importance={m['importance']}] {m['content']}"
                for m in recalled_memories
            ]
            sections.append(
                "## Persistent Long-Term Memories (User & Project Context)\n"
                + "\n".join(mem_lines)
            )

        if rag_hits:
            rag_blocks = [
                f"### Source [{idx + 1}]: {h['title']} ({h['source']}, score={h['score']})\n{h['content']}"
                for idx, h in enumerate(rag_hits)
            ]
            sections.append(
                "## Retrieved Knowledge Base Context (RAG)\n"
                "Use the following verified excerpts when answering domain or documentation questions:\n\n"
                + "\n\n".join(rag_blocks)
            )

        return "\n\n".join(sections)

    # ========================================================================
    # Provider Execution Implementations (OpenAI / Ollama, Gemini, Anthropic)
    # ========================================================================

    def _run_openai_compatible_loop(
        self,
        base_url: str,
        api_key: str,
        model: str,
        system_prompt: str,
        history: List[Dict[str, Any]],
        user_message: str,
        enable_tools: bool,
        temperature: float,
    ) -> Tuple[str, List[ToolCallStep], Dict[str, int]]:
        messages: List[Dict[str, Any]] = [{"role": "system", "content": system_prompt}]
        for msg in history:
            if msg["role"] in ("user", "assistant"):
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})

        tool_steps: List[ToolCallStep] = []
        usage_totals = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        url = f"{base_url.rstrip('/')}/chat/completions"

        for step_idx in range(1, settings.max_tool_iterations + 1):
            payload: Dict[str, Any] = {
                "model": model,
                "messages": messages,
                "temperature": temperature,
            }
            if enable_tools:
                payload["tools"] = self.registry.get_openai_tools()
                payload["tool_choice"] = "auto"

            headers = {"Content-Type": "application/json"}
            if api_key:
                headers["Authorization"] = f"Bearer {api_key}"

            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=45.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            usage = data.get("usage") or {}
            for k in usage_totals:
                usage_totals[k] += int(usage.get(k, 0))

            choice = data["choices"][0]["message"]
            tool_calls = choice.get("tool_calls") or []

            if not tool_calls or not enable_tools:
                return (choice.get("content") or "").strip(), tool_steps, usage_totals

            messages.append(choice)
            for tc in tool_calls:
                fn_name = tc["function"]["name"]
                raw_args = tc["function"].get("arguments") or "{}"
                try:
                    parsed_args = json.loads(raw_args) if isinstance(raw_args, str) else raw_args
                except json.JSONDecodeError:
                    parsed_args = {}

                exec_res = self.registry.execute(fn_name, parsed_args)
                tool_steps.append(
                    ToolCallStep(
                        step=len(tool_steps) + 1,
                        tool_name=fn_name,
                        arguments=parsed_args,
                        output=exec_res["output"],
                        duration_ms=exec_res["duration_ms"],
                        success=exec_res["success"],
                    )
                )
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc["id"],
                        "name": fn_name,
                        "content": exec_res["output"],
                    }
                )

        # Final synthesis call if max tool iterations reached
        payload = {"model": model, "messages": messages, "temperature": temperature}
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=45.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        return (data["choices"][0]["message"].get("content") or "").strip(), tool_steps, usage_totals

    def _run_gemini_loop(
        self,
        api_key: str,
        model: str,
        system_prompt: str,
        history: List[Dict[str, Any]],
        user_message: str,
        enable_tools: bool,
        temperature: float,
    ) -> Tuple[str, List[ToolCallStep], Dict[str, int]]:
        contents: List[Dict[str, Any]] = []
        for msg in history:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})
        contents.append({"role": "user", "parts": [{"text": user_message}]})

        tool_steps: List[ToolCallStep] = []
        usage_totals = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

        gemini_tools = []
        if enable_tools:
            gemini_tools = [
                {
                    "functionDeclarations": [
                        {
                            "name": t["name"],
                            "description": t["description"],
                            "parameters": t["parameters"],
                        }
                        for t in self.registry.list_tools()
                    ]
                }
            ]

        for _ in range(settings.max_tool_iterations):
            payload: Dict[str, Any] = {
                "systemInstruction": {"parts": [{"text": system_prompt}]},
                "contents": contents,
                "generationConfig": {"temperature": temperature},
            }
            if gemini_tools:
                payload["tools"] = gemini_tools

            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=45.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            meta = data.get("usageMetadata") or {}
            usage_totals["prompt_tokens"] += int(meta.get("promptTokenCount", 0))
            usage_totals["completion_tokens"] += int(meta.get("candidatesTokenCount", 0))
            usage_totals["total_tokens"] += int(meta.get("totalTokenCount", 0))

            candidate = data["candidates"][0]["content"]
            parts = candidate.get("parts") or []
            fn_calls = [p["functionCall"] for p in parts if "functionCall" in p]

            if not fn_calls or not enable_tools:
                text_parts = [p.get("text", "") for p in parts if "text" in p]
                return "\n".join(text_parts).strip(), tool_steps, usage_totals

            contents.append(candidate)
            response_parts = []
            for fc in fn_calls:
                fn_name = fc["name"]
                fn_args = fc.get("args") or {}
                exec_res = self.registry.execute(fn_name, fn_args)
                tool_steps.append(
                    ToolCallStep(
                        step=len(tool_steps) + 1,
                        tool_name=fn_name,
                        arguments=fn_args,
                        output=exec_res["output"],
                        duration_ms=exec_res["duration_ms"],
                        success=exec_res["success"],
                    )
                )
                try:
                    parsed_out = json.loads(exec_res["output"])
                except Exception:
                    parsed_out = {"result": exec_res["output"]}
                response_parts.append(
                    {
                        "functionResponse": {
                            "name": fn_name,
                            "response": parsed_out if isinstance(parsed_out, dict) else {"result": parsed_out},
                        }
                    }
                )
            contents.append({"role": "user", "parts": response_parts})

        return "Completed maximum tool iterations.", tool_steps, usage_totals

    def _run_anthropic_loop(
        self,
        api_key: str,
        model: str,
        system_prompt: str,
        history: List[Dict[str, Any]],
        user_message: str,
        enable_tools: bool,
        temperature: float,
    ) -> Tuple[str, List[ToolCallStep], Dict[str, int]]:
        messages: List[Dict[str, Any]] = []
        for msg in history:
            if msg["role"] in ("user", "assistant"):
                messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})

        tool_steps: List[ToolCallStep] = []
        usage_totals = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        url = "https://api.anthropic.com/v1/messages"

        for _ in range(settings.max_tool_iterations):
            payload: Dict[str, Any] = {
                "model": model,
                "max_tokens": 2048,
                "system": system_prompt,
                "messages": messages,
                "temperature": temperature,
            }
            if enable_tools:
                payload["tools"] = self.registry.get_anthropic_tools()

            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=45.0) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            usage = data.get("usage") or {}
            in_tok = int(usage.get("input_tokens", 0))
            out_tok = int(usage.get("output_tokens", 0))
            usage_totals["prompt_tokens"] += in_tok
            usage_totals["completion_tokens"] += out_tok
            usage_totals["total_tokens"] += in_tok + out_tok

            content_blocks = data.get("content") or []
            tool_uses = [b for b in content_blocks if b.get("type") == "tool_use"]

            if not tool_uses or not enable_tools:
                texts = [b.get("text", "") for b in content_blocks if b.get("type") == "text"]
                return "\n".join(texts).strip(), tool_steps, usage_totals

            messages.append({"role": "assistant", "content": content_blocks})
            tool_results_blocks = []
            for tu in tool_uses:
                fn_name = tu["name"]
                fn_args = tu.get("input") or {}
                exec_res = self.registry.execute(fn_name, fn_args)
                tool_steps.append(
                    ToolCallStep(
                        step=len(tool_steps) + 1,
                        tool_name=fn_name,
                        arguments=fn_args,
                        output=exec_res["output"],
                        duration_ms=exec_res["duration_ms"],
                        success=exec_res["success"],
                    )
                )
                tool_results_blocks.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": tu["id"],
                        "content": exec_res["output"],
                    }
                )
            messages.append({"role": "user", "content": tool_results_blocks})

        return "Completed maximum tool iterations.", tool_steps, usage_totals

    # ========================================================================
    # Built-In Local Hybrid Reasoning Engine (Zero-Config / Offline Ready)
    # ========================================================================

    def _run_local_hybrid_engine(
        self,
        user_message: str,
        user_id: str,
        active_specialists: List[Dict[str, Any]],
        recalled_memories: List[Dict[str, Any]],
        rag_hits: List[Dict[str, Any]],
        memories_saved: List[str],
        enable_tools: bool,
    ) -> Tuple[str, List[ToolCallStep], Dict[str, int]]:
        """
        Deterministic local tool-calling & synthesis engine so the Brain agent works
        immediately in development/testing or when no external LLM key is configured.
        """
        tool_steps: List[ToolCallStep] = []
        msg_lower = user_message.lower().strip()
        domains = {sp["domain"] for sp in active_specialists}

        # 1. Check for math / calculation intent
        if enable_tools:
            # Explicit function or arithmetic pattern
            calc_match = re.search(
                r"(?:calculate|compute|evaluate|what is|solve)\s+([0-9\.\+\-\*\/\^\(\)\s,a-z_\[\]]+)",
                msg_lower,
            )
            raw_math = re.fullmatch(r"[\d\s\+\-\*\/\^\.\(\)]+", msg_lower)
            expr_candidate = None
            if raw_math and any(op in msg_lower for op in ("+", "-", "*", "/", "^")):
                expr_candidate = msg_lower
            elif calc_match:
                candidate = calc_match.group(1).strip().rstrip("?.!")
                if any(op in candidate for op in ("+", "-", "*", "/", "^", "sqrt", "mean", "median", "stdev", "sin", "cos", "log", "factorial")):
                    expr_candidate = candidate

            if expr_candidate:
                res = self.registry.execute("python_calculator", {"expression": expr_candidate})
                tool_steps.append(
                    ToolCallStep(
                        step=len(tool_steps) + 1,
                        tool_name="python_calculator",
                        arguments={"expression": expr_candidate},
                        output=res["output"],
                        duration_ms=res["duration_ms"],
                        success=res["success"],
                    )
                )

            # 2. Check for clock / time / system status intent
            if any(
                kw in msg_lower
                for kw in ("what time", "current time", "date today", "system status", "database stats", "how many sessions")
            ):
                res = self.registry.execute("system_clock", {})
                tool_steps.append(
                    ToolCallStep(
                        step=len(tool_steps) + 1,
                        tool_name="system_clock",
                        arguments={},
                        output=res["output"],
                        duration_ms=res["duration_ms"],
                        success=res["success"],
                    )
                )

            # 3. Check for explicit SQL query request
            sql_match = re.search(r"(SELECT\s+.+?\s+FROM\s+[a-zA-Z0-9_]+.*)", user_message, flags=re.IGNORECASE)
            if sql_match:
                sql_q = sql_match.group(1).strip().rstrip(";")
                res = self.registry.execute("sql_analytics_query", {"sql_query": sql_q})
                tool_steps.append(
                    ToolCallStep(
                        step=len(tool_steps) + 1,
                        tool_name="sql_analytics_query",
                        arguments={"sql_query": sql_q},
                        output=res["output"],
                        duration_ms=res["duration_ms"],
                        success=res["success"],
                    )
                )

            # 4. Web App Specialist Blueprint Tool
            if "webapp" in domains:
                res = self.registry.execute(
                    "generate_webapp_blueprint",
                    {"app_name": user_message[:50], "features": user_message[:120]},
                )
                tool_steps.append(
                    ToolCallStep(
                        step=len(tool_steps) + 1,
                        tool_name="generate_webapp_blueprint",
                        arguments={"app_name": user_message[:50], "features": user_message[:120]},
                        output=res["output"],
                        duration_ms=res["duration_ms"],
                        success=res["success"],
                    )
                )

            # 5. Game Dev Specialist Blueprint Tool
            if "game" in domains:
                res = self.registry.execute(
                    "generate_game_blueprint",
                    {"game_title": user_message[:50], "genre": "2D / 3D Interactive Game"},
                )
                tool_steps.append(
                    ToolCallStep(
                        step=len(tool_steps) + 1,
                        tool_name="generate_game_blueprint",
                        arguments={"game_title": user_message[:50], "genre": "2D / 3D Interactive Game"},
                        output=res["output"],
                        duration_ms=res["duration_ms"],
                        success=res["success"],
                    )
                )

            # 6. If user asks about knowledge base / docs, record a tool call trace
            if rag_hits and any(
                kw in msg_lower
                for kw in ("search", "docs", "documentation", "architecture", "endpoint", "api", "knowledge", "how do i", "how does", "what is")
            ):
                res = self.registry.execute("search_knowledge_base", {"query": user_message, "top_k": 3})
                tool_steps.append(
                    ToolCallStep(
                        step=len(tool_steps) + 1,
                        tool_name="search_knowledge_base",
                        arguments={"query": user_message, "top_k": 3},
                        output=res["output"],
                        duration_ms=res["duration_ms"],
                        success=res["success"],
                    )
                )

        # Synthesize structured response
        parts: List[str] = []

        if active_specialists:
            header_badges = " + ".join(
                f"{sp['icon']} **{sp['name']}** (*{sp['role']}*)" for sp in active_specialists
            )
            parts.append(f"### Routed Specialist Agent(s): {header_badges}")

        if memories_saved:
            parts.append(
                "**Memory Updated:** I have stored the following in your persistent long-term memory:\n"
                + "\n".join(f"- `{m}`" for m in memories_saved)
            )

        for step in tool_steps:
            if step.tool_name == "python_calculator" and step.success:
                data = json.loads(step.output)
                parts.append(f"**Calculation Result:** `{data['expression']}` = **`{data['result']}`**")
            elif step.tool_name == "system_clock" and step.success:
                data = json.loads(step.output)
                stats = data.get("stats", {})
                parts.append(
                    f"**System Clock & Status:**\n"
                    f"- **Local Time:** `{data['local_iso']}` ({data['weekday']})\n"
                    f"- **UTC Time:** `{data['utc_iso']}`\n"
                    f"- **Brain Store:** {stats.get('sessions', 0)} sessions, "
                    f"{stats.get('memories', 0)} long-term memories, "
                    f"{stats.get('documents', 0)} knowledge documents."
                )
            elif step.tool_name == "sql_analytics_query" and step.success:
                data = json.loads(step.output)
                parts.append(
                    f"**SQL Analytics Result ({data['row_count']} rows):**\n```json\n"
                    f"{json.dumps(data['rows'], indent=2)}\n```"
                )
            elif step.tool_name == "generate_webapp_blueprint" and step.success:
                data = json.loads(step.output)
                arch = data["architecture"]
                parts.append(
                    f"#### 🏗️ Web App Architecture & Supabase Blueprint\n"
                    f"- **Stack:** `{data['stack']}`\n"
                    f"- **Frontend Layer:** `{arch['frontend']}`\n"
                    f"- **Backend API Layer:** `{arch['backend']}`\n"
                    f"- **Supabase Migration:** `{arch['database']}`\n\n"
                    f"```sql\n{data['supabase_sql_snippet']}\n```"
                )
            elif step.tool_name == "generate_game_blueprint" and step.success:
                data = json.loads(step.output)
                loop_lines = "\n".join(f"- {item}" for item in data["core_loop"])
                parts.append(
                    f"#### 🎮 Game Design & Engine Blueprint\n"
                    f"**Core 60FPS Execution Loop:**\n{loop_lines}\n\n"
                    f"**Starter Engine Loop (`JavaScript / HTML5 Canvas`):**\n"
                    f"```javascript\n{data['starter_game_loop_js']}\n```"
                )

        # Check if user is asking about themselves or their remembered facts
        if any(
            kw in msg_lower
            for kw in ("who am i", "what is my name", "what do you remember", "my preferences", "about me", "my project", "my role")
        ):
            if recalled_memories:
                mem_list = "\n".join(
                    f"- **[{m['category'].upper()}]** {m['content']}" for m in recalled_memories
                )
                parts.append(f"Here is what I recall from your long-term memory:\n{mem_list}")
            else:
                parts.append(
                    "I don't have any saved memories for your profile yet. "
                    "Tell me facts like *\"Remember that we use PostgreSQL and FastAPI\"* or *\"My name is Alex\"* and I will remember them across sessions."
                )

        # Include grounded RAG knowledge if relevant
        if rag_hits and (not parts or any(kw in msg_lower for kw in ("brain", "api", "endpoint", "rag", "agent", "architecture", "security", "how", "what", "doc"))):
            top = rag_hits[0]
            if top["score"] >= 0.14:
                parts.append(
                    f"Based on **{top['title']}** (`{top['source']}`):\n\n{top['content']}"
                )

        if not parts:
            mem_hint = (
                f" (Recalled {len(recalled_memories)} active memories for `{user_id}`.)"
                if recalled_memories
                else ""
            )
            parts.append(
                f"I received your message: *\"{user_message}\"*.{mem_hint}\n\n"
                "I am currently running on the **Brain Local Hybrid Engine** (`brain-local-hybrid-v1`), which provides "
                "instant offline tool execution (`python_calculator`, `search_knowledge_base`, `save_memory`, `recall_memory`, `sql_analytics_query`, `system_clock`), "
                "persistent episodic memory, and hybrid RAG search.\n\n"
                "> **Tip:** Connect an **OpenAI**, **Google Gemini**, **Anthropic Claude**, or **Ollama** model anytime via `.env` or the **Settings** tab in the dashboard to enable full generative LLM reasoning."
            )

        reply = "\n\n".join(parts)
        usage = {
            "prompt_tokens": len(user_message.split()) * 2,
            "completion_tokens": len(reply.split()),
            "total_tokens": len(user_message.split()) * 2 + len(reply.split()),
        }
        return reply, tool_steps, usage

    # ========================================================================
    # Main Entrypoint: Synchronous & Streaming Agent Turn
    # ========================================================================

    def run_turn(self, req: ChatRequest) -> ChatResponse:
        start_time = time.perf_counter()

        session_id = session_store.ensure_session(
            session_id=req.session_id,
            user_id=req.user_id,
            metadata=req.metadata,
        )
        history = session_store.get_history(session_id=session_id)

        # 1. Auto-extract durable facts from user message
        memories_saved: List[str] = []
        if req.enable_memory:
            memories_saved = memory_store.auto_extract_from_message(
                message=req.message, user_id=req.user_id
            )

        # 2. Recall relevant long-term memories
        recalled_memories: List[Dict[str, Any]] = []
        if req.enable_memory:
            recalled_memories = memory_store.search_memories(
                query=req.message, user_id=req.user_id, top_k=5
            )

        # 3. Retrieve relevant RAG knowledge base chunks
        rag_hits: List[Dict[str, Any]] = []
        if req.enable_rag:
            rag_hits = knowledge_base.search(
                query=req.message, top_k=settings.rag_top_k
            )

        retrieved_context: List[RetrievedContextItem] = []
        for m in recalled_memories:
            retrieved_context.append(
                RetrievedContextItem(
                    source_type="memory",
                    id=m["id"],
                    title=f"Memory ({m['category']})",
                    content=m["content"],
                    score=float(m.get("score") or 1.0),
                )
            )
        for h in rag_hits:
            retrieved_context.append(
                RetrievedContextItem(
                    source_type="knowledge",
                    id=h["chunk_id"],
                    title=h["title"],
                    content=h["content"],
                    score=float(h["score"]),
                )
            )

        # 4. Route task to Specialist Agent(s) (Web App / Game Dev / Core)
        active_specialists = specialist_registry.route_task(
            message=req.message,
            requested_agent_id=req.specialist_id,
            project_mode=req.project_mode,
        )
        specialist_badges = [
            ActiveSpecialistBadge(
                id=sp["id"],
                name=sp["name"],
                role=sp["role"],
                domain=sp["domain"],
                icon=sp["icon"],
            )
            for sp in active_specialists
        ]

        # 5. Assemble system prompt with specialist personas
        base_prompt = req.system_prompt_override or settings.system_prompt
        augmented_system_prompt = self._build_augmented_system_prompt(
            base_prompt=base_prompt,
            active_specialists=active_specialists,
            recalled_memories=recalled_memories,
            rag_hits=rag_hits,
            user_id=req.user_id,
        )

        # 6. Execute LLM + Tool-Calling loop (with automatic fallback to local engine on network/key errors)
        provider, model = self._resolve_provider_and_model(req)
        try:
            if provider == "openai":
                reply, tool_steps, usage = self._run_openai_compatible_loop(
                    base_url=settings.openai_base_url,
                    api_key=settings.openai_api_key,
                    model=model,
                    system_prompt=augmented_system_prompt,
                    history=history,
                    user_message=req.message,
                    enable_tools=req.enable_tools,
                    temperature=req.temperature,
                )
            elif provider == "ollama":
                reply, tool_steps, usage = self._run_openai_compatible_loop(
                    base_url=settings.ollama_base_url,
                    api_key="ollama",
                    model=model,
                    system_prompt=augmented_system_prompt,
                    history=history,
                    user_message=req.message,
                    enable_tools=req.enable_tools,
                    temperature=req.temperature,
                )
            elif provider == "gemini":
                reply, tool_steps, usage = self._run_gemini_loop(
                    api_key=settings.gemini_api_key,
                    model=model,
                    system_prompt=augmented_system_prompt,
                    history=history,
                    user_message=req.message,
                    enable_tools=req.enable_tools,
                    temperature=req.temperature,
                )
            elif provider == "anthropic":
                reply, tool_steps, usage = self._run_anthropic_loop(
                    api_key=settings.anthropic_api_key,
                    model=model,
                    system_prompt=augmented_system_prompt,
                    history=history,
                    user_message=req.message,
                    enable_tools=req.enable_tools,
                    temperature=req.temperature,
                )
            else:
                reply, tool_steps, usage = self._run_local_hybrid_engine(
                    user_message=req.message,
                    user_id=req.user_id,
                    active_specialists=active_specialists,
                    recalled_memories=recalled_memories,
                    rag_hits=rag_hits,
                    memories_saved=memories_saved,
                    enable_tools=req.enable_tools,
                )
        except Exception as exc:
            # Graceful production fallback if upstream provider fails
            fallback_reply, tool_steps, usage = self._run_local_hybrid_engine(
                user_message=req.message,
                user_id=req.user_id,
                active_specialists=active_specialists,
                recalled_memories=recalled_memories,
                rag_hits=rag_hits,
                memories_saved=memories_saved,
                enable_tools=req.enable_tools,
            )
            reply = (
                f"{fallback_reply}\n\n"
                f"*(Note: Upstream provider `{provider}/{model}` returned an error: `{exc}`. "
                f"Automatically served by Brain Local Hybrid fallback.)*"
            )
            provider = f"{provider}->local-fallback"

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # 7. Persist conversation turn & telemetry
        session_store.add_message(
            session_id=session_id,
            role="user",
            content=req.message,
            metadata=req.metadata,
        )
        session_store.add_message(
            session_id=session_id,
            role="assistant",
            content=reply,
            tool_calls=[t.model_dump() for t in tool_steps],
            metadata={
                "provider": provider,
                "model": model,
                "latency_ms": latency_ms,
                "active_specialists": [b.model_dump() for b in specialist_badges],
            },
        )

        with db.connection() as conn:
            conn.execute(
                """
                INSERT INTO telemetry_logs (session_id, user_id, provider, model, tool_count, latency_ms, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session_id,
                    req.user_id,
                    provider,
                    model,
                    len(tool_steps),
                    latency_ms,
                    "ok",
                    datetime.now(timezone.utc).isoformat(),
                ),
            )

        return ChatResponse(
            reply=reply,
            session_id=session_id,
            user_id=req.user_id,
            provider=provider,
            model=model,
            active_specialists=specialist_badges,
            tool_calls=tool_steps,
            retrieved_context=retrieved_context,
            memories_saved=memories_saved,
            latency_ms=latency_ms,
            usage=usage,
        )


brain_agent = BrainAgent()

