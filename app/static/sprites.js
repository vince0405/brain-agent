// ============================================================================
// BRAIN HOMESTEAD // High-Detail Graphic Sprite & SVG Asset Pack Engine
// Renders illustrated Chibi characters, buildings, crops, trees, animals & FX
// ============================================================================

const LoadedSvgAssets = {
  house: new Image(),
  windmill: new Image(),
};
LoadedSvgAssets.house.src = "/static/assets/homestead_house.svg";
LoadedSvgAssets.windmill.src = "/static/assets/farm_windmill.svg";

// Pre-seeded wildflowers, stepping stones & pine trees around the meadow
const MEADOW_DECOR = [];
(function initMeadowDecor() {
  for (let i = 0; i < 55; i++) {
    const angle = i * 2.39996;
    const dist = 60 + (i * 7) % 360;
    MEADOW_DECOR.push({
      x: Math.cos(angle) * dist * 1.15,
      y: Math.sin(angle) * dist * 0.85,
      type: i % 5 === 0 ? "flower_pink" : i % 4 === 0 ? "flower_yellow" : "grass_tuft",
      scale: 0.8 + (i % 3) * 0.2,
    });
  }
})();

// Draw cobblestone pathways & grass tufts across the village
function drawTerrainDetails(ctx, projectPoint, zoom, t) {
  // Cobblestone path connecting House -> Trend Sundial -> Farm
  const pathStones = [
    [-210, -80], [-180, -60], [-150, -40], [-125, -20],
    [110, -20], [135, -40], [160, -60],
    [-20, 115], [-20, 138], [-20, 160],
  ];
  pathStones.forEach(([px, py], idx) => {
    const pt = projectPoint(px, py, 2);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(pt.x, pt.y, 12 * zoom, 6.5 * zoom, (idx % 3) * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = idx % 2 === 0 ? "#94a3b8" : "#64748b";
    ctx.fill();
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  });

  // Grass tufts & wildflowers
  MEADOW_DECOR.forEach((d, idx) => {
    const pt = projectPoint(d.x, d.y, 1);
    const sway = Math.sin(t * 2.5 + idx) * 1.5 * zoom;
    ctx.save();
    ctx.translate(pt.x, pt.y);
    if (d.type === "grass_tuft") {
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 1.4 * zoom;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-3 * zoom + sway, -6 * zoom);
      ctx.moveTo(0, 0);
      ctx.lineTo(0 + sway, -8 * zoom);
      ctx.moveTo(0, 0);
      ctx.lineTo(3 * zoom + sway, -6 * zoom);
      ctx.stroke();
    } else {
      ctx.fillStyle = d.type === "flower_pink" ? "#f472b6" : "#facc15";
      ctx.beginPath();
      ctx.arc(sway, -4 * zoom, 2.6 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(sway, -4 * zoom, 1.1 * zoom, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
}

// ============================================================================
// Detailed Plot Graphic Assets (House, Barn, Windmill, Crops, Trees, Sheep)
// ============================================================================
function drawDetailedPlotGraphics(ctx, projectPoint, drawIsoBox, plot, zoom, t) {
  const { x, y, w, h, propType } = plot;

  if (propType === "homestead_house") {
    // Render the SVG Homestead House graphic asset + animated construction details
    const houseAnchor = projectPoint(x + 165, y + 145, 38);
    if (LoadedSvgAssets.house.complete && LoadedSvgAssets.house.naturalWidth > 0) {
      const sw = 230 * zoom;
      const sh = 210 * zoom;
      ctx.drawImage(LoadedSvgAssets.house, houseAnchor.x - sw / 2, houseAnchor.y - sh * 0.68, sw, sh);
    }

    // Animated Chimney Smoke Puffs
    for (let s = 0; s < 3; s++) {
      const phase = (t * 0.7 + s * 0.33) % 1;
      const smokePt = projectPoint(
        x + 210 + Math.sin(t * 2 + s) * 6,
        y + 95,
        85 + phase * 48
      );
      ctx.beginPath();
      ctx.arc(smokePt.x, smokePt.y, (5 + phase * 9) * zoom, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(226, 232, 240, ${(1 - phase) * 0.45})`;
      ctx.fill();
    }

    // Architect Blueprint Table with unrolled scroll
    drawIsoBox(x + 265, y + 210, 66, 40, 3, 15, "#1e3a8a", "#172554", "#0f172a", "#38bdf8");
    const tableTop = projectPoint(x + 298, y + 230, 19);
    ctx.fillStyle = "#bae6fd";
    ctx.fillRect(tableTop.x - 14 * zoom, tableTop.y - 6 * zoom, 28 * zoom, 12 * zoom);

    // Timber Plank Stack & Brick Pallet
    drawIsoBox(x + 28, y + 220, 72, 30, 3, 11, "#f59e0b", "#d97706", "#92400e", "#78350f");
    drawIsoBox(x + 32, y + 224, 64, 22, 14, 8, "#fbbf24", "#d97706", "#92400e");
  } else if (propType === "waterworks_solar") {
    // Glowing Emerald Postgres Water Tower & Solar Panels
    drawIsoBox(x + 38, y + 38, 68, 68, 3, 48, "#10b981", "#059669", "#047857", "#6ee7b7");
    const tankTop = projectPoint(x + 72, y + 72, 54);
    ctx.fillStyle = "#ecfdf5";
    ctx.font = `800 ${Math.round(9.5 * zoom)}px Inter, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("SUPABASE DB", tankTop.x, tankTop.y);

    // Solar Panels with reflective grid lines
    drawIsoBox(x + 132, y + 45, 78, 48, 3, 15, "#0284c7", "#0369a1", "#075985", "#7dd3fc");
    drawIsoBox(x + 132, y + 115, 78, 48, 3, 15, "#0284c7", "#0369a1", "#075985", "#7dd3fc");
    // Copper Water Main Pipe
    drawIsoBox(x + 64, y + 108, 16, 155, 3, 9, "#f97316", "#ea580c", "#9a3412");
  } else if (propType === "trend_well") {
    // Ornate Stone Wishing Well & Rotating Monthly Trend Sundial
    const cx = x + w / 2;
    const cy = y + h / 2;
    const wellPt = projectPoint(cx, cy, 4);

    // Outer stone plaza circle
    ctx.beginPath();
    ctx.ellipse(wellPt.x, wellPt.y, 76 * zoom, 42 * zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2 * zoom;
    ctx.stroke();

    // Stone Wishing Well Base + Water
    drawIsoBox(cx - 28, cy - 28, 56, 56, 3, 20, "#0284c7", "#475569", "#334155", "#94a3b8");

    // 3 Spinning Golden/Cyan Sundial Astrological Rings
    const holoPt = projectPoint(cx, cy, 44 + Math.sin(t * 2.2) * 4);
    ctx.save();
    ctx.translate(holoPt.x, holoPt.y);
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate(t * (0.95 + i * 0.35) + i * 1.1);
      ctx.beginPath();
      ctx.ellipse(0, 0, (40 - i * 4) * zoom, (16 - i) * zoom, 0, 0, Math.PI * 2);
      ctx.strokeStyle = i === 0 ? "#38bdf8" : i === 1 ? "#facc15" : "#4ade80";
      ctx.lineWidth = 2.2 * zoom;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  } else if (propType === "wheat_pumpkin_field") {
    // Furrowed Soil Beds + Illustrated Golden Wheat & Ribbed Pumpkins
    for (let row = 0; row < 3; row++) {
      const ry = y + 24 + row * 56;
      drawIsoBox(x + 28, ry, 368, 38, 3, 5, "#5c2d0c", "#3e1f08", "#271203");

      for (let col = 0; col < 8; col++) {
        const wx = x + 48 + col * 43;
        const wy = ry + 19;
        const pt = projectPoint(wx, wy, 9);
        const sway = Math.sin(t * 3.2 + col * 0.7 + row) * 3.5 * zoom;

        ctx.save();
        ctx.translate(pt.x, pt.y);
        if (row === 2 && col % 2 === 0) {
          // Illustrated Plump Orange Pumpkin with Ribbed Segments & Green Vine
          ctx.fillStyle = "#ea580c";
          ctx.beginPath();
          ctx.ellipse(-3 * zoom, 0, 6.5 * zoom, 6 * zoom, 0, 0, Math.PI * 2);
          ctx.ellipse(3 * zoom, 0, 6.5 * zoom, 6 * zoom, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#f97316";
          ctx.beginPath();
          ctx.ellipse(0, 0, 5.5 * zoom, 6.5 * zoom, 0, 0, Math.PI * 2);
          ctx.fill();
          // Green Stem
          ctx.strokeStyle = "#16a34a";
          ctx.lineWidth = 2 * zoom;
          ctx.beginPath();
          ctx.moveTo(0, -6 * zoom);
          ctx.quadraticCurveTo(3 * zoom, -11 * zoom, 6 * zoom, -8 * zoom);
          ctx.stroke();
        } else {
          // Multi-stalk Swaying Golden Wheat Sheaf
          ctx.strokeStyle = "#eab308";
          ctx.lineWidth = 1.8 * zoom;
          for (let s = -1; s <= 1; s++) {
            ctx.beginPath();
            ctx.moveTo(s * 3 * zoom, 2 * zoom);
            ctx.quadraticCurveTo(
              s * 4 * zoom + sway * 0.5,
              -8 * zoom,
              s * 5 * zoom + sway,
              -16 * zoom
            );
            ctx.stroke();
            // Golden wheat ear head
            ctx.fillStyle = "#facc15";
            ctx.beginPath();
            ctx.ellipse(
              s * 5 * zoom + sway,
              -17 * zoom,
              2.4 * zoom,
              5 * zoom,
              0.15 * s,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
        ctx.restore();
      }
    }
  } else if (propType === "windmill_barn") {
    // Render Red Barn & Windmill Tower SVG Asset + Rotating Lattice Sails
    const barnPt = projectPoint(x + 125, y + 115, 34);
    if (LoadedSvgAssets.windmill.complete && LoadedSvgAssets.windmill.naturalWidth > 0) {
      const sw = 215 * zoom;
      const sh = 215 * zoom;
      ctx.drawImage(LoadedSvgAssets.windmill, barnPt.x - sw * 0.52, barnPt.y - sh * 0.68, sw, sh);
    }

    // Spinning Wooden Lattice Windmill Sails
    const hub = projectPoint(x + 178, y + 88, 68);
    ctx.save();
    ctx.translate(hub.x, hub.y);
    ctx.rotate(t * 1.6);
    for (let b = 0; b < 4; b++) {
      ctx.rotate(Math.PI / 2);
      // Sail beam
      ctx.fillStyle = "#78350f";
      ctx.fillRect(-1.5 * zoom, 0, 3 * zoom, -42 * zoom);
      // Cream cloth sail
      ctx.fillStyle = "rgba(254, 249, 195, 0.9)";
      ctx.strokeStyle = "#d97706";
      ctx.lineWidth = 1.2 * zoom;
      ctx.fillRect(1.5 * zoom, -39 * zoom, 11 * zoom, 30 * zoom);
      ctx.strokeRect(1.5 * zoom, -39 * zoom, 11 * zoom, 30 * zoom);
    }
    ctx.beginPath();
    ctx.arc(0, 0, 4.5 * zoom, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.fill();
    ctx.restore();
  } else if (propType === "apple_orchard") {
    // Illustrated Multi-Canopy Apple Trees, Golden Beehives & Grazing Fluffy Sheep
    const treeCoords = [
      [x + 48, y + 48],
      [x + 195, y + 48],
      [x + 52, y + 135],
    ];
    treeCoords.forEach(([tx, ty], idx) => {
      const pt = projectPoint(tx, ty, 6);
      const sway = Math.sin(t * 2 + idx) * 2 * zoom;
      ctx.save();
      ctx.translate(pt.x, pt.y);
      // Tree shadow
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.beginPath();
      ctx.ellipse(0, 4 * zoom, 20 * zoom, 9 * zoom, 0, 0, Math.PI * 2);
      ctx.fill();
      // Trunk
      ctx.fillStyle = "#78350f";
      ctx.fillRect(-4.5 * zoom, -22 * zoom, 9 * zoom, 24 * zoom);
      // Layered Lush Foliage puffs
      ctx.fillStyle = "#15803d";
      ctx.beginPath();
      ctx.arc(-11 * zoom + sway, -28 * zoom, 14 * zoom, 0, Math.PI * 2);
      ctx.arc(11 * zoom + sway, -28 * zoom, 14 * zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(0 + sway, -36 * zoom, 17 * zoom, 0, Math.PI * 2);
      ctx.fill();
      // Glossy Red Apples
      [[-8, -28], [7, -31], [0, -40], [-4, -20]].forEach(([ax, ay]) => {
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(ax * zoom + sway, ay * zoom, 3.2 * zoom, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    });

    // Fluffy Grazing Sheep Sprite
    const sheepHop = Math.abs(Math.sin(t * 3.5)) * 4;
    const sheepPt = projectPoint(x + 130 + Math.sin(t * 0.8) * 18, y + 115, 6 + sheepHop);
    ctx.save();
    ctx.translate(sheepPt.x, sheepPt.y);
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(-5 * zoom, 0, 7 * zoom, 0, Math.PI * 2);
    ctx.arc(4 * zoom, 0, 7.5 * zoom, 0, Math.PI * 2);
    ctx.arc(0, -4 * zoom, 7 * zoom, 0, Math.PI * 2);
    ctx.fill();
    // Sheep face
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(9 * zoom, -2 * zoom, 4.5 * zoom, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Golden Beehives & Buzzing Bees
    drawIsoBox(x + 185, y + 125, 26, 26, 3, 20, "#facc15", "#eab308", "#ca8a04", "#fef08a");
    const beePt = projectPoint(
      x + 198 + Math.cos(t * 6) * 18,
      y + 138 + Math.sin(t * 6) * 18,
      28 + Math.sin(t * 10) * 5
    );
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.arc(beePt.x, beePt.y, 2.8 * zoom, 0, Math.PI * 2);
    ctx.fill();
  } else if (propType === "campfire_logs") {
    // Cozy Campfire with Flickering Layered Flames, Rising Embers & Log Benches
    const fx = x + w / 2;
    const fy = y + h / 2;
    drawIsoBox(fx - 48, fy - 16, 18, 36, 3, 9, "#92400e", "#78350f", "#451a03");
    drawIsoBox(fx + 32, fy - 16, 18, 36, 3, 9, "#92400e", "#78350f", "#451a03");

    const firePt = projectPoint(fx, fy, 6);
    ctx.save();
    ctx.translate(firePt.x, firePt.y);
    // Warm fire glow on ground
    const grad = ctx.createRadialGradient(0, 0, 2 * zoom, 0, 0, 34 * zoom);
    grad.addColorStop(0, "rgba(251, 146, 60, 0.55)");
    grad.addColorStop(1, "rgba(251, 146, 60, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 2 * zoom, 34 * zoom, 18 * zoom, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crossed logs
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 4.5 * zoom;
    ctx.beginPath();
    ctx.moveTo(-11 * zoom, 4 * zoom);
    ctx.lineTo(11 * zoom, -4 * zoom);
    ctx.moveTo(-11 * zoom, -4 * zoom);
    ctx.lineTo(11 * zoom, 4 * zoom);
    ctx.stroke();

    // Flickering Outer & Inner Flame Tongues
    const fH = (18 + Math.sin(t * 12) * 4) * zoom;
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(-9 * zoom, 0);
    ctx.quadraticCurveTo(0, -fH * 1.2, 9 * zoom, 0);
    ctx.fill();

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.moveTo(-5 * zoom, 0);
    ctx.quadraticCurveTo(0, -fH * 0.8, 5 * zoom, 0);
    ctx.fill();
    ctx.restore();
  }
}

// ============================================================================
// Illustrated Chibi Character Sprite Renderer
// ============================================================================
function drawIllustratedChibi(ctx, projectPoint, agent, zoom, t, isSelected) {
  const isMoving = Math.hypot(agent.tx - agent.x, agent.ty - agent.y) > 2;
  const bounce = isMoving
    ? Math.abs(Math.sin(t * 11 + agent.x)) * 6.5
    : Math.abs(Math.sin(t * 3.4 + agent.x)) * 2.8;

  const footPt = projectPoint(agent.x, agent.y, 2);
  const spritePt = projectPoint(agent.x, agent.y, 4 + bounce);

  ctx.save();
  // 1. Ground Shadow / Golden Selection Ring
  if (isSelected) {
    const pulse = (20 + Math.sin(t * 5) * 3) * zoom;
    ctx.beginPath();
    ctx.ellipse(footPt.x, footPt.y, pulse, pulse * 0.52, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(250, 204, 21, 0.24)";
    ctx.fill();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2.4;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(footPt.x, footPt.y, 12 * zoom, 6 * zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.42)";
    ctx.fill();
  }

  // Translate to Chibi sprite anchor
  ctx.translate(spritePt.x, spritePt.y);
  const s = zoom * 1.08;

  // 2. Animated Chibi Boots / Legs
  const legSwing = isMoving ? Math.sin(t * 14) * 4 * s : 0;
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.roundRect(-7 * s, -6 * s + legSwing, 5.5 * s, 7 * s, 2.5 * s);
  ctx.roundRect(1.5 * s, -6 * s - legSwing, 5.5 * s, 7 * s, 2.5 * s);
  ctx.fill();

  // 3. Chibi Torso / Overalls with Straps & Gold Buttons
  ctx.fillStyle = agent.bodyColor || "#2563eb";
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 1.4 * s;
  ctx.beginPath();
  ctx.roundRect(-10 * s, -21 * s, 20 * s, 16 * s, 6 * s);
  ctx.fill();
  ctx.stroke();

  // Overall bib & gold buttons
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fillRect(-6 * s, -17 * s, 12 * s, 9 * s);
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(-4.5 * s, -17 * s, 1.5 * s, 0, Math.PI * 2);
  ctx.arc(4.5 * s, -17 * s, 1.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // 4. Swinging Chibi Arms & Hands
  const armSwing = Math.sin(t * 6.5 + agent.x) * 3 * s;
  ctx.fillStyle = "#fde68a";
  ctx.strokeStyle = "#78350f";
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.arc(-12 * s, -14 * s - armSwing * 0.4, 3.8 * s, 0, Math.PI * 2);
  ctx.arc(12 * s, -14 * s + armSwing, 3.8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 5. Big Expressive Chibi Head
  ctx.fillStyle = "#fde68a";
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 1.5 * s;
  ctx.beginPath();
  ctx.arc(0, -32 * s, 12.5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Hair Bangs under hat
  ctx.fillStyle = "#451a03";
  ctx.beginPath();
  ctx.arc(0, -35 * s, 12 * s, Math.PI * 1.08, Math.PI * 1.92);
  ctx.fill();

  // Rosy Blush Cheeks
  ctx.fillStyle = "rgba(244, 63, 94, 0.55)";
  ctx.beginPath();
  ctx.ellipse(-6.8 * s, -29.5 * s, 2.4 * s, 1.4 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(6.8 * s, -29.5 * s, 2.4 * s, 1.4 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Glossy Anime Eyes (with periodic blink!)
  const isBlinking = Math.sin(t * 1.7 + agent.x) > 0.96;
  ctx.fillStyle = "#0f172a";
  if (isBlinking) {
    ctx.lineWidth = 1.6 * s;
    ctx.beginPath();
    ctx.moveTo(-6.5 * s, -32 * s);
    ctx.lineTo(-2.5 * s, -32 * s);
    ctx.moveTo(2.5 * s, -32 * s);
    ctx.lineTo(6.5 * s, -32 * s);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(-4.5 * s, -32 * s, 2.1 * s, 2.6 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(4.5 * s, -32 * s, 2.1 * s, 2.6 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    // White eye catchlight sparkles
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-5.1 * s, -33 * s, 0.9 * s, 0, Math.PI * 2);
    ctx.arc(3.9 * s, -33 * s, 0.9 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Happy Chibi Smile
  ctx.strokeStyle = "#451a03";
  ctx.lineWidth = 1.3 * s;
  ctx.beginPath();
  ctx.arc(0, -29.2 * s, 2.4 * s, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // 6. Illustrated Role Hat (Straw Sunhat for Farm vs Builder Hardhat for House)
  const hatCol = agent.hatColor || "#f59e0b";
  if (agent.currentZone === "FARM_FIELDS") {
    // Wide Woven Straw Hat with Ribbon
    ctx.fillStyle = hatCol;
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 1.3 * s;
    ctx.beginPath();
    ctx.ellipse(0, -41 * s, 17 * s, 4.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -41 * s, 10.5 * s, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    // Red Hat Ribbon
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(-10 * s, -42.5 * s, 20 * s, 2.4 * s);
  } else {
    // Domed Builder Hardhat with Emblem
    ctx.fillStyle = hatCol;
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 1.3 * s;
    ctx.beginPath();
    ctx.arc(0, -40 * s, 12 * s, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-14 * s, -41 * s, 28 * s, 3.5 * s, 1.8 * s);
    ctx.fill();
    ctx.stroke();
    // Front builder badge
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.arc(0, -45.5 * s, 2.4 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Held Graphic Tool in Right Hand
  ctx.save();
  ctx.translate(15 * s, -16 * s + armSwing);
  ctx.rotate(Math.sin(t * 7 + agent.x) * 0.35);
  ctx.font = `${Math.round(15 * s)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(agent.tool || "🔨", 0, 0);
  ctx.restore();

  ctx.restore();

  // 8. Floating Nameplate Pill above Chibi
  const tagY = spritePt.y - 58 * zoom;
  const label = agent.name;
  ctx.font = "700 10.5px Inter, sans-serif";
  const textW = ctx.measureText(label).width;
  const pillW = textW + 26;
  const pillH = 19;
  const px = spritePt.x - pillW / 2;
  const py = tagY - pillH;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(px, py, pillW, pillH, 6);
  ctx.fillStyle = isSelected ? "#facc15" : "rgba(11, 16, 29, 0.88)";
  ctx.fill();
  ctx.strokeStyle = isSelected ? "#ffffff" : "rgba(148, 163, 184, 0.4)";
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
  ctx.restore();

  return {
    agentId: agent.id,
    x1: px - 12,
    y1: py - 6,
    x2: px + pillW + 18,
    y2: footPt.y + 10,
  };
}
