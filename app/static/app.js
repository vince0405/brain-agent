// ============================================================================
// BRAIN AGENT // HQ COMMAND — 2D Isometric & 3D Orbit World Engine
// House Builders (Web App Crew) + Farm Workers (Game Crew) + Monthly Trends
// ============================================================================

const ROOM_ZONES = [
  {
    id: "HOUSE_FRAMING",
    group: "HOUSE_BUILD",
    label: "HOUSE FRAMING // ARCHITECT",
    x: -420,
    y: -360,
    w: 390,
    h: 230,
    floorColor: "#581c87",
    floorTop: "#6b21a8",
    wallColor: "#cbd5e1",
    propType: "house_frame",
  },
  {
    id: "HOUSE_GABLES",
    group: "HOUSE_BUILD",
    label: "HOUSE PAINT & UI // FRONTEND",
    x: -420,
    y: -110,
    w: 250,
    h: 240,
    floorColor: "#7e22ce",
    floorTop: "#9333ea",
    wallColor: "#cbd5e1",
    propType: "paint_studio",
  },
  {
    id: "HOUSE_SOLAR_PIPES",
    group: "HOUSE_BUILD",
    label: "SOLAR & POSTGRES PIPES // SUPABASE",
    x: -420,
    y: 150,
    w: 250,
    h: 230,
    floorColor: "#be123c",
    floorTop: "#e11d48",
    wallColor: "#cbd5e1",
    propType: "solar_pipes",
  },
  {
    id: "TREND_NEXUS",
    group: "TREND_NEXUS",
    label: "BRAIN CORE // MONTHLY TREND NEXUS",
    x: -150,
    y: -110,
    w: 300,
    h: 240,
    floorColor: "#082f49",
    floorTop: "#0c4a6e",
    wallColor: "#38bdf8",
    propType: "hologram_core",
  },
  {
    id: "FARM_CROPS",
    group: "FARM_HARVEST",
    label: "GOLDEN WHEAT & TURNIP FARM",
    x: -10,
    y: -360,
    w: 270,
    h: 230,
    floorColor: "#065f46",
    floorTop: "#059669",
    wallColor: "#a7f3d0",
    propType: "crop_rows",
  },
  {
    id: "FARM_WINDMILL",
    group: "FARM_HARVEST",
    label: "WINDMILL & PHYSICS BARN",
    x: -150,
    y: 150,
    w: 290,
    h: 230,
    floorColor: "#047857",
    floorTop: "#10b981",
    wallColor: "#d1fae5",
    propType: "windmill",
  },
  {
    id: "FARM_ORCHARD",
    group: "FARM_HARVEST",
    label: "ORCHARD, BEEHIVES & WATCHTOWER",
    x: 160,
    y: 10,
    w: 260,
    h: 370,
    floorColor: "#701a75",
    floorTop: "#86198f",
    wallColor: "#f5d0fe",
    propType: "orchard_bees",
  },
  {
    id: "BARN_REST",
    group: "BARN_REST",
    label: "FARMHOUSE PANTRY & REC GYM",
    x: 280,
    y: -360,
    w: 140,
    h: 350,
    floorColor: "#0f766e",
    floorTop: "#14b8a6",
    wallColor: "#99f6e4",
    propType: "barn_pantry",
  },
];

// 16 Chibi Agents (8 Lead Specialists + 8 Assistant Chibi Builders/Farmers)
const CHIBI_AGENTS = [
  {
    id: "auto_router",
    apiId: "auto_router",
    name: "Julian (Sprout)",
    role: "Founder & Master Brain Router",
    domain: "ORCHESTRATOR // NEXUS",
    icon: "🧠",
    tool: "📋",
    hatColor: "#38bdf8",
    bodyColor: "#0284c7",
    homeRoom: "TREND_NEXUS",
    currentZone: "TREND_NEXUS",
    x: -45,
    y: -35,
    tx: -45,
    ty: -35,
    task: "Syncing Monthly Trend Pulse (Strictly Trends)",
    station: "brain/core/orchestrator.py",
    trend: "Compound Multi-Agent Specialist Routing",
    progress: 94,
  },
  {
    id: "john_lloyd",
    apiId: "auto_router",
    name: "John Lloyd",
    role: "Monthly Trend Scanner (Trends Only)",
    domain: "TREND PULSE // NEXUS",
    icon: "📈",
    tool: "📡",
    hatColor: "#22d3ee",
    bodyColor: "#0891b2",
    homeRoom: "TREND_NEXUS",
    currentZone: "TREND_NEXUS",
    x: 55,
    y: 45,
    tx: 55,
    ty: 45,
    task: "Distilling 2026-11 Web & Game Trends",
    station: "brain/trends/app/agent/trends.py",
    trend: "Zero-Personal-Data Monthly Trend Distillation",
    progress: 88,
  },
  {
    id: "webapp_architect",
    apiId: "webapp_architect",
    name: "Milo (Christian)",
    role: "House Framing & Web App Architect",
    domain: "HOUSE BUILD // WEBAPP",
    icon: "🏗️",
    tool: "🔨",
    hatColor: "#f59e0b",
    bodyColor: "#2563eb",
    homeRoom: "HOUSE_FRAMING",
    currentZone: "HOUSE_BUILD",
    x: -330,
    y: -280,
    tx: -330,
    ty: -280,
    task: "Raising oak roof rafters & API architecture",
    station: "house/framing/app/main.py",
    trend: "Local-First Sync Engines & Edge SSE",
    progress: 82,
  },
  {
    id: "neil_mar",
    apiId: "webapp_architect",
    name: "Neil Mar",
    role: "Brick Foundation & Timber Chibi",
    domain: "HOUSE BUILD // WEBAPP",
    icon: "🧱",
    tool: "🪓",
    hatColor: "#fbbf24",
    bodyColor: "#4f46e5",
    homeRoom: "HOUSE_FRAMING",
    currentZone: "HOUSE_BUILD",
    x: -240,
    y: -310,
    tx: -240,
    ty: -310,
    task: "Laying stone foundation & Docker configs",
    station: "house/foundation/Dockerfile",
    trend: "Multi-Stage Slim Container Builds",
    progress: 76,
  },
  {
    id: "bonnie",
    apiId: "webapp_architect",
    name: "Bonnie",
    role: "Roof Shingle & Route Chibi",
    domain: "HOUSE BUILD // WEBAPP",
    icon: "🏠",
    tool: "📐",
    hatColor: "#a855f7",
    bodyColor: "#6366f1",
    homeRoom: "HOUSE_FRAMING",
    currentZone: "HOUSE_BUILD",
    x: -260,
    y: -220,
    tx: -260,
    ty: -220,
    task: "Aligning roof trusses & REST schemas",
    station: "house/roof/app/schemas.py",
    trend: "Strict Pydantic v2 Contract Validation",
    progress: 85,
  },
  {
    id: "arvin",
    apiId: "webapp_architect",
    name: "Arvin",
    role: "Chimney & WebSocket Builder",
    domain: "HOUSE BUILD // WEBAPP",
    icon: "🔌",
    tool: "🪛",
    hatColor: "#34d399",
    bodyColor: "#059669",
    homeRoom: "HOUSE_FRAMING",
    currentZone: "HOUSE_BUILD",
    x: -140,
    y: -285,
    tx: -140,
    ty: -285,
    task: "Building brick chimney & WebSocket streams",
    station: "house/chimney/ws_stream.py",
    trend: "Bidirectional Real-Time Agent Telemetry",
    progress: 91,
  },
  {
    id: "frontend_ui_agent",
    apiId: "frontend_ui_agent",
    name: "Luna (Gloria)",
    role: "House Painter & Frontend UI Specialist",
    domain: "HOUSE BUILD // UI/UX",
    icon: "🎨",
    tool: "🖌️",
    hatColor: "#ec4899",
    bodyColor: "#db2777",
    homeRoom: "HOUSE_GABLES",
    currentZone: "HOUSE_BUILD",
    x: -290,
    y: -50,
    tx: -290,
    ty: -50,
    task: "Painting pastel house gables & isometric UI",
    station: "house/gables/app/static/index.html",
    trend: "Interactive Canvas Micro-Worlds & Bento Grids",
    progress: 89,
  },
  {
    id: "jb_painter",
    apiId: "frontend_ui_agent",
    name: "JB",
    role: "Window Glass & CSS Animator Chibi",
    domain: "HOUSE BUILD // UI/UX",
    icon: "🪟",
    tool: "✨",
    hatColor: "#f472b6",
    bodyColor: "#be185d",
    homeRoom: "HOUSE_GABLES",
    currentZone: "HOUSE_BUILD",
    x: -360,
    y: 25,
    tx: -360,
    ty: 25,
    task: "Polishing stained glass & flower boxes",
    station: "house/windows/app/static/styles.css",
    trend: "Zero-Dependency GPU CSS Transitions",
    progress: 74,
  },
  {
    id: "backend_supabase_agent",
    apiId: "backend_supabase_agent",
    name: "Volt (Josiah)",
    role: "House Plumber & Supabase Engineer",
    domain: "HOUSE BUILD // SUPABASE",
    icon: "⚡",
    tool: "🔧",
    hatColor: "#10b981",
    bodyColor: "#047857",
    homeRoom: "HOUSE_SOLAR_PIPES",
    currentZone: "HOUSE_BUILD",
    x: -310,
    y: 250,
    tx: -310,
    ty: 250,
    task: "Wiring solar roof & Postgres INCLUDE indexes",
    station: "supabase/migrations/20261105000001_brain.sql",
    trend: "Postgres InitPlan (SELECT auth.uid()) RLS Caching",
    progress: 96,
  },
  {
    id: "game_designer",
    apiId: "game_designer",
    name: "Pip (Mary Grace)",
    role: "Master Crop Planner & Game Designer",
    domain: "FARM HARVEST // GAME DEV",
    icon: "🎮",
    tool: "🌾",
    hatColor: "#eab308",
    bodyColor: "#16a34a",
    homeRoom: "FARM_CROPS",
    currentZone: "FARM_HARVEST",
    x: 95,
    y: -290,
    tx: 95,
    ty: -290,
    task: "Planting golden wheat & balancing RPG XP curve",
    station: "farm/crops/game_design_doc.md",
    trend: "Cozy Life-Sim & Base-Building Meta-Loops",
    progress: 84,
  },
  {
    id: "blaze_farmer",
    apiId: "game_designer",
    name: "Blaze",
    role: "Pumpkin Patch & Loot Balance Chibi",
    domain: "FARM HARVEST // GAME DEV",
    icon: "🎃",
    tool: "🚿",
    hatColor: "#f97316",
    bodyColor: "#15803d",
    homeRoom: "FARM_CROPS",
    currentZone: "FARM_HARVEST",
    x: 45,
    y: -210,
    tx: 45,
    ty: -210,
    task: "Watering star-pumpkins & drop-rate math",
    station: "farm/pumpkins/balance_calc.py",
    trend: "Synergetic Crop & Skill Upgrade Trees",
    progress: 79,
  },
  {
    id: "fervin_farmer",
    apiId: "game_designer",
    name: "Fervin",
    role: "Seed Silo & Level Layout Chibi",
    domain: "FARM HARVEST // GAME DEV",
    icon: "🌱",
    tool: "🪣",
    hatColor: "#84cc16",
    bodyColor: "#166534",
    homeRoom: "FARM_CROPS",
    currentZone: "FARM_HARVEST",
    x: 175,
    y: -185,
    tx: 175,
    ty: -185,
    task: "Sorting heirloom seeds & tilemap collision",
    station: "farm/silo/tilemap_grid.json",
    trend: "Procedural Cozy Farm Plot Generation",
    progress: 81,
  },
  {
    id: "game_engine_coder",
    apiId: "game_engine_coder",
    name: "Torque (Rey Jhon)",
    role: "Windmill Mechanic & Game Engine Coder",
    domain: "FARM HARVEST // ENGINE",
    icon: "🕹️",
    tool: "⚙️",
    hatColor: "#38bdf8",
    bodyColor: "#0369a1",
    homeRoom: "FARM_WINDMILL",
    currentZone: "FARM_HARVEST",
    x: -40,
    y: 250,
    tx: -40,
    ty: 250,
    task: "Tuning 60FPS windmill blades & tractor ECS",
    station: "farm/windmill/engine_loop.js",
    trend: "Deterministic 60FPS Fixed-Timestep Canvas ECS",
    progress: 92,
  },
  {
    id: "keiru_mechanic",
    apiId: "game_engine_coder",
    name: "Keiru",
    role: "Irrigation Waterwheel & Shader Chibi",
    domain: "FARM HARVEST // ENGINE",
    icon: "🚜",
    tool: "🔩",
    hatColor: "#60a5fa",
    bodyColor: "#1d4ed8",
    homeRoom: "FARM_WINDMILL",
    currentZone: "FARM_HARVEST",
    x: -95,
    y: 310,
    tx: -95,
    ty: 310,
    task: "Oiling waterwheel physics & particle shaders",
    station: "farm/waterwheel/physics_aabb.js",
    trend: "WebGPU 2D Water & Crop Wind Shaders",
    progress: 87,
  },
  {
    id: "game_world_narrative",
    apiId: "game_world_narrative",
    name: "Melody (Khent)",
    role: "Orchard Beekeeper & World Director",
    domain: "FARM HARVEST // WORLD",
    icon: "🗺️",
    tool: "🍯",
    hatColor: "#c084fc",
    bodyColor: "#7e22ce",
    homeRoom: "FARM_ORCHARD",
    currentZone: "FARM_HARVEST",
    x: 245,
    y: 120,
    tx: 245,
    ty: 120,
    task: "Harvesting orchard honey & NPC dialogue trees",
    station: "farm/orchard/npc_dialogues.json",
    trend: "Reactive Environmental Chibi Villager Barks",
    progress: 90,
  },
  {
    id: "qa_security_agent",
    apiId: "qa_security_agent",
    name: "Bramble (Gian)",
    role: "Fence Watchdog & QA Security Auditor",
    domain: "VILLAGE GUARD // QA & RLS",
    icon: "🛡️",
    tool: "🔍",
    hatColor: "#fb7185",
    bodyColor: "#be123c",
    homeRoom: "FARM_ORCHARD",
    currentZone: "FARM_HARVEST",
    x: 310,
    y: 240,
    tx: 310,
    ty: 240,
    task: "Patrolling house & farm fence + auditing RLS",
    station: "village/gate/tests/test_brain.py",
    trend: "Automated RLS Policy & 16.6ms Frame Auditing",
    progress: 97,
  },
];

// Camera & World State
const worldState = {
  viewMode: "2D", // "2D" | "3D"
  activeZoneFilter: "OVERVIEW",
  selectedAgentId: "backend_supabase_agent", // Volt (Josiah) selected by default like in video
  camX: 0,
  camY: 0,
  targetCamX: 0,
  targetCamY: 0,
  zoom: 0.88,
  targetZoom: 0.88,
  yaw: -Math.PI / 4,
  targetYaw: -Math.PI / 4,
  pitch: 0.56,
  targetPitch: 0.56,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragMoved: false,
  time: 0,
  telemetryCount: 0,
  screenHitBoxes: [],
  trends: [],
};

const ZONE_CAMERA_PRESETS = {
  OVERVIEW: { x: 0, y: 0, zoom: 0.88 },
  HOUSE_BUILD: { x: -290, y: -40, zoom: 1.32 },
  FARM_HARVEST: { x: 110, y: 10, zoom: 1.25 },
  TREND_NEXUS: { x: 0, y: 10, zoom: 1.65 },
  BARN_REST: { x: 350, y: -185, zoom: 1.55 },
};

// ============================================================================
// Isometric & 3D Projection Math
// ============================================================================
const canvas = document.getElementById("worldCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeCanvas);

function projectPoint(wx, wy, wz = 0) {
  const rect = canvas.parentElement.getBoundingClientRect();
  const cx = rect.width / 2;
  const cy = rect.height / 2;

  const dx = wx - worldState.camX;
  const dy = wy - worldState.camY;

  const cosY = Math.cos(worldState.yaw);
  const sinY = Math.sin(worldState.yaw);

  const rx = dx * cosY - dy * sinY;
  const ry = dx * sinY + dy * cosY;

  const sx = cx + rx * worldState.zoom;
  const sy = cy + (ry * worldState.pitch - wz) * worldState.zoom;
  return { x: sx, y: sy, depth: ry };
}

function drawPolygon(points, fill, stroke = null, lineWidth = 1) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

// Draw a 3D extruded isometric box (x, y, w, h, zBase, zHeight)
function drawIsoBox(x, y, w, h, zBase, zHeight, topColor, leftColor, rightColor, strokeColor = null) {
  const zTop = zBase + zHeight;
  const b0 = projectPoint(x, y, zBase);
  const b1 = projectPoint(x + w, y, zBase);
  const b2 = projectPoint(x + w, y + h, zBase);
  const b3 = projectPoint(x, y + h, zBase);

  const t0 = projectPoint(x, y, zTop);
  const t1 = projectPoint(x + w, y, zTop);
  const t2 = projectPoint(x + w, y + h, zTop);
  const t3 = projectPoint(x, y + h, zTop);

  // Draw visible side faces
  drawPolygon([b3, b2, t2, t3], leftColor, strokeColor, 0.7);
  drawPolygon([b1, b2, t2, t1], rightColor, strokeColor, 0.7);
  drawPolygon([b0, b3, t3, t0], leftColor, strokeColor, 0.7);
  drawPolygon([b0, b1, t1, t0], rightColor, strokeColor, 0.7);
  // Top face
  drawPolygon([t0, t1, t2, t3], topColor, strokeColor, 0.9);
}

// ============================================================================
// Room Props: House Construction, Farm Crops/Windmill, Holographic Trend Core
// ============================================================================
function drawRoomProps(room, t) {
  const { x, y, w, h, propType } = room;

  if (propType === "hologram_core") {
    // Glowing Central Brain & Monthly Trend Nexus Platform
    const cx = x + w / 2;
    const cy = y + h / 2;
    const baseCenter = projectPoint(cx, cy, 4);

    // Outer floor glowing rings
    for (let r = 88; r >= 28; r -= 26) {
      ctx.beginPath();
      for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.2) {
        const pt = projectPoint(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3);
        if (a === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.strokeStyle = r === 88 ? "rgba(34, 211, 238, 0.75)" : "rgba(56, 189, 248, 0.35)";
      ctx.lineWidth = r === 88 ? 2.5 : 1.4;
      ctx.stroke();
    }

    // 3D Spinning Orbital Hologram Rings
    const holoCenter = projectPoint(cx, cy, 38 + Math.sin(t * 2.2) * 4);
    ctx.save();
    ctx.translate(holoCenter.x, holoCenter.y);
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate(t * (1.1 + i * 0.4) + i * 1.05);
      ctx.beginPath();
      ctx.ellipse(0, 0, 34 * worldState.zoom, 13 * worldState.zoom, 0, 0, Math.PI * 2);
      ctx.strokeStyle = i === 0 ? "#22d3ee" : i === 1 ? "#38bdf8" : "#a5f3fc";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  } else if (propType === "house_frame") {
    // House under construction: stone foundation, wooden corner pillars, roof rafters & desks
    drawIsoBox(x + 40, y + 40, 130, 95, 2, 8, "#94a3b8", "#64748b", "#475569");
    // 4 Timber pillars of the house being built
    drawIsoBox(x + 45, y + 45, 10, 10, 10, 38, "#f59e0b", "#d97706", "#b45309");
    drawIsoBox(x + 155, y + 45, 10, 10, 10, 38, "#f59e0b", "#d97706", "#b45309");
    drawIsoBox(x + 45, y + 120, 10, 10, 10, 38, "#f59e0b", "#d97706", "#b45309");
    drawIsoBox(x + 155, y + 120, 10, 10, 10, 38, "#f59e0b", "#d97706", "#b45309");
    // Roof beam across top
    drawIsoBox(x + 42, y + 42, 126, 12, 48, 6, "#fbbf24", "#d97706", "#b45309");
    drawIsoBox(x + 42, y + 118, 126, 12, 48, 6, "#fbbf24", "#d97706", "#b45309");
    // Architect Blueprint Tables
    drawIsoBox(x + 220, y + 45, 55, 32, 2, 14, "#38bdf8", "#0284c7", "#0369a1");
    drawIsoBox(x + 295, y + 45, 55, 32, 2, 14, "#38bdf8", "#0284c7", "#0369a1");
  } else if (propType === "paint_studio") {
    // Painted Cozy Cottage Wall & Flower Boxes
    drawIsoBox(x + 35, y + 40, 95, 70, 2, 32, "#f472b6", "#db2777", "#9d174d");
    drawIsoBox(x + 30, y + 36, 105, 78, 34, 10, "#fb7185", "#e11d48", "#be123c");
    // Painter desks
    drawIsoBox(x + 150, y + 55, 55, 34, 2, 14, "#e879f9", "#c026d3", "#86198f");
    drawIsoBox(x + 150, y + 135, 55, 34, 2, 14, "#e879f9", "#c026d3", "#86198f");
  } else if (propType === "solar_pipes") {
    // Supabase Postgres Water Tank & Solar Array for the House
    drawIsoBox(x + 45, y + 45, 75, 45, 2, 22, "#10b981", "#059669", "#047857");
    drawIsoBox(x + 140, y + 45, 70, 45, 2, 16, "#06b6d4", "#0891b2", "#0e7490");
    drawIsoBox(x + 45, y + 130, 165, 40, 2, 12, "#34d399", "#059669", "#065f46");
  } else if (propType === "crop_rows") {
    // Golden Farm Crop Rows & Harvest Plots
    for (let r = 0; r < 3; r++) {
      const ry = y + 40 + r * 58;
      drawIsoBox(x + 35, ry, 195, 34, 2, 5, "#78350f", "#451a03", "#290f02");
      // Swaying Golden Wheat & Sprouts along the row
      for (let c = 0; c < 5; c++) {
        const sway = Math.sin(t * 3 + c + r) * 3;
        drawIsoBox(
          x + 48 + c * 36 + sway,
          ry + 8,
          14,
          14,
          7,
          12,
          r === 1 ? "#f97316" : "#facc15",
          "#ca8a04",
          "#854d0e"
        );
      }
    }
  } else if (propType === "windmill") {
    // Farm Windmill Tower + Spinning Blades + Mini Tractor
    const wx = x + 75;
    const wy = y + 75;
    drawIsoBox(wx, wy, 48, 48, 2, 52, "#fef08a", "#ca8a04", "#a16207");
    const hub = projectPoint(wx + 24, wy + 24, 48);
    ctx.save();
    ctx.translate(hub.x, hub.y);
    ctx.rotate(t * 1.8);
    ctx.strokeStyle = "#fde047";
    ctx.lineWidth = 3 * worldState.zoom;
    for (let b = 0; b < 4; b++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -34 * worldState.zoom);
      ctx.stroke();
    }
    ctx.restore();
    // Mini Farm Tractor
    drawIsoBox(x + 170, y + 110, 56, 38, 2, 18, "#38bdf8", "#0284c7", "#0369a1");
  } else if (propType === "orchard_bees") {
    // Fruit Orchard Trees & Golden Beehives
    const trees = [
      [x + 55, y + 60],
      [x + 165, y + 60],
      [x + 55, y + 190],
      [x + 165, y + 190],
    ];
    trees.forEach(([tx, ty]) => {
      drawIsoBox(tx + 12, ty + 12, 12, 12, 2, 18, "#78350f", "#451a03", "#290f02");
      drawIsoBox(tx, ty, 36, 36, 20, 24, "#4ade80", "#16a34a", "#15803d");
    });
    // Beehives
    drawIsoBox(x + 110, y + 290, 28, 28, 2, 18, "#facc15", "#eab308", "#ca8a04");
  } else if (propType === "barn_pantry") {
    // Cozy Farmhouse Pantry Counter & Break Tables
    drawIsoBox(x + 25, y + 35, 90, 28, 2, 16, "#f43f5e", "#e11d48", "#be123c");
    drawIsoBox(x + 35, y + 120, 70, 50, 2, 12, "#cbd5e1", "#94a3b8", "#64748b");
    drawIsoBox(x + 35, y + 220, 70, 50, 2, 12, "#38bdf8", "#0284c7", "#0369a1");
  }
}

// ============================================================================
// Chibi Voxel / Sprite Character Renderer + Floating Name Tag
// ============================================================================
function drawChibiAgent(agent, t) {
  const isSelected = agent.id === worldState.selectedAgentId;
  const isMoving = Math.hypot(agent.tx - agent.x, agent.ty - agent.y) > 2;
  const bounce = isMoving
    ? Math.abs(Math.sin(t * 10 + agent.x)) * 7
    : Math.abs(Math.sin(t * 3.2 + agent.x)) * 3.5;

  const basePt = projectPoint(agent.x, agent.y, 2);

  // 1. Selection Ring / Shadow under feet
  ctx.save();
  if (isSelected) {
    const pulse = 18 + Math.sin(t * 5) * 3;
    ctx.beginPath();
    ctx.ellipse(basePt.x, basePt.y, pulse * worldState.zoom, pulse * 0.55 * worldState.zoom, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.fillStyle = "rgba(34, 211, 238, 0.18)";
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(basePt.x, basePt.y, 11 * worldState.zoom, 6 * worldState.zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.fill();
  }
  ctx.restore();

  // 2. 3D Chibi Body, Head & Builder/Farmer Hat
  const bodyW = 18;
  const bodyH = 18;
  drawIsoBox(
    agent.x - bodyW / 2,
    agent.y - bodyH / 2,
    bodyW,
    bodyH,
    3 + bounce,
    14,
    agent.bodyColor,
    agent.bodyColor,
    "#1e293b"
  );

  // Chibi Head
  drawIsoBox(
    agent.x - 10,
    agent.y - 10,
    20,
    20,
    17 + bounce,
    13,
    "#fde68a",
    "#fcd34d",
    "#f59e0b"
  );

  // Chibi Hat (Hardhat for House Crew / Straw Hat for Farm Crew)
  drawIsoBox(
    agent.x - 12,
    agent.y - 12,
    24,
    24,
    30 + bounce,
    5,
    agent.hatColor,
    agent.hatColor,
    "#0f172a"
  );

  // 3. Floating Name Pill & Tool Badge above head (matching video style)
  const tagPt = projectPoint(agent.x, agent.y, 44 + bounce);
  const label = `${agent.name}`;
  ctx.font = "700 10.5px Inter, sans-serif";
  const textW = ctx.measureText(label).width;
  const pillW = textW + 28;
  const pillH = 20;
  const px = tagPt.x - pillW / 2;
  const py = tagPt.y - pillH;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py, pillW, pillH, 6);
  ctx.fillStyle = isSelected ? "rgba(6, 182, 212, 0.95)" : "rgba(11, 16, 29, 0.88)";
  ctx.fill();
  ctx.strokeStyle = isSelected ? "#fff" : "rgba(148, 163, 184, 0.35)";
  ctx.lineWidth = isSelected ? 1.5 : 1;
  ctx.stroke();

  // Status dot inside pill
  ctx.beginPath();
  ctx.arc(px + 9, py + pillH / 2, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = isSelected ? "#04131a" : "#10b981";
  ctx.fill();

  // Agent Name
  ctx.fillStyle = isSelected ? "#04131a" : "#f8fafc";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, px + 16, py + pillH / 2);

  // Swinging Tool Emoji next to Chibi
  ctx.font = "13px sans-serif";
  ctx.fillText(agent.tool, tagPt.x + pillW / 2 + 3, py + pillH / 2 + Math.sin(t * 6) * 2);
  ctx.restore();

  // Register clickable hitbox
  worldState.screenHitBoxes.push({
    agentId: agent.id,
    x1: px - 10,
    y1: py - 6,
    x2: px + pillW + 16,
    y2: basePt.y + 10,
  });
}

// ============================================================================
// Main Render Loop
// ============================================================================
function updatePhysicsAndCamera(dt) {
  worldState.time += dt;

  // Smooth camera interpolation
  worldState.camX += (worldState.targetCamX - worldState.camX) * 0.12;
  worldState.camY += (worldState.targetCamY - worldState.camY) * 0.12;
  worldState.zoom += (worldState.targetZoom - worldState.zoom) * 0.12;
  worldState.yaw += (worldState.targetYaw - worldState.yaw) * 0.14;
  worldState.pitch += (worldState.targetPitch - worldState.pitch) * 0.14;

  // Move Chibi Agents toward their target coordinates (plus gentle autonomous wandering inside their room)
  CHIBI_AGENTS.forEach((ag, idx) => {
    const dx = ag.tx - ag.x;
    const dy = ag.ty - ag.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1.5) {
      const speed = 95 * dt;
      ag.x += (dx / dist) * Math.min(dist, speed);
      ag.y += (dy / dist) * Math.min(dist, speed);
    } else if (Math.random() < 0.006) {
      // Subtle patrol movement around their station
      const room = ROOM_ZONES.find((r) => r.id === ag.homeRoom) || ROOM_ZONES[0];
      ag.tx = room.x + 40 + Math.random() * (room.w - 80);
      ag.ty = room.y + 40 + Math.random() * (room.h - 80);
    }
  });
}

function renderWorld() {
  const rect = canvas.parentElement.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  worldState.screenHitBoxes = [];

  // 1. Draw Outer Base Platform
  drawIsoBox(-440, -380, 880, 780, -14, 14, "#1e293b", "#0f172a", "#090d16", "#334155");

  // 2. Sort & Draw Rooms + Walls + Room Props
  ROOM_ZONES.forEach((room) => {
    // Room Floor Tile
    drawIsoBox(
      room.x,
      room.y,
      room.w,
      room.h,
      0,
      3,
      room.floorTop,
      room.floorColor,
      room.floorColor,
      "rgba(255,255,255,0.18)"
    );

    // Low Isometric Partition Walls around each room
    const wallH = worldState.viewMode === "3D" ? 16 : 24;
    drawIsoBox(room.x, room.y, room.w, 6, 3, wallH, "#f1f5f9", "#cbd5e1", "#94a3b8");
    drawIsoBox(room.x, room.y, 6, room.h, 3, wallH, "#f1f5f9", "#cbd5e1", "#94a3b8");

    // Room Props (House framing, crops, spinning windmill, hologram core)
    drawRoomProps(room, worldState.time);
  });

  // 3. Depth-sort Chibi Agents by projected depth so front agents overlap cleanly
  const sortedAgents = [...CHIBI_AGENTS].sort((a, b) => {
    const pa = projectPoint(a.x, a.y, 0);
    const pb = projectPoint(b.x, b.y, 0);
    return pa.depth - pb.depth;
  });

  sortedAgents.forEach((ag) => drawChibiAgent(ag, worldState.time));
}

let lastFrame = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  updatePhysicsAndCamera(dt);
  renderWorld();
  requestAnimationFrame(loop);
}

// ============================================================================
// Canvas Mouse Interaction: Click Agent, Drag Pan / 3D Orbit, Scroll Zoom
// ============================================================================
canvas.addEventListener("mousedown", (e) => {
  worldState.isDragging = true;
  worldState.dragMoved = false;
  worldState.dragStartX = e.clientX;
  worldState.dragStartY = e.clientY;
});

window.addEventListener("mousemove", (e) => {
  if (!worldState.isDragging) return;
  const dx = e.clientX - worldState.dragStartX;
  const dy = e.clientY - worldState.dragStartY;
  if (Math.hypot(dx, dy) > 4) worldState.dragMoved = true;

  worldState.dragStartX = e.clientX;
  worldState.dragStartY = e.clientY;

  if (worldState.viewMode === "3D") {
    // 3D WebGL Orbit Camera: rotate yaw and tilt pitch!
    worldState.targetYaw += dx * 0.0065;
    worldState.targetPitch = Math.max(0.2, Math.min(0.88, worldState.targetPitch + dy * 0.004));
  } else {
    // 2D Isometric Pan
    const cosY = Math.cos(-worldState.yaw);
    const sinY = Math.sin(-worldState.yaw);
    const scaledDx = -dx / worldState.zoom;
    const scaledDy = -dy / (worldState.zoom * worldState.pitch);
    worldState.targetCamX += scaledDx * cosY - scaledDy * sinY;
    worldState.targetCamY += scaledDx * sinY + scaledDy * cosY;
  }
});

window.addEventListener("mouseup", (e) => {
  if (!worldState.isDragging) return;
  worldState.isDragging = false;

  if (!worldState.dragMoved) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (let i = worldState.screenHitBoxes.length - 1; i >= 0; i--) {
      const box = worldState.screenHitBoxes[i];
      if (mx >= box.x1 && mx <= box.x2 && my >= box.y1 && my <= box.y2) {
        selectAgentById(box.agentId, true);
        break;
      }
    }
  }
});

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.9;
    worldState.targetZoom = Math.max(0.45, Math.min(2.4, worldState.targetZoom * factor));
  },
  { passive: false }
);

// ============================================================================
// Inspector, Zone Filter & Direct Override Routing
// ============================================================================
function selectAgentById(agentId, focusCamera = false) {
  const ag = CHIBI_AGENTS.find((a) => a.id === agentId) || CHIBI_AGENTS[0];
  worldState.selectedAgentId = ag.id;

  document.getElementById("inspAvatar").textContent = ag.icon;
  document.getElementById("inspName").textContent = ag.name;
  document.getElementById("inspRole").textContent = ag.role;
  document.getElementById("inspDomainBadge").textContent = ag.domain;
  document.getElementById("inspCurrentTask").textContent = ag.task;
  document.getElementById("inspActiveStation").textContent = ag.station;
  document.getElementById("inspMonthlyTrend").textContent = ag.trend;
  document.getElementById("inspProgressPct").textContent = `${ag.progress}%`;
  document.getElementById("inspProgressBar").style.width = `${ag.progress}%`;
  document.getElementById("directiveInput").placeholder = `Directive for ${ag.name}...`;

  const stateLabels = {
    HOUSE_BUILD: "🏡 House Build",
    FARM_HARVEST: "🌾 Farm Harvest",
    TREND_NEXUS: "📈 Trend Learning",
    BARN_REST: "☕ Barn Break",
  };
  document.getElementById("inspStatePill").textContent =
    stateLabels[ag.currentZone] || "🏡 House Build";

  document.querySelectorAll(".override-btn").forEach((btn) => {
    const z = btn.getAttribute("data-target-zone");
    const isMatch = z === ag.currentZone;
    btn.classList.toggle("active", isMatch);
  });

  if (focusCamera) {
    worldState.targetCamX = ag.x;
    worldState.targetCamY = ag.y;
    worldState.targetZoom = Math.max(worldState.targetZoom, 1.35);
  }
}

function routeAgentToZone(agent, targetZoneGroup) {
  agent.currentZone = targetZoneGroup;
  const candidateRooms = ROOM_ZONES.filter((r) => r.group === targetZoneGroup);
  const targetRoom = candidateRooms[0] || ROOM_ZONES[0];
  agent.homeRoom = targetRoom.id;
  agent.tx = targetRoom.x + 45 + Math.random() * (targetRoom.w - 90);
  agent.ty = targetRoom.y + 45 + Math.random() * (targetRoom.h - 90);

  if (targetZoneGroup === "HOUSE_BUILD") {
    agent.task = "Framing house timber & optimizing Supabase RLS";
  } else if (targetZoneGroup === "FARM_HARVEST") {
    agent.task = "Harvesting farm crops & tuning 60FPS game loop";
  } else if (targetZoneGroup === "TREND_NEXUS") {
    agent.task = "Learning strictly from monthly industry trends (2026-11)";
  } else if (targetZoneGroup === "BARN_REST") {
    agent.task = "Active recovery break in Farmhouse Pantry & Gym";
  }

  selectAgentById(agent.id, false);
  pushTelemetryEvent(
    "ROUTE_OVERRIDE",
    `${agent.name} routed to [${targetZoneGroup}] — "${agent.task}".`,
    targetZoneGroup === "FARM_HARVEST" ? "emerald" : "cyan"
  );
}

document.querySelectorAll(".override-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const ag = CHIBI_AGENTS.find((a) => a.id === worldState.selectedAgentId);
    if (!ag) return;
    routeAgentToZone(ag, btn.getAttribute("data-target-zone"));
  });
});

// Topbar Zone Filter Buttons
document.querySelectorAll(".zone-pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".zone-pill").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const zone = btn.getAttribute("data-zone");
    worldState.activeZoneFilter = zone;
    document.getElementById("hudZoneBadge").textContent = zone;

    const preset = ZONE_CAMERA_PRESETS[zone] || ZONE_CAMERA_PRESETS.OVERVIEW;
    worldState.targetCamX = preset.x;
    worldState.targetCamY = preset.y;
    worldState.targetZoom = preset.zoom;
  });
});

// 2D ISO vs 3D WEBGL View Mode Toggle
document.getElementById("btn2dIso").addEventListener("click", () => {
  worldState.viewMode = "2D";
  document.getElementById("btn2dIso").classList.add("active");
  document.getElementById("btn3dWebgl").classList.remove("active");
  document.getElementById("hudModeLabel").textContent = "VIEWPORT (2D ISO)";
  worldState.targetYaw = -Math.PI / 4;
  worldState.targetPitch = 0.56;
});

document.getElementById("btn3dWebgl").addEventListener("click", () => {
  worldState.viewMode = "3D";
  document.getElementById("btn3dWebgl").classList.add("active");
  document.getElementById("btn2dIso").classList.remove("active");
  document.getElementById("hudModeLabel").textContent = "VIEWPORT (3D WEBGL)";
  worldState.targetYaw = -0.52;
  worldState.targetPitch = 0.34;
});

document.getElementById("resetCameraBtn").addEventListener("click", () => {
  worldState.targetCamX = 0;
  worldState.targetCamY = 0;
  worldState.targetZoom = 0.88;
  worldState.targetYaw = worldState.viewMode === "3D" ? -0.52 : -Math.PI / 4;
  worldState.targetPitch = worldState.viewMode === "3D" ? 0.34 : 0.56;
  document.getElementById("hudZoneBadge").textContent = "OVERVIEW";
});

// ============================================================================
// Live Telemetry Feed & Backend API Dispatch
// ============================================================================
function pushTelemetryEvent(tag, message, colorClass = "emerald", fullOutput = null) {
  worldState.telemetryCount += 1;
  document.getElementById("telemetryCountLabel").textContent = `${worldState.telemetryCount} EVENTS`;

  const feed = document.getElementById("telemetryFeed");
  const nowStr = new Date().toLocaleTimeString("en-US", { hour12: true });
  const item = document.createElement("div");
  item.className = `telemetry-item ${colorClass}`;
  item.textContent = `${nowStr} [${tag}] ${message}`;

  if (fullOutput) {
    item.title = "Click to inspect full specialist output";
    item.addEventListener("click", () => showAgentOutputOverlay(tag, fullOutput));
  }

  feed.prepend(item);
  while (feed.children.length > 50) {
    feed.removeChild(feed.lastChild);
  }
}

function showAgentOutputOverlay(title, content) {
  const box = document.getElementById("agentOutputOverlay");
  document.getElementById("outputOverlayTitle").textContent = `⚡ ${title}`;
  document.getElementById("outputOverlayBody").textContent = content;
  box.classList.remove("hidden");
}

document.getElementById("closeOutputOverlayBtn").addEventListener("click", () => {
  document.getElementById("agentOutputOverlay").classList.add("hidden");
});

document.getElementById("copyOutputBtn").addEventListener("click", () => {
  const text = document.getElementById("outputOverlayBody").textContent;
  navigator.clipboard.writeText(text);
  document.getElementById("copyOutputBtn").textContent = "Copied!";
  setTimeout(() => (document.getElementById("copyOutputBtn").textContent = "Copy"), 1500);
});

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const resp = await fetch(path, { ...options, headers });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

// Dispatch Directive -> Calls /api/v1/chat and animates Chibi Agents
document.getElementById("directiveForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("directiveInput");
  const directive = input.value.trim();
  if (!directive) return;

  const selectedAg = CHIBI_AGENTS.find((a) => a.id === worldState.selectedAgentId) || CHIBI_AGENTS[0];
  const btn = document.getElementById("dispatchBtn");
  btn.disabled = true;
  btn.textContent = "Routing...";
  input.value = "";

  selectedAg.task = `Executing: "${directive.slice(0, 42)}..."`;
  selectedAg.progress = 35;
  selectAgentById(selectedAg.id, false);

  pushTelemetryEvent(
    "DIRECTIVE_DISPATCH",
    `${selectedAg.name} received directive: "${directive}"`,
    "cyan"
  );

  try {
    const res = await apiFetch("/api/v1/chat", {
      method: "POST",
      body: JSON.stringify({
        message: directive,
        specialist_id: selectedAg.apiId,
        user_id: "hq_commander",
        enable_tools: true,
        enable_rag: true,
        enable_memory: true,
      }),
    });

    selectedAg.progress = 100;
    selectedAg.task = `Completed (${res.latency_ms}ms): ${directive.slice(0, 34)}`;
    if (res.monthly_trends_applied && res.monthly_trends_applied.length) {
      selectedAg.trend = res.monthly_trends_applied[0].trend_title;
    }
    selectAgentById(selectedAg.id, false);

    // Log tool calls
    (res.tool_calls || []).forEach((tc) => {
      pushTelemetryEvent(
        `TOOL:${tc.tool_name.toUpperCase()}`,
        `${selectedAg.name} executed ${tc.tool_name} in ${tc.duration_ms}ms`,
        "purple",
        tc.output
      );
    });

    // Log reply & show output overlay
    pushTelemetryEvent(
      "AGENT_DELIVERABLE",
      `${selectedAg.name} -> "${res.reply.replace(/\s+/g, " ").slice(0, 110)}..." (Click to view full output)`,
      "emerald",
      res.reply
    );

    showAgentOutputOverlay(`${selectedAg.name} — Deliverable (${res.provider})`, res.reply);
  } catch (err) {
    pushTelemetryEvent("ERROR", `Directive failed: ${err.message}`, "amber");
  } finally {
    btn.disabled = false;
    btn.textContent = "Dispatch Directive";
  }
});

// ============================================================================
// Studio & DB Modal (Trends, Memories, RAG, LLM Config)
// ============================================================================
document.getElementById("openStudioModalBtn").addEventListener("click", () => {
  document.getElementById("studioModalBackdrop").classList.remove("hidden");
  loadModalData();
});

document.getElementById("closeStudioModalBtn").addEventListener("click", () => {
  document.getElementById("studioModalBackdrop").classList.add("hidden");
});

document.querySelectorAll(".s-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".s-tab").forEach((t) => t.classList.remove("active"));
    document.querySelectorAll(".stab-pane").forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`stab-${tab.getAttribute("data-stab")}`).classList.add("active");
  });
});

async function loadModalData() {
  try {
    const [trendsData, memData, docData, cfgData] = await Promise.all([
      apiFetch("/api/v1/trends"),
      apiFetch("/api/v1/memories"),
      apiFetch("/api/v1/knowledge"),
      apiFetch("/api/v1/config"),
    ]);

    worldState.trends = trendsData.trends || [];
    document.getElementById("trendCountPill").textContent = `${worldState.trends.length} TRENDS`;
    document.getElementById("trendCycleText").textContent =
      `TRENDS: ${trendsData.current_month} (STRICTLY TRENDS)`;

    document.getElementById("trendsList").innerHTML = worldState.trends
      .map(
        (t) => `
        <div class="modal-card">
          <strong>[${t.month_key} · ${t.domain.toUpperCase()} · 🔥 ${t.momentum_score}%] ${t.trend_title}</strong>
          <div style="color:#94a3b8; margin-top:4px;">${t.trend_summary}</div>
        </div>`
      )
      .join("");

    document.getElementById("memoriesList").innerHTML = (memData.memories || [])
      .map(
        (m) => `
        <div class="modal-card">
          <strong>[${m.category.toUpperCase()}]</strong> ${m.content}
        </div>`
      )
      .join("");

    document.getElementById("documentsList").innerHTML = (docData.documents || [])
      .map(
        (d) => `
        <div class="modal-card">
          <strong>${d.title}</strong> (${d.chunk_count} chunks · <code>${d.source}</code>)
        </div>`
      )
      .join("");

    document.getElementById("cfgProvider").value = cfgData.llm_provider || "auto";
    document.getElementById("cfgOpenaiModel").value = cfgData.openai_model || "";
    document.getElementById("cfgGeminiModel").value = cfgData.gemini_model || "";
    document.getElementById("cfgAnthropicModel").value = cfgData.anthropic_model || "";
  } catch (e) {
    // ignore offline error
  }
}

document.getElementById("addTrendForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("trendTitle").value.trim();
  await apiFetch("/api/v1/trends", {
    method: "POST",
    body: JSON.stringify({
      agent_id: document.getElementById("trendAgentId").value,
      domain: document.getElementById("trendDomain").value,
      trend_title: title,
      trend_summary: document.getElementById("trendSummary").value.trim(),
      trend_tags: ["monthly-trend", "strictly-trends"],
      momentum_score: 95,
    }),
  });
  document.getElementById("trendTitle").value = "";
  document.getElementById("trendSummary").value = "";
  pushTelemetryEvent("TREND_PULSE", `New monthly trend learned: "${title}"`, "purple");
  await loadModalData();
});

document.getElementById("syncMonthlyTrendsBtn").addEventListener("click", async () => {
  const res = await apiFetch("/api/v1/trends/sync", { method: "POST" });
  pushTelemetryEvent(
    "TREND_SYNC",
    `Synced ${res.total_trends_for_month} monthly trends for cycle ${res.month_key} (Strictly Trends).`,
    "cyan"
  );
  await loadModalData();
});

document.getElementById("addMemoryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = document.getElementById("memContent").value.trim();
  await apiFetch("/api/v1/memories", {
    method: "POST",
    body: JSON.stringify({
      user_id: "hq_commander",
      category: document.getElementById("memCategory").value,
      content,
      importance: 4,
    }),
  });
  document.getElementById("memContent").value = "";
  pushTelemetryEvent("MEMORY_STORE", `Stored long-term memory: "${content}"`, "emerald");
  await loadModalData();
});

document.getElementById("ingestDocForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("docTitle").value.trim();
  await apiFetch("/api/v1/knowledge", {
    method: "POST",
    body: JSON.stringify({
      title,
      content: document.getElementById("docContent").value.trim(),
      source: "hq://manual",
      tags: ["hq", "rag"],
    }),
  });
  document.getElementById("docTitle").value = "";
  document.getElementById("docContent").value = "";
  pushTelemetryEvent("RAG_INGEST", `Indexed RAG knowledge document: "${title}"`, "cyan");
  await loadModalData();
});

document.getElementById("runtimeConfigForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const res = await apiFetch("/api/v1/config", {
    method: "POST",
    body: JSON.stringify({
      llm_provider: document.getElementById("cfgProvider").value,
      openai_api_key: document.getElementById("cfgOpenaiKey").value,
      openai_model: document.getElementById("cfgOpenaiModel").value,
      gemini_api_key: document.getElementById("cfgGeminiKey").value,
      gemini_model: document.getElementById("cfgGeminiModel").value,
      anthropic_api_key: document.getElementById("cfgAnthropicKey").value,
      anthropic_model: document.getElementById("cfgAnthropicModel").value,
    }),
  });
  document.getElementById("configSaveNotice").textContent =
    `✓ Active Provider: ${res.active_provider.toUpperCase()} (${res.active_model})`;
  pushTelemetryEvent("LLM_CONFIG", `Switched active provider to ${res.active_provider} (${res.active_model})`, "amber");
});

// ============================================================================
// Live Clock, Ambient Chibi Telemetry Ticker & Boot
// ============================================================================
function updateClock() {
  const now = new Date();
  document.getElementById("hqClock").textContent = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
setInterval(updateClock, 1000);
updateClock();

// Ambient live telemetry simulation (House build, Farm harvest, Postgres RLS audit & Monthly Trends)
const AMBIENT_LOGS = [
  ["SUPABASE_RLS", "Volt (Josiah) -> Verified (SELECT auth.uid()) InitPlan caching across sessions, memories, and monthly_trend_learnings.", "emerald"],
  ["HOUSE_BUILD", "Milo (Christian) -> Raised oak roof rafters & synced Next.js + FastAPI Web App blueprint with zero latency.", "cyan"],
  ["FARM_HARVEST", "Pip (Mary Grace) -> Harvested golden wheat plot & balanced RPG progression curve in farm_crops.", "emerald"],
  ["ENGINE_60FPS", "Torque (Rey Jhon) -> Synchronized 3D WebGL windmill physics & fixed-timestep HTML5 Canvas loop at 60.0 FPS.", "purple"],
  ["TREND_PULSE", "Julian (Sprout) -> Learned monthly trend [2026-11]: Covering INCLUDE indexes & HNSW hybrid RAG (Strictly Trends).", "cyan"],
  ["SCOPE_AUDIT", "Bramble (Gian) -> Passed automated perimeter fence & foreign-key index audit across 8 Supabase tables.", "emerald"],
];

let ambientIdx = 0;
setInterval(() => {
  const [tag, msg, col] = AMBIENT_LOGS[ambientIdx % AMBIENT_LOGS.length];
  pushTelemetryEvent(tag, msg, col);
  document.getElementById("bossTrendTicker").textContent = `📈 ${msg}`;
  ambientIdx += 1;
}, 4500);

(async function initHQ() {
  resizeCanvas();
  selectAgentById("backend_supabase_agent", false);
  AMBIENT_LOGS.slice(0, 4).forEach(([tag, msg, col]) => pushTelemetryEvent(tag, msg, col));
  await loadModalData();
  requestAnimationFrame(loop);
})();
