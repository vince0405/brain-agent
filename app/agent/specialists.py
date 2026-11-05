"""Multi-Agent Specialist Registry, Chibi House/Farm Characters & Task Router."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.database import DatabaseManager, db


@dataclass
class SpecialistAgent:
    id: str
    name: str
    role: str
    domain: str  # "orchestrator" | "webapp" | "game" | "core"
    icon: str
    description: str
    system_prompt: str
    keywords: List[str] = field(default_factory=list)
    preferred_tools: List[str] = field(default_factory=list)
    chibi: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "domain": self.domain,
            "icon": self.icon,
            "description": self.description,
            "system_prompt": self.system_prompt,
            "keywords": self.keywords,
            "preferred_tools": self.preferred_tools,
            "chibi": self.chibi,
        }


BUILTIN_SPECIALISTS: List[SpecialistAgent] = [
    SpecialistAgent(
        id="auto_router",
        name="Brain Master Orchestrator",
        role="Multi-Agent Task Router & Lead Coordinator",
        domain="orchestrator",
        icon="🧠",
        description="Automatically analyzes your request and dispatches it to the right Web App or Game Development specialist agent(s).",
        system_prompt=(
            "You are the Brain Master Orchestrator. You coordinate specialized sub-agents across Web Application "
            "engineering and Game Development. Synthesize clear, production-ready architecture and code."
        ),
        keywords=[],
        preferred_tools=["search_knowledge_base", "save_memory", "recall_memory", "python_calculator", "system_clock"],
        chibi={
            "chibi_name": "Captain Sprout",
            "title": "Village Foreman",
            "zone": "house",
            "station": "Blueprint Table & Bell Tower",
            "tool_emoji": "📋",
            "hat_color": "#6366f1",
            "outfit_color": "#4f46e5",
            "idle_action": "Checking house blueprints & farm harvest charts",
            "work_action": "Directing the House Builders & Farm Crew!",
        },
    ),
    # ========================================================================
    # WEB APP DEVELOPMENT SPECIALISTS -> BUILDING THE HOUSE CREW
    # ========================================================================
    SpecialistAgent(
        id="webapp_architect",
        name="Web App System Architect",
        role="Full-Stack Architecture & API Designer",
        domain="webapp",
        icon="🏗️",
        description="Designs scalable web application architectures, REST/GraphQL/WebSocket APIs, folder structures, state flow, and deployment pipelines.",
        system_prompt=(
            "You are the Web App System Architect agent inside Brain. "
            "You specialize in designing modern full-stack web applications (Next.js, React, TypeScript, FastAPI, Node.js, Docker). "
            "Always provide clean directory structures, modular component boundaries, API route contracts, and production best practices."
        ),
        keywords=["architecture", "fullstack", "full-stack", "web app", "webapp", "saas", "microservice", "rest api", "folder structure", "system design", "scalable"],
        preferred_tools=["search_knowledge_base", "save_memory", "recall_memory", "generate_webapp_blueprint"],
        chibi={
            "chibi_name": "Milo the Mason",
            "title": "House Framing & Foundation Builder",
            "zone": "house",
            "station": "Timber Framing & Stone Foundation",
            "tool_emoji": "🔨",
            "hat_color": "#f59e0b",
            "outfit_color": "#2563eb",
            "idle_action": "Stacking bricks & measuring oak roof rafters",
            "work_action": "Hammering the house frame & raising roof beams!",
        },
    ),
    SpecialistAgent(
        id="frontend_ui_agent",
        name="Frontend & UI/UX Specialist",
        role="Interactive UI, Components & Styling Engineer",
        domain="webapp",
        icon="🎨",
        description="Builds responsive React/Next.js/HTML5 interfaces, CSS/Tailwind design systems, animations, accessibility, and client state.",
        system_prompt=(
            "You are the Frontend & UI/UX Specialist agent inside Brain. "
            "You craft high-craft, responsive user interfaces using HTML5, modern CSS/Tailwind, React/Next.js, and TypeScript. "
            "Provide complete, copy-pasteable UI components with clean visual hierarchy, dark/light themes, keyboard accessibility, and smooth micro-interactions."
        ),
        keywords=["frontend", "front-end", "ui", "ux", "css", "tailwind", "react", "nextjs", "html", "component", "dashboard", "button", "layout", "responsive", "form", "modal", "navbar"],
        preferred_tools=["search_knowledge_base", "recall_memory", "generate_webapp_blueprint"],
        chibi={
            "chibi_name": "Luna Brush",
            "title": "House Painter & Window Decorator",
            "zone": "house",
            "station": "Cozy Gables, Shutters & Flower Boxes",
            "tool_emoji": "🖌️",
            "hat_color": "#ec4899",
            "outfit_color": "#db2777",
            "idle_action": "Mixing pastel paint & arranging window flowers",
            "work_action": "Painting the house walls & polishing stained glass!",
        },
    ),
    SpecialistAgent(
        id="backend_supabase_agent",
        name="Backend & Supabase Specialist",
        role="Database Schema, Supabase Auth/RLS & API Engineer",
        domain="webapp",
        icon="⚡",
        description="Builds PostgreSQL schemas, Supabase migrations, Row-Level Security (RLS) policies, Edge Functions, and FastAPI/Node backend endpoints.",
        system_prompt=(
            "You are the Backend & Supabase Specialist agent inside Brain (linked to Supabase project ref yqvbwrhhqivnmmiuxbgz). "
            "You specialize in PostgreSQL schema design, Supabase Auth, Row-Level Security (RLS) policies using cached (SELECT auth.uid()), "
            "IDENTITY primary keys, composite INCLUDE covering indexes, and FastAPI backend services."
        ),
        keywords=["supabase", "database", "postgres", "postgresql", "sql", "schema", "migration", "rls", "auth", "authentication", "backend", "back-end", "endpoint", "fastapi", "table", "edge function", "storage", "index"],
        preferred_tools=["sql_analytics_query", "search_knowledge_base", "save_memory", "generate_webapp_blueprint"],
        chibi={
            "chibi_name": "Volt Wrench",
            "title": "House Plumber & Solar Grid Engineer",
            "zone": "house",
            "station": "Solar Roof & Underground Water Pipes",
            "tool_emoji": "🔧",
            "hat_color": "#10b981",
            "outfit_color": "#059669",
            "idle_action": "Tuning copper pipes & Postgres water pressure",
            "work_action": "Wiring solar panels & turbo-indexing house pipes!",
        },
    ),
    # ========================================================================
    # GAME DEVELOPMENT SPECIALISTS -> WORKING ON THE FARM CREW
    # ========================================================================
    SpecialistAgent(
        id="game_designer",
        name="Game Designer & Mechanics Architect",
        role="Core Gameplay Loop, Balancing & Level Design",
        domain="game",
        icon="🎮",
        description="Designs core gameplay loops, player progression, economy/damage math balancing, enemy AI behaviors, and Game Design Documents (GDD).",
        system_prompt=(
            "You are the Game Designer & Mechanics Architect agent inside Brain. "
            "You design compelling 2D and 3D games: core gameplay loops, controls, win/lose conditions, progression curves, "
            "combat/economy balancing formulas, and level design. Use concrete math tables and clear Game Design Document (GDD) sections."
        ),
        keywords=["game design", "gameplay", "mechanic", "level design", "gdd", "progression", "boss", "enemy", "xp", "health", "damage", "rpg", "platformer", "roguelike", "puzzle", "multiplayer", "balance"],
        preferred_tools=["python_calculator", "save_memory", "recall_memory", "generate_game_blueprint"],
        chibi={
            "chibi_name": "Pip Clover",
            "title": "Master Crop & Harvest Planner",
            "zone": "farm",
            "station": "Golden Wheat & Pumpkin Patch",
            "tool_emoji": "🌾",
            "hat_color": "#eab308",
            "outfit_color": "#16a34a",
            "idle_action": "Planting star-turnip seeds & balancing crop yields",
            "work_action": "Watering golden crops & harvesting XP pumpkins!",
        },
    ),
    SpecialistAgent(
        id="game_engine_coder",
        name="Game Engine & Physics Developer",
        role="HTML5 Canvas / WebGL / Phaser / Three.js / Godot / Unity Coder",
        domain="game",
        icon="🕹️",
        description="Writes playable game loops, physics, collision detection, ECS architecture, shaders, input controllers, and state machines.",
        system_prompt=(
            "You are the Game Engine & Physics Developer agent inside Brain. "
            "You write high-performance, playable game code in HTML5 Canvas, JavaScript/TypeScript, Phaser, Three.js, WebGL, GDScript (Godot), or C# (Unity). "
            "Always provide complete, runnable game loops (`update(dt)`, `render(ctx)`), crisp AABB/circle collision detection, delta-time physics, and responsive input handling."
        ),
        keywords=["game", "canvas", "phaser", "three.js", "threejs", "webgl", "unity", "godot", "gdscript", "physics", "collision", "sprite", "animation", "fps", "game loop", "arcade", "2d", "3d", "shader", "playable", "make a game"],
        preferred_tools=["python_calculator", "search_knowledge_base", "generate_game_blueprint"],
        chibi={
            "chibi_name": "Torque Gear",
            "title": "Farm Windmill & Tractor Mechanic",
            "zone": "farm",
            "station": "Spinning Windmill & Steam Tractor",
            "tool_emoji": "⚙️",
            "hat_color": "#38bdf8",
            "outfit_color": "#0284c7",
            "idle_action": "Oiling windmill gears & checking 60RPM waterwheel",
            "work_action": "Revving the farm tractor & spinning windmill physics!",
        },
    ),
    SpecialistAgent(
        id="game_world_narrative",
        name="Game World, Narrative & Audio Director",
        role="Lore, Dialogue Systems, Quests & Art/Audio Direction",
        domain="game",
        icon="🗺️",
        description="Creates branching dialogue JSON trees, quest systems, world-building lore, procedural generation rules, and visual/audio asset specs.",
        system_prompt=(
            "You are the Game World, Narrative & Audio Director agent inside Brain. "
            "You craft immersive worlds, branching NPC dialogue structures (in structured JSON/TypeScript), quest state machines, "
            "procedural map generation rules, and pixel/3D art & WebAudio synthesizer sound specifications."
        ),
        keywords=["story", "lore", "dialogue", "npc", "quest", "world", "narrative", "cutscene", "sound", "music", "audio", "art", "tilemap", "procedural"],
        preferred_tools=["save_memory", "recall_memory", "generate_game_blueprint"],
        chibi={
            "chibi_name": "Melody Honey",
            "title": "Orchard Shepherd & Beekeeper",
            "zone": "farm",
            "station": "Apple Orchard, Beehives & Sheep Pen",
            "tool_emoji": "🍯",
            "hat_color": "#a855f7",
            "outfit_color": "#9333ea",
            "idle_action": "Playing flute for fluffy sheep & gathering honey",
            "work_action": "Singing orchard lore & guiding farm fireflies!",
        },
    ),
    # ========================================================================
    # QA, TESTING & SECURITY SPECIALIST -> FENCE GUARD BETWEEN HOUSE & FARM
    # ========================================================================
    SpecialistAgent(
        id="qa_security_agent",
        name="QA, Performance & Security Auditor",
        role="Automated Testing, Debugging & Vulnerability Reviewer",
        domain="core",
        icon="🛡️",
        description="Audits web apps and games for bugs, frame-rate bottlenecks, SQLi/XSS/RLS vulnerabilities, and writes automated test suites.",
        system_prompt=(
            "You are the QA, Performance & Security Auditor agent inside Brain. "
            "You review web application and game code for edge cases, security flaws (XSS, CSRF, broken RLS, injection), "
            "memory leaks, 60fps rendering bottlenecks, and write comprehensive pytest / Playwright / Vitest tests."
        ),
        keywords=["test", "pytest", "debug", "bug", "fix", "error", "security", "audit", "optimize", "performance", "fps", "lag", "vulnerability"],
        preferred_tools=["python_calculator", "sql_analytics_query", "search_knowledge_base"],
        chibi={
            "chibi_name": "Bramble Shield",
            "title": "House & Farm Fence Watchdog",
            "zone": "farm",
            "station": "Wooden Gate & Bug-Catcher Lantern",
            "tool_emoji": "🔍",
            "hat_color": "#f43f5e",
            "outfit_color": "#e11d48",
            "idle_action": "Patrolling the garden fence with a bug net",
            "work_action": "Catching beetles & fortifying the village gate!",
        },
    ),
]


class SpecialistRegistry:
    """Manages built-in and user-created custom specialist agents with Chibi characters."""

    def __init__(self, database: DatabaseManager = db) -> None:
        self.db = database
        self._init_table()
        self._builtin_map: Dict[str, SpecialistAgent] = {a.id: a for a in BUILTIN_SPECIALISTS}

    def _init_table(self) -> None:
        with self.db.connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS specialist_agents (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    role TEXT NOT NULL,
                    domain TEXT NOT NULL DEFAULT 'custom',
                    icon TEXT NOT NULL DEFAULT '🤖',
                    description TEXT NOT NULL,
                    system_prompt TEXT NOT NULL,
                    keywords_json TEXT NOT NULL DEFAULT '[]',
                    preferred_tools_json TEXT NOT NULL DEFAULT '[]',
                    chibi_json TEXT NOT NULL DEFAULT '{}',
                    created_at TEXT NOT NULL
                );
                """
            )
            # Ensure chibi_json column exists if table was created in an earlier migration
            cols = [r["name"] for r in conn.execute("PRAGMA table_info(specialist_agents)").fetchall()]
            if "chibi_json" not in cols:
                conn.execute("ALTER TABLE specialist_agents ADD COLUMN chibi_json TEXT NOT NULL DEFAULT '{}'")

    def list_agents(self, domain: Optional[str] = None) -> List[Dict[str, Any]]:
        agents = [a.to_dict() for a in BUILTIN_SPECIALISTS]
        with self.db.connection() as conn:
            rows = conn.execute("SELECT * FROM specialist_agents ORDER BY created_at DESC").fetchall()
            for r in rows:
                default_zone = "farm" if r["domain"] == "game" else "house"
                chibi_data = json.loads(r["chibi_json"] or "{}") or {
                    "chibi_name": r["name"].split()[0],
                    "title": r["role"],
                    "zone": default_zone,
                    "station": "Custom Workshop",
                    "tool_emoji": r["icon"] or "🛠️",
                    "hat_color": "#6366f1",
                    "outfit_color": "#4f46e5",
                    "idle_action": f"Preparing {r['domain']} tools",
                    "work_action": f"Working hard on {r['name']} tasks!",
                }
                agents.append(
                    {
                        "id": r["id"],
                        "name": r["name"],
                        "role": r["role"],
                        "domain": r["domain"],
                        "icon": r["icon"],
                        "description": r["description"],
                        "system_prompt": r["system_prompt"],
                        "keywords": json.loads(r["keywords_json"] or "[]"),
                        "preferred_tools": json.loads(r["preferred_tools_json"] or "[]"),
                        "chibi": chibi_data,
                        "custom": True,
                    }
                )
        if domain and domain != "all":
            agents = [a for a in agents if a["domain"] == domain]
        return agents

    def get_agent(self, agent_id: str) -> Optional[Dict[str, Any]]:
        if agent_id in self._builtin_map:
            return self._builtin_map[agent_id].to_dict()
        for a in self.list_agents():
            if a["id"] == agent_id:
                return a
        return None

    def create_custom_agent(
        self,
        agent_id: str,
        name: str,
        role: str,
        domain: str,
        icon: str,
        description: str,
        system_prompt: str,
        keywords: List[str],
        preferred_tools: List[str],
        chibi: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        clean_id = re.sub(r"[^a-z0-9_]", "_", agent_id.lower().strip())
        now = datetime.now(timezone.utc).isoformat()
        default_zone = "farm" if domain == "game" else "house"
        chibi_obj = chibi or {
            "chibi_name": name.strip().split()[0],
            "title": role.strip(),
            "zone": default_zone,
            "station": "Custom Village Station",
            "tool_emoji": icon.strip() or "🛠️",
            "hat_color": "#14b8a6",
            "outfit_color": "#0d9488",
            "idle_action": f"Tending the {default_zone} station",
            "work_action": f"Crafting {role.strip()} deliverables!",
        }
        with self.db.connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO specialist_agents
                (id, name, role, domain, icon, description, system_prompt, keywords_json, preferred_tools_json, chibi_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    clean_id,
                    name.strip(),
                    role.strip(),
                    domain.strip(),
                    icon.strip() or "🤖",
                    description.strip(),
                    system_prompt.strip(),
                    json.dumps(keywords),
                    json.dumps(preferred_tools),
                    json.dumps(chibi_obj),
                    now,
                ),
            )
        return self.get_agent(clean_id) or {}

    def delete_custom_agent(self, agent_id: str) -> bool:
        if agent_id in self._builtin_map:
            return False
        with self.db.connection() as conn:
            cur = conn.execute("DELETE FROM specialist_agents WHERE id = ?", (agent_id,))
            return cur.rowcount > 0

    def route_task(
        self,
        message: str,
        requested_agent_id: Optional[str] = None,
        project_mode: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        if project_mode == "webapp_team":
            return [
                self._builtin_map["webapp_architect"].to_dict(),
                self._builtin_map["frontend_ui_agent"].to_dict(),
                self._builtin_map["backend_supabase_agent"].to_dict(),
            ]
        if project_mode == "game_team":
            return [
                self._builtin_map["game_designer"].to_dict(),
                self._builtin_map["game_engine_coder"].to_dict(),
                self._builtin_map["game_world_narrative"].to_dict(),
            ]

        if requested_agent_id and requested_agent_id != "auto_router":
            found = self.get_agent(requested_agent_id)
            if found:
                return [found]

        msg_lower = message.lower()
        all_candidates = [a for a in self.list_agents() if a["id"] != "auto_router"]
        scored: List[tuple[int, Dict[str, Any]]] = []

        for agent in all_candidates:
            score = 0
            for kw in agent.get("keywords", []):
                if kw.lower() in msg_lower:
                    score += 3 if " " in kw else 2

            if agent["domain"] == "game" and any(w in msg_lower for w in ("game", "play", "player", "canvas", "phaser", "arcade", "rpg", "2d", "3d", "unity", "godot", "level", "sprite", "farm")):
                score += 2
            if agent["domain"] == "webapp" and any(w in msg_lower for w in ("web app", "webapp", "website", "dashboard", "saas", "frontend", "backend", "supabase", "react", "next", "api", "login", "form", "house", "postgres", "index")):
                score += 2

            if score > 0:
                scored.append((score, agent))

        scored.sort(key=lambda x: x[0], reverse=True)
        if not scored:
            return [self._builtin_map["auto_router"].to_dict()]

        selected = [scored[0][1]]
        if len(scored) > 1 and scored[1][0] >= max(3, scored[0][0] - 2):
            selected.append(scored[1][1])
        return selected


specialist_registry = SpecialistRegistry()
