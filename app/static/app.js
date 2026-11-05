// ============================================================================
// BRAIN HOMESTEAD // Original 2D Isometric & 3D Orbit House & Farm Diorama
// Full Custom Chibi Creator + Monthly Trend Learning (Strictly Trends)
// ============================================================================

const HOMESTEAD_PLOTS = [
  {
    id: "HOUSE_FOUNDATION",
    group: "HOUSE_SITE",
    label: "🏡 HOMESTEAD HOUSE CONSTRUCTION",
    x: -410,
    y: -330,
    w: 360,
    h: 310,
    groundTop: "#78350f",
    groundSide: "#451a03",
    borderCol: "#f59e0b",
    propType: "homestead_house",
  },
  {
    id: "HOUSE_UTILITY",
    group: "HOUSE_SITE",
    label: "⚡ SOLAR & POSTGRES WATERWORKS",
    x: -410,
    y: 10,
    w: 240,
    h: 310,
    groundTop: "#334155",
    groundSide: "#1e293b",
    borderCol: "#10b981",
    propType: "waterworks_solar",
  },
  {
    id: "TREND_SUNDIAL",
    group: "TREND_WELL",
    label: "🧭 MONTHLY TREND SUNDIAL PLAZA",
    x: -140,
    y: -110,
    w: 260,
    h: 230,
    groundTop: "#1e293b",
    groundSide: "#0f172a",
    borderCol: "#38bdf8",
    propType: "trend_well",
  },
  {
    id: "FARM_WHEAT",
    group: "FARM_FIELDS",
    label: "🌾 GOLDEN WHEAT & PUMPKIN PATCH",
    x: -20,
    y: -330,
    w: 430,
    h: 200,
    groundTop: "#15803d",
    groundSide: "#14532d",
    borderCol: "#84cc16",
    propType: "wheat_pumpkin_field",
  },
  {
    id: "FARM_WINDMILL",
    group: "FARM_FIELDS",
    label: "⚙️ WINDMILL & BARN WORKSHOP",
    x: 145,
    y: -110,
    w: 265,
    h: 220,
    groundTop: "#166534",
    groundSide: "#052e16",
    borderCol: "#facc15",
    propType: "windmill_barn",
  },
  {
    id: "FARM_ORCHARD",
    group: "FARM_FIELDS",
    label: "🍯 APPLE ORCHARD & HONEYBEE MEADOW",
    x: 145,
    y: 135,
    w: 265,
    h: 185,
    groundTop: "#16a34a",
    groundSide: "#14532d",
    borderCol: "#4ade80",
    propType: "apple_orchard",
  },
  {
    id: "CAMPFIRE_GROVE",
    group: "CAMPFIRE",
    label: "🔥 COZY CAMPFIRE & CIDER REST",
    x: -140,
    y: 145,
    w: 260,
    h: 175,
    groundTop: "#065f46",
    groundSide: "#022c22",
    borderCol: "#fb923c",
    propType: "campfire_logs",
  },
];

const ZONE_CAMERA_PRESETS = {
  VILLAGE_ALL: { x: 0, y: 0, zoom: 0.88 },
  HOUSE_SITE: { x: -250, y: -90, zoom: 1.28 },
  FARM_FIELDS: { x: 220, y: -60, zoom: 1.22 },
  TREND_WELL: { x: -10, y: 5, zoom: 1.58 },
  CAMPFIRE: { x: -10, y: 230, zoom: 1.55 },
};

const worldState = {
  viewMode: "2D",
  activeZoneFilter: "VILLAGE_ALL",
  selectedAgentId: "webapp_architect",
  chibiAgents: [],
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
  houseProgress: 72,
  farmProgress: 84,
};

// Load saved Chibi customizations from localStorage
function getSavedCustomizations() {
  try {
    return JSON.parse(localStorage.getItem("brain_chibi_overrides") || "{}");
  } catch {
    return {};
  }
}

function saveCustomizations(map) {
  localStorage.setItem("brain_chibi_overrides", JSON.stringify(map));
}

function mapSpecialistToChibiActor(sp, index) {
  const overrides = getSavedCustomizations()[sp.id] || {};
  const c = sp.chibi || {};
  const rawZone = overrides.currentZone || (c.zone === "farm" ? "FARM_FIELDS" : sp.id === "auto_router" ? "TREND_WELL" : "HOUSE_SITE");

  // Assign default plot based on domain/id
  let homePlotId = "HOUSE_FOUNDATION";
  if (rawZone === "TREND_WELL") homePlotId = "TREND_SUNDIAL";
  else if (rawZone === "CAMPFIRE") homePlotId = "CAMPFIRE_GROVE";
  else if (rawZone === "FARM_FIELDS") {
    if (sp.id.includes("engine")) homePlotId = "FARM_WINDMILL";
    else if (sp.id.includes("world") || sp.id.includes("qa")) homePlotId = "FARM_ORCHARD";
    else homePlotId = "FARM_WHEAT";
  } else {
    if (sp.id.includes("supabase") || sp.id.includes("backend")) homePlotId = "HOUSE_UTILITY";
    else homePlotId = "HOUSE_FOUNDATION";
  }

  const plot = HOMESTEAD_PLOTS.find((p) => p.id === homePlotId) || HOMESTEAD_PLOTS[0];
  const seedAngle = (index * 1.7) % (Math.PI * 2);
  const startX = plot.x + plot.w / 2 + Math.cos(seedAngle) * Math.min(75, plot.w * 0.28);
  const startY = plot.y + plot.h / 2 + Math.sin(seedAngle) * Math.min(65, plot.h * 0.28);

  return {
    id: sp.id,
    apiId: sp.id,
    name: overrides.name || c.chibi_name || sp.name,
    role: overrides.role || sp.role,
    domain: `${rawZone.replace("_", " ")} // ${sp.domain.toUpperCase()}`,
    rawDomain: sp.domain,
    icon: sp.icon || "🤖",
    tool: overrides.tool || c.tool_emoji || "🔨",
    hatColor: overrides.hatColor || c.hat_color || "#f59e0b",
    bodyColor: overrides.bodyColor || c.outfit_color || "#2563eb",
    homePlot: homePlotId,
    currentZone: rawZone,
    x: startX,
    y: startY,
    tx: startX,
    ty: startY,
    task: overrides.chore || c.work_action || c.idle_action || sp.description,
    station: c.station || sp.name,
    trend: "Monthly Trend Learning (Strictly Trends)",
    progress: 75 + ((index * 7) % 24),
    keywords: sp.keywords || [],
    systemPrompt: sp.system_prompt || "",
    custom: Boolean(sp.custom),
  };
}

// ============================================================================
// Canvas Setup & 2D Isometric / 3D Orbit Projection
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

  drawPolygon([b3, b2, t2, t3], leftColor, strokeColor, 0.7);
  drawPolygon([b1, b2, t2, t1], rightColor, strokeColor, 0.7);
  drawPolygon([b0, b3, t3, t0], leftColor, strokeColor, 0.7);
  drawPolygon([b0, b1, t1, t0], rightColor, strokeColor, 0.7);
  drawPolygon([t0, t1, t2, t3], topColor, strokeColor, 0.9);
}

// ============================================================================
// Homestead House, Farm Crops, Windmill, Orchard & Campfire Prop Renderer
// ============================================================================
function drawPlotProps(plot, t) {
  const { x, y, w, h, propType } = plot;

  if (propType === "homestead_house") {
    // 1. Stone Cobblestone Foundation Slab
    const hx = x + 65;
    const hy = y + 55;
    const hw = 185;
    const hh = 135;
    drawIsoBox(hx, hy, hw, hh, 3, 10, "#94a3b8", "#64748b", "#475569", "#cbd5e1");

    // 2. Half-Built Timber & Cottage Walls
    drawIsoBox(hx + 8, hy + 8, hw - 16, 12, 13, 42, "#fef3c7", "#fde68a", "#f59e0b");
    drawIsoBox(hx + 8, hy + 8, 12, hh - 16, 13, 42, "#fef3c7", "#fde68a", "#f59e0b");
    drawIsoBox(hx + hw - 20, hy + 8, 12, hh - 16, 13, 30, "#f472b6", "#ec4899", "#db2777");

    // 3. Oak Timber Corner Pillars & Roof Rafters
    drawIsoBox(hx + 6, hy + 6, 14, 14, 13, 52, "#b45309", "#92400e", "#78350f");
    drawIsoBox(hx + hw - 20, hy + 6, 14, 14, 13, 52, "#b45309", "#92400e", "#78350f");
    drawIsoBox(hx + 6, hy + hh - 20, 14, 14, 13, 52, "#b45309", "#92400e", "#78350f");
    drawIsoBox(hx + hw - 20, hy + hh - 20, 14, 14, 13, 52, "#b45309", "#92400e", "#78350f");

    // Roof Ridge Beam & Rafters
    drawIsoBox(hx + 4, hy + hh / 2 - 6, hw - 8, 12, 65, 8, "#f59e0b", "#d97706", "#b45309");
    for (let r = 0; r < 4; r++) {
      drawIsoBox(hx + 22 + r * 44, hy + 6, 8, hh - 12, 56, 6, "#fbbf24", "#d97706", "#92400e");
    }

    // Brick Chimney with gentle smoke puffs
    drawIsoBox(hx + hw - 38, hy + 14, 22, 22, 13, 66, "#dc2626", "#b91c1c", "#7f1d1d");
    const smokePt = projectPoint(hx + hw - 27, hy + 25, 85 + ((t * 18) % 24));
    ctx.beginPath();
    ctx.arc(smokePt.x, smokePt.y, 6 * worldState.zoom, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(226, 232, 240, 0.35)";
    ctx.fill();

    // Lumber Stack & Architect Blueprint Table outside house
    drawIsoBox(x + 25, y + 220, 75, 32, 3, 12, "#d97706", "#b45309", "#78350f");
    drawIsoBox(x + 265, y + 215, 68, 42, 3, 16, "#38bdf8", "#0284c7", "#0369a1");
  } else if (propType === "waterworks_solar") {
    // Supabase Postgres Water Tower & Solar Panels powering the House
    drawIsoBox(x + 40, y + 40, 68, 68, 3, 46, "#10b981", "#059669", "#047857");
    drawIsoBox(x + 135, y + 45, 75, 50, 3, 14, "#0ea5e9", "#0284c7", "#0369a1");
    drawIsoBox(x + 135, y + 115, 75, 50, 3, 14, "#0ea5e9", "#0284c7", "#0369a1");
    // Copper Pipeline connecting toward house
    drawIsoBox(x + 65, y + 110, 16, 150, 3, 8, "#f97316", "#ea580c", "#c2410c");
  } else if (propType === "trend_well") {
    // Central Village Wishing Well & Monthly Trend Sundial
    const cx = x + w / 2;
    const cy = y + h / 2;
    drawIsoBox(cx - 28, cy - 28, 56, 56, 3, 22, "#38bdf8", "#0284c7", "#0369a1");

    // Rotating Sundial / Trend Rings
    const holoPt = projectPoint(cx, cy, 40 + Math.sin(t * 2) * 4);
    ctx.save();
    ctx.translate(holoPt.x, holoPt.y);
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate(t * (0.9 + i * 0.35) + i);
      ctx.beginPath();
      ctx.ellipse(0, 0, 36 * worldState.zoom, 14 * worldState.zoom, 0, 0, Math.PI * 2);
      ctx.strokeStyle = i === 0 ? "#38bdf8" : i === 1 ? "#facc15" : "#4ade80";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  } else if (propType === "wheat_pumpkin_field") {
    // 3 Plowed Soil Rows with Swaying Golden Wheat & Orange Pumpkins
    for (let row = 0; row < 3; row++) {
      const ry = y + 26 + row * 54;
      drawIsoBox(x + 30, ry, 360, 36, 3, 5, "#5c2d0c", "#3e1f08", "#291405");
      for (let col = 0; col < 8; col++) {
        const sway = Math.sin(t * 3.2 + col + row) * 3;
        const isPumpkin = row === 2 && col % 2 === 0;
        drawIsoBox(
          x + 44 + col * 42 + sway,
          ry + 9,
          16,
          16,
          8,
          isPumpkin ? 11 : 16,
          isPumpkin ? "#f97316" : "#facc15",
          isPumpkin ? "#ea580c" : "#eab308",
          "#854d0e"
        );
      }
    }
  } else if (propType === "windmill_barn") {
    // Red Farm Barn & Spinning Wooden Windmill
    drawIsoBox(x + 35, y + 40, 95, 75, 3, 40, "#ef4444", "#dc2626", "#991b1b");
    drawIsoBox(x + 30, y + 36, 105, 83, 43, 12, "#f8fafc", "#cbd5e1", "#94a3b8");

    // Windmill Tower
    const wx = x + 165;
    const wy = y + 60;
    drawIsoBox(wx, wy, 46, 46, 3, 58, "#fef08a", "#eab308", "#a16207");
    const hub = projectPoint(wx + 23, wy + 23, 54);
    ctx.save();
    ctx.translate(hub.x, hub.y);
    ctx.rotate(t * 1.9);
    ctx.strokeStyle = "#fef9c3";
    ctx.lineWidth = 3.2 * worldState.zoom;
    for (let b = 0; b < 4; b++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -36 * worldState.zoom);
      ctx.stroke();
    }
    ctx.restore();
  } else if (propType === "apple_orchard") {
    // Apple Trees & Golden Honeybee Hives
    const trees = [
      [x + 40, y + 35],
      [x + 175, y + 35],
      [x + 40, y + 115],
    ];
    trees.forEach(([tx, ty]) => {
      drawIsoBox(tx + 12, ty + 12, 12, 12, 3, 18, "#78350f", "#451a03", "#290f02");
      drawIsoBox(tx, ty, 36, 36, 21, 24, "#22c55e", "#16a34a", "#15803d");
      // Red apples on canopy
      drawIsoBox(tx + 8, ty + 8, 6, 6, 45, 4, "#ef4444", "#dc2626", "#991b1b");
    });
    // Golden Beehives
    drawIsoBox(x + 165, y + 120, 26, 26, 3, 18, "#facc15", "#eab308", "#a16207");
    drawIsoBox(x + 205, y + 120, 26, 26, 3, 18, "#facc15", "#eab308", "#a16207");
  } else if (propType === "campfire_logs") {
    // Cozy Campfire & Log Benches
    const fx = x + w / 2 - 14;
    const fy = y + h / 2 - 14;
    drawIsoBox(fx - 38, fy, 18, 34, 3, 8, "#92400e", "#78350f", "#451a03");
    drawIsoBox(fx + 48, fy, 18, 34, 3, 8, "#92400e", "#78350f", "#451a03");
    const flameH = 14 + Math.sin(t * 9) * 5;
    drawIsoBox(fx, fy, 28, 28, 3, flameH, "#fb923c", "#f97316", "#ea580c");
  }
}

// ============================================================================
// Chibi Character Renderer
// ============================================================================
function drawChibiAgent(agent, t) {
  const isSelected = agent.id === worldState.selectedAgentId;
  const isMoving = Math.hypot(agent.tx - agent.x, agent.ty - agent.y) > 2;
  const bounce = isMoving
    ? Math.abs(Math.sin(t * 10 + agent.x)) * 7
    : Math.abs(Math.sin(t * 3.4 + agent.x)) * 3.5;

  const basePt = projectPoint(agent.x, agent.y, 3);

  // Selection Aura
  ctx.save();
  if (isSelected) {
    const pulse = 19 + Math.sin(t * 5) * 3;
    ctx.beginPath();
    ctx.ellipse(basePt.x, basePt.y, pulse * worldState.zoom, pulse * 0.55 * worldState.zoom, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(250, 204, 21, 0.2)";
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.ellipse(basePt.x, basePt.y, 11 * worldState.zoom, 6 * worldState.zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.fill();
  }
  ctx.restore();

  // Chibi Overalls / Body
  drawIsoBox(
    agent.x - 9,
    agent.y - 9,
    18,
    18,
    3 + bounce,
    14,
    agent.bodyColor,
    agent.bodyColor,
    "#0f172a"
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

  // Chibi Hat (Builder Cap or Straw Farmer Hat)
  const hatBrim = agent.currentZone === "FARM_FIELDS" ? 14 : 12;
  drawIsoBox(
    agent.x - hatBrim,
    agent.y - hatBrim,
    hatBrim * 2,
    hatBrim * 2,
    30 + bounce,
    5,
    agent.hatColor,
    agent.hatColor,
    "#1e293b"
  );

  // Floating Name Pill & Tool Emoji
  const tagPt = projectPoint(agent.x, agent.y, 44 + bounce);
  const label = agent.name;
  ctx.font = "700 10.5px Inter, sans-serif";
  const textW = ctx.measureText(label).width;
  const pillW = textW + 28;
  const pillH = 20;
  const px = tagPt.x - pillW / 2;
  const py = tagPt.y - pillH;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py, pillW, pillH, 6);
  ctx.fillStyle = isSelected ? "#facc15" : "rgba(11, 16, 29, 0.88)";
  ctx.fill();
  ctx.strokeStyle = isSelected ? "#fff" : "rgba(148, 163, 184, 0.35)";
  ctx.lineWidth = isSelected ? 1.5 : 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(px + 9, py + pillH / 2, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = isSelected ? "#090d16" : "#10b981";
  ctx.fill();

  ctx.fillStyle = isSelected ? "#090d16" : "#f8fafc";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(label, px + 16, py + pillH / 2);

  // Swinging Tool
  ctx.font = "14px sans-serif";
  ctx.fillText(agent.tool, tagPt.x + pillW / 2 + 4, py + pillH / 2 + Math.sin(t * 6) * 2.5);
  ctx.restore();

  worldState.screenHitBoxes.push({
    agentId: agent.id,
    x1: px - 10,
    y1: py - 6,
    x2: px + pillW + 18,
    y2: basePt.y + 10,
  });
}

// ============================================================================
// Physics & Render Loop
// ============================================================================
function updateWorld(dt) {
  worldState.time += dt;
  worldState.camX += (worldState.targetCamX - worldState.camX) * 0.12;
  worldState.camY += (worldState.targetCamY - worldState.camY) * 0.12;
  worldState.zoom += (worldState.targetZoom - worldState.zoom) * 0.12;
  worldState.yaw += (worldState.targetYaw - worldState.yaw) * 0.14;
  worldState.pitch += (worldState.targetPitch - worldState.pitch) * 0.14;

  worldState.chibiAgents.forEach((ag) => {
    const dx = ag.tx - ag.x;
    const dy = ag.ty - ag.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 1.5) {
      const speed = 92 * dt;
      ag.x += (dx / dist) * Math.min(dist, speed);
      ag.y += (dy / dist) * Math.min(dist, speed);
    } else if (Math.random() < 0.007) {
      const plot = HOMESTEAD_PLOTS.find((p) => p.id === ag.homePlot) || HOMESTEAD_PLOTS[0];
      ag.tx = plot.x + 35 + Math.random() * (plot.w - 70);
      ag.ty = plot.y + 35 + Math.random() * (plot.h - 70);
    }
  });
}

function renderWorld() {
  const rect = canvas.parentElement.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  worldState.screenHitBoxes = [];

  // Lush Homestead Meadow Base Terrain
  drawIsoBox(-440, -360, 880, 710, -14, 14, "#14532d", "#052e16", "#022c22", "#166534");

  // Cobblestone pathways, grass tufts & wildflowers
  if (typeof drawTerrainDetails === "function") {
    drawTerrainDetails(ctx, projectPoint, worldState.zoom, worldState.time);
  }

  // Draw Each Homestead / Farm Plot & Graphic Assets
  HOMESTEAD_PLOTS.forEach((plot) => {
    drawIsoBox(
      plot.x,
      plot.y,
      plot.w,
      plot.h,
      0,
      3,
      plot.groundTop,
      plot.groundSide,
      plot.groundSide,
      plot.borderCol
    );
    // Wooden Homestead Fence Posts along plot top/left edges
    drawIsoBox(plot.x, plot.y, plot.w, 5, 3, 12, "#d97706", "#b45309", "#78350f");
    drawIsoBox(plot.x, plot.y, 5, plot.h, 3, 12, "#d97706", "#b45309", "#78350f");

    if (typeof drawDetailedPlotGraphics === "function") {
      drawDetailedPlotGraphics(ctx, projectPoint, drawIsoBox, plot, worldState.zoom, worldState.time);
    } else {
      drawPlotProps(plot, worldState.time);
    }
  });

  // Depth-sort Chibis and render with Illustrated Chibi Sprite Engine
  const sorted = [...worldState.chibiAgents].sort((a, b) => {
    return projectPoint(a.x, a.y, 0).depth - projectPoint(b.x, b.y, 0).depth;
  });
  sorted.forEach((ag) => {
    if (typeof drawIllustratedChibi === "function") {
      const hit = drawIllustratedChibi(
        ctx,
        projectPoint,
        ag,
        worldState.zoom,
        worldState.time,
        ag.id === worldState.selectedAgentId
      );
      if (hit) worldState.screenHitBoxes.push(hit);
    } else {
      drawChibiAgent(ag, worldState.time);
    }
  });
}

let lastTime = performance.now();
function animate(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  updateWorld(dt);
  renderWorld();
  requestAnimationFrame(animate);
}

// ============================================================================
// Mouse Pan / 3D Orbit / Click Chibi
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
    worldState.targetYaw += dx * 0.0065;
    worldState.targetPitch = Math.max(0.22, Math.min(0.88, worldState.targetPitch + dy * 0.004));
  } else {
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
      const b = worldState.screenHitBoxes[i];
      if (mx >= b.x1 && mx <= b.x2 && my >= b.y1 && my <= b.y2) {
        selectAgentById(b.agentId, true);
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
    worldState.targetZoom = Math.max(0.45, Math.min(2.3, worldState.targetZoom * factor));
  },
  { passive: false }
);

// ============================================================================
// Inspector, Worksite Assignment & Custom Chibi Creator / Editor
// ============================================================================
function selectAgentById(agentId, focusCamera = false) {
  const ag =
    worldState.chibiAgents.find((a) => a.id === agentId) || worldState.chibiAgents[0];
  if (!ag) return;
  worldState.selectedAgentId = ag.id;

  document.getElementById("inspAvatar").textContent = ag.tool;
  document.getElementById("inspName").textContent = ag.name;
  document.getElementById("inspRole").textContent = ag.role;
  document.getElementById("inspDomainBadge").textContent = ag.domain;
  document.getElementById("inspCurrentTask").textContent = ag.task;
  document.getElementById("inspActiveStation").textContent = ag.station;
  document.getElementById("inspMonthlyTrend").textContent = ag.trend;
  document.getElementById("inspProgressPct").textContent = `${ag.progress}%`;
  document.getElementById("inspProgressBar").style.width = `${ag.progress}%`;
  document.getElementById("directiveInput").placeholder = `Task for ${ag.name} (${ag.role})...`;

  const badgeLabels = {
    HOUSE_SITE: "🏡 Building House",
    FARM_FIELDS: "🌾 Working Farm",
    TREND_WELL: "🧭 Trend Sundial",
    CAMPFIRE: "🔥 Campfire Rest",
  };
  document.getElementById("inspStatePill").textContent =
    badgeLabels[ag.currentZone] || "🏡 Building House";

  document.querySelectorAll(".override-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-target-zone") === ag.currentZone);
  });

  if (focusCamera) {
    worldState.targetCamX = ag.x;
    worldState.targetCamY = ag.y;
    worldState.targetZoom = Math.max(worldState.targetZoom, 1.32);
  }
}

document.querySelectorAll(".override-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const ag = worldState.chibiAgents.find((a) => a.id === worldState.selectedAgentId);
    if (!ag) return;
    const targetZone = btn.getAttribute("data-target-zone");
    ag.currentZone = targetZone;

    const matchingPlots = HOMESTEAD_PLOTS.filter((p) => p.group === targetZone);
    const chosenPlot =
      matchingPlots[Math.floor(Math.random() * matchingPlots.length)] || HOMESTEAD_PLOTS[0];
    ag.homePlot = chosenPlot.id;
    ag.tx = chosenPlot.x + 40 + Math.random() * (chosenPlot.w - 80);
    ag.ty = chosenPlot.y + 40 + Math.random() * (chosenPlot.h - 80);

    // Save zone override
    const overrides = getSavedCustomizations();
    overrides[ag.id] = { ...(overrides[ag.id] || {}), currentZone: targetZone };
    saveCustomizations(overrides);

    selectAgentById(ag.id, false);
    pushLog("WORKSITE", `${ag.name} walked to [${chosenPlot.label}].`, "emerald");
  });
});

// Topbar Zone Camera Buttons
document.querySelectorAll(".zone-pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".zone-pill").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const zone = btn.getAttribute("data-zone");
    document.getElementById("hudZoneBadge").textContent = btn.textContent.trim();
    const preset = ZONE_CAMERA_PRESETS[zone] || ZONE_CAMERA_PRESETS.VILLAGE_ALL;
    worldState.targetCamX = preset.x;
    worldState.targetCamY = preset.y;
    worldState.targetZoom = preset.zoom;
  });
});

document.getElementById("btn2dIso").addEventListener("click", () => {
  worldState.viewMode = "2D";
  document.getElementById("btn2dIso").classList.add("active");
  document.getElementById("btn3dWebgl").classList.remove("active");
  document.getElementById("hudModeLabel").textContent = "2D ISOMETRIC DIORAMA";
  worldState.targetYaw = -Math.PI / 4;
  worldState.targetPitch = 0.56;
});

document.getElementById("btn3dWebgl").addEventListener("click", () => {
  worldState.viewMode = "3D";
  document.getElementById("btn3dWebgl").classList.add("active");
  document.getElementById("btn2dIso").classList.remove("active");
  document.getElementById("hudModeLabel").textContent = "3D ORBIT DIORAMA";
  worldState.targetYaw = -0.52;
  worldState.targetPitch = 0.34;
});

document.getElementById("resetCameraBtn").addEventListener("click", () => {
  worldState.targetCamX = 0;
  worldState.targetCamY = 0;
  worldState.targetZoom = 0.88;
  worldState.targetYaw = worldState.viewMode === "3D" ? -0.52 : -Math.PI / 4;
  worldState.targetPitch = worldState.viewMode === "3D" ? 0.34 : 0.56;
});

// ============================================================================
// Create / Customize Your Own Chibi Agent Modal
// ============================================================================
function openChibiCreator(editAgent = null) {
  const modal = document.getElementById("chibiCreatorBackdrop");
  const delBtn = document.getElementById("deleteCustomChibiBtn");

  if (editAgent) {
    document.getElementById("creatorModalTitle").textContent = `✏️ Customize Chibi: ${editAgent.name}`;
    document.getElementById("editChibiId").value = editAgent.id;
    document.getElementById("customChibiName").value = editAgent.name;
    document.getElementById("customChibiRole").value = editAgent.role;
    document.getElementById("customChibiZone").value = editAgent.currentZone || "HOUSE_SITE";
    document.getElementById("customChibiTool").value = editAgent.tool || "🔨";
    document.getElementById("customHatColor").value = editAgent.hatColor || "#f59e0b";
    document.getElementById("customBodyColor").value = editAgent.bodyColor || "#2563eb";
    document.getElementById("customChibiChore").value = editAgent.task || "";
    document.getElementById("customChibiKeywords").value = (editAgent.keywords || []).join(", ");
    document.getElementById("customChibiPrompt").value =
      editAgent.systemPrompt || `You are ${editAgent.name}, a ${editAgent.role} specialist agent.`;
    delBtn.classList.toggle("hidden", !editAgent.custom);
  } else {
    document.getElementById("creatorModalTitle").textContent = "✨ Make Your Own Chibi Agent";
    document.getElementById("editChibiId").value = "";
    document.getElementById("customChibiName").value = "";
    document.getElementById("customChibiRole").value = "";
    document.getElementById("customChibiZone").value = "HOUSE_SITE";
    document.getElementById("customChibiTool").value = "🔨";
    document.getElementById("customHatColor").value = "#f59e0b";
    document.getElementById("customBodyColor").value = "#10b981";
    document.getElementById("customChibiChore").value = "";
    document.getElementById("customChibiKeywords").value = "";
    document.getElementById("customChibiPrompt").value = "";
    delBtn.classList.add("hidden");
  }
  modal.classList.remove("hidden");
}

document.getElementById("openCreatorBtn").addEventListener("click", () => openChibiCreator(null));

document.getElementById("editSelectedChibiBtn").addEventListener("click", () => {
  const ag = worldState.chibiAgents.find((a) => a.id === worldState.selectedAgentId);
  if (ag) openChibiCreator(ag);
});

document.getElementById("closeCreatorModalBtn").addEventListener("click", () => {
  document.getElementById("chibiCreatorBackdrop").classList.add("hidden");
});

document.getElementById("customChibiForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const editId = document.getElementById("editChibiId").value.trim();
  const name = document.getElementById("customChibiName").value.trim();
  const role = document.getElementById("customChibiRole").value.trim();
  const zoneGroup = document.getElementById("customChibiZone").value;
  const tool = document.getElementById("customChibiTool").value;
  const hatColor = document.getElementById("customHatColor").value;
  const bodyColor = document.getElementById("customBodyColor").value;
  const chore = document.getElementById("customChibiChore").value.trim();
  const keywords = document
    .getElementById("customChibiKeywords")
    .value.split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const prompt = document.getElementById("customChibiPrompt").value.trim();

  const agentId = editId || `chibi_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now().toString().slice(-3)}`;
  const domain = zoneGroup === "FARM_FIELDS" ? "game" : "webapp";

  // Save visual overrides locally
  const overrides = getSavedCustomizations();
  overrides[agentId] = { name, role, currentZone: zoneGroup, tool, hatColor, bodyColor, chore };
  saveCustomizations(overrides);

  // Register or update on backend if custom or new
  await apiFetch("/api/v1/specialists", {
    method: "POST",
    body: JSON.stringify({
      id: agentId,
      name,
      role,
      domain,
      icon: tool,
      description: chore,
      system_prompt: prompt,
      keywords,
      preferred_tools: ["search_knowledge_base", "save_memory", "recall_memory"],
    }),
  });

  document.getElementById("chibiCreatorBackdrop").classList.add("hidden");
  await loadSpecialistsIntoWorld();
  selectAgentById(agentId, true);
  pushLog("CHIBI_WORKSHOP", `Saved custom Chibi agent "${name}" (${role})!`, "cyan");
});

document.getElementById("deleteCustomChibiBtn").addEventListener("click", async () => {
  const editId = document.getElementById("editChibiId").value.trim();
  if (!editId) return;
  await apiFetch(`/api/v1/specialists/${editId}`, { method: "DELETE" });
  document.getElementById("chibiCreatorBackdrop").classList.add("hidden");
  await loadSpecialistsIntoWorld();
  pushLog("CHIBI_WORKSHOP", `Removed custom agent ${editId}.`, "amber");
});

// ============================================================================
// API Helper, Task Dispatch & Activity Log
// ============================================================================
async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const resp = await fetch(path, { ...options, headers });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

function pushLog(tag, message, colorClass = "emerald", fullOutput = null) {
  worldState.telemetryCount += 1;
  document.getElementById("telemetryCountLabel").textContent = `${worldState.telemetryCount} LOGS`;

  const feed = document.getElementById("telemetryFeed");
  const nowStr = new Date().toLocaleTimeString("en-US", { hour12: true });
  const item = document.createElement("div");
  item.className = `telemetry-item ${colorClass}`;
  item.textContent = `${nowStr} [${tag}] ${message}`;

  if (fullOutput) {
    item.title = "Click to inspect full output";
    item.addEventListener("click", () => showOutputOverlay(tag, fullOutput));
  }
  feed.prepend(item);
  while (feed.children.length > 50) feed.removeChild(feed.lastChild);
}

function showOutputOverlay(title, content) {
  const box = document.getElementById("agentOutputOverlay");
  document.getElementById("outputOverlayTitle").textContent = `⚡ ${title}`;
  document.getElementById("outputOverlayBody").textContent = content;
  box.classList.remove("hidden");
}

document.getElementById("closeOutputOverlayBtn").addEventListener("click", () => {
  document.getElementById("agentOutputOverlay").classList.add("hidden");
});

document.getElementById("copyOutputBtn").addEventListener("click", () => {
  navigator.clipboard.writeText(document.getElementById("outputOverlayBody").textContent);
  document.getElementById("copyOutputBtn").textContent = "Copied!";
  setTimeout(() => (document.getElementById("copyOutputBtn").textContent = "Copy"), 1500);
});

document.getElementById("directiveForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("directiveInput");
  const prompt = input.value.trim();
  if (!prompt) return;

  const selectedAg =
    worldState.chibiAgents.find((a) => a.id === worldState.selectedAgentId) ||
    worldState.chibiAgents[0];
  const btn = document.getElementById("dispatchBtn");
  btn.disabled = true;
  btn.textContent = "Working...";
  input.value = "";

  selectedAg.task = `Working on: "${prompt.slice(0, 40)}..."`;
  selectedAg.progress = 40;
  selectAgentById(selectedAg.id, false);
  pushLog("TASK_START", `${selectedAg.name} started task: "${prompt}"`, "cyan");

  try {
    const res = await apiFetch("/api/v1/chat", {
      method: "POST",
      body: JSON.stringify({
        message: prompt,
        specialist_id: selectedAg.apiId,
        user_id: "homestead_builder",
        enable_tools: true,
        enable_rag: true,
        enable_memory: true,
      }),
    });

    selectedAg.progress = 100;
    selectedAg.task = `Finished (${res.latency_ms}ms): ${prompt.slice(0, 32)}`;
    if (res.monthly_trends_applied && res.monthly_trends_applied.length) {
      selectedAg.trend = res.monthly_trends_applied[0].trend_title;
    }
    selectAgentById(selectedAg.id, false);

    // Advance House or Farm progress meter
    if (selectedAg.currentZone === "FARM_FIELDS") {
      worldState.farmProgress = Math.min(100, worldState.farmProgress + 4);
      document.getElementById("farmMeterBar").style.width = `${worldState.farmProgress}%`;
    } else {
      worldState.houseProgress = Math.min(100, worldState.houseProgress + 4);
      document.getElementById("houseMeterBar").style.width = `${worldState.houseProgress}%`;
    }

    (res.tool_calls || []).forEach((tc) => {
      pushLog(`TOOL:${tc.tool_name}`, `${selectedAg.name} ran ${tc.tool_name} (${tc.duration_ms}ms)`, "purple", tc.output);
    });

    pushLog(
      "TASK_DONE",
      `${selectedAg.name}: "${res.reply.replace(/\s+/g, " ").slice(0, 105)}..." (Click to view)`,
      "emerald",
      res.reply
    );
    showOutputOverlay(`${selectedAg.name} (${selectedAg.role})`, res.reply);
  } catch (err) {
    pushLog("ERROR", `Task error: ${err.message}`, "amber");
  } finally {
    btn.disabled = false;
    btn.textContent = "Run Task ➔";
  }
});

// ============================================================================
// Studio Modal (Monthly Trends, Memories, RAG, LLM Keys)
// ============================================================================
document.getElementById("openStudioModalBtn").addEventListener("click", () => {
  document.getElementById("studioModalBackdrop").classList.remove("hidden");
  loadStudioModalData();
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

async function loadStudioModalData() {
  const [trendsData, memData, docData, cfgData] = await Promise.all([
    apiFetch("/api/v1/trends"),
    apiFetch("/api/v1/memories"),
    apiFetch("/api/v1/knowledge"),
    apiFetch("/api/v1/config"),
  ]);

  worldState.trends = trendsData.trends || [];
  document.getElementById("trendCountPill").textContent = `${worldState.trends.length} TRENDS`;
  document.getElementById("trendCycleText").textContent =
    `MONTHLY TRENDS: ${trendsData.current_month} (STRICTLY TRENDS)`;

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
    .map((m) => `<div class="modal-card"><strong>[${m.category.toUpperCase()}]</strong> ${m.content}</div>`)
    .join("");

  document.getElementById("documentsList").innerHTML = (docData.documents || [])
    .map((d) => `<div class="modal-card"><strong>${d.title}</strong> (${d.chunk_count} chunks)</div>`)
    .join("");

  document.getElementById("cfgProvider").value = cfgData.llm_provider || "auto";
  document.getElementById("cfgOpenaiModel").value = cfgData.openai_model || "";
  document.getElementById("cfgGeminiModel").value = cfgData.gemini_model || "";
  document.getElementById("cfgAnthropicModel").value = cfgData.anthropic_model || "";
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
  pushLog("TREND_LEARNED", `Learned new monthly trend: "${title}"`, "purple");
  await loadStudioModalData();
});

document.getElementById("syncMonthlyTrendsBtn").addEventListener("click", async () => {
  const res = await apiFetch("/api/v1/trends/sync", { method: "POST" });
  pushLog("TREND_SYNC", `Synced ${res.total_trends_for_month} monthly trends for ${res.month_key}.`, "cyan");
  await loadStudioModalData();
});

document.getElementById("addMemoryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = document.getElementById("memContent").value.trim();
  await apiFetch("/api/v1/memories", {
    method: "POST",
    body: JSON.stringify({
      user_id: "homestead_builder",
      category: document.getElementById("memCategory").value,
      content,
      importance: 4,
    }),
  });
  document.getElementById("memContent").value = "";
  pushLog("MEMORY", `Saved memory: "${content}"`, "emerald");
  await loadStudioModalData();
});

document.getElementById("ingestDocForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("docTitle").value.trim();
  await apiFetch("/api/v1/knowledge", {
    method: "POST",
    body: JSON.stringify({
      title,
      content: document.getElementById("docContent").value.trim(),
      source: "homestead://docs",
      tags: ["rag"],
    }),
  });
  document.getElementById("docTitle").value = "";
  document.getElementById("docContent").value = "";
  pushLog("RAG_DOCS", `Indexed document: "${title}"`, "cyan");
  await loadStudioModalData();
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
    `✓ Active: ${res.active_provider.toUpperCase()} (${res.active_model})`;
});

// ============================================================================
// Load Specialists from Backend into Homestead Diorama
// ============================================================================
async function loadSpecialistsIntoWorld() {
  const data = await apiFetch("/api/v1/specialists");
  const specs = data.specialists || [];
  worldState.chibiAgents = specs.map((sp, i) => mapSpecialistToChibiActor(sp, i));
}

(async function initHomestead() {
  resizeCanvas();
  await loadSpecialistsIntoWorld();
  await loadStudioModalData();
  selectAgentById("webapp_architect", false);

  pushLog("HOMESTEAD", "House Build Crew & Harvest Farm Crew online. Click '+ Make Your Own Chibi Agent' anytime!", "emerald");
  pushLog("TREND_ENGINE", "Monthly Trend Sundial synced for 2026-11 (Strictly Tech & Game Trends).", "cyan");
  requestAnimationFrame(animate);
})();
