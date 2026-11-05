// Brain Production Agent Studio - Frontend Logic

const state = {
  currentSessionId: null,
  tools: [],
  specialists: [],
  activeChibiIds: [],
  houseLevel: 1,
  farmHarvests: 1,
};

// Navigation Tabs
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.getAttribute("data-tab");
    document.getElementById(`tab-${target}`).classList.add("active");

    if (target === "specialists") loadSpecialists();
    if (target === "trends") loadTrends();
    if (target === "memory") loadMemories();
    if (target === "knowledge") loadDocuments();
    if (target === "tools") loadTools();
    if (target === "settings") loadRuntimeConfig();
  });
});

async function apiFetch(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const resp = await fetch(path, { ...options, headers });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${errText}`);
  }
  return resp.json();
}

// ============================================================================
// System Status & Sessions
// ============================================================================
async function refreshStatus() {
  try {
    const status = await apiFetch("/api/v1/status");
    document.getElementById("activeProviderLabel").textContent =
      `${status.active_provider.toUpperCase()} · ${status.active_model}`;
    document.getElementById("navMemoryCount").textContent = status.stats.memories;
    document.getElementById("navDocCount").textContent = status.stats.documents;
    document.getElementById("navToolCount").textContent = status.tools_registered;
    if (status.specialists_count !== undefined) {
      document.getElementById("navSpecCount").textContent = status.specialists_count;
    }
    if (status.monthly_trends_count !== undefined) {
      const trendBadge = document.getElementById("navTrendCount");
      if (trendBadge) trendBadge.textContent = status.monthly_trends_count;
    }
  } catch (err) {
    document.getElementById("activeProviderLabel").textContent = "Offline / Error";
  }
}

// ============================================================================
// Chibi Character SVG & House / Farm Village Stage
// ============================================================================
function renderChibiSvg(hatColor, outfitColor, isFarm) {
  const hatShape = isFarm
    ? `<ellipse cx="20" cy="11" rx="15" ry="4" fill="${hatColor}"/><path d="M11 11 C11 4, 29 4, 29 11 Z" fill="${hatColor}"/>`
    : `<path d="M9 12 C9 4, 31 4, 31 12 Z" fill="${hatColor}"/><rect x="7" y="11" width="26" height="3" rx="1.5" fill="${hatColor}"/>`;

  return `
    <svg width="40" height="42" viewBox="0 0 40 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Shadow -->
      <ellipse cx="20" cy="39" rx="11" ry="2.5" fill="rgba(0,0,0,0.35)"/>
      <!-- Chibi Body / Overalls -->
      <rect x="12" y="24" width="16" height="12" rx="5" fill="${outfitColor}"/>
      <!-- Chibi Arms -->
      <circle cx="10" cy="28" r="3" fill="#fde68a"/>
      <circle cx="30" cy="28" r="3" fill="#fde68a"/>
      <!-- Chibi Head -->
      <circle cx="20" cy="17" r="9.5" fill="#fde68a"/>
      <!-- Rosy Cheeks -->
      <circle cx="14.5" cy="19" r="1.6" fill="#fb7185" opacity="0.65"/>
      <circle cx="25.5" cy="19" r="1.6" fill="#fb7185" opacity="0.65"/>
      <!-- Eyes -->
      <circle cx="16.5" cy="16.5" r="1.5" fill="#0f172a"/>
      <circle cx="23.5" cy="16.5" r="1.5" fill="#0f172a"/>
      <!-- Happy Smile -->
      <path d="M17.5 20.2 Q20 22.4 22.5 20.2" stroke="#0f172a" stroke-width="1.4" stroke-linecap="round"/>
      <!-- Builder Hardhat or Farm Straw Hat -->
      ${hatShape}
    </svg>
  `;
}

async function renderChibiVillageStage(workingIds = []) {
  if (!state.specialists.length) {
    const data = await apiFetch("/api/v1/specialists");
    state.specialists = data.specialists || [];
  }
  state.activeChibiIds = workingIds;

  const houseStage = document.getElementById("houseChibiStage");
  const farmStage = document.getElementById("farmChibiStage");
  if (!houseStage || !farmStage) return;

  houseStage.innerHTML = "";
  farmStage.innerHTML = "";

  const houseCrew = state.specialists.filter((s) => (s.chibi?.zone || "house") === "house");
  const farmCrew = state.specialists.filter((s) => s.chibi?.zone === "farm");

  const buildActorEl = (sp) => {
    const c = sp.chibi || {};
    const isWorking = workingIds.includes(sp.id);
    const isFarm = c.zone === "farm";
    const el = document.createElement("div");
    el.className = `chibi-actor ${isWorking ? "working" : ""}`;
    el.title = `${c.chibi_name || sp.name} (${sp.name}) — Station: ${c.station || "Village"} — Click to select agent`;
    el.innerHTML = `
      <div class="chibi-sprite-wrap">
        ${renderChibiSvg(c.hat_color || "#6366f1", c.outfit_color || "#4f46e5", isFarm)}
        <span class="chibi-tool-badge">${escapeHtml(c.tool_emoji || sp.icon)}</span>
      </div>
      <div class="chibi-name">${escapeHtml(c.chibi_name || sp.name)}</div>
      <div class="chibi-action">${escapeHtml(isWorking ? c.work_action : c.idle_action)}</div>
    `;
    el.addEventListener("click", () => {
      const select = document.getElementById("specialistSelect");
      if (select) {
        select.value = sp.id;
      }
      renderChibiVillageStage([sp.id]);
    });
    return el;
  };

  houseCrew.forEach((sp) => houseStage.appendChild(buildActorEl(sp)));
  farmCrew.forEach((sp) => farmStage.appendChild(buildActorEl(sp)));
}

async function loadSessions() {
  const userId = document.getElementById("userIdInput").value.trim() || "default_user";
  const data = await apiFetch(`/api/v1/sessions?user_id=${encodeURIComponent(userId)}`);
  const container = document.getElementById("sessionsList");
  container.innerHTML = "";

  data.sessions.forEach((sess) => {
    const el = document.createElement("div");
    el.className = `session-item ${sess.id === state.currentSessionId ? "active" : ""}`;
    el.innerHTML = `
      <span class="session-title" title="${escapeHtml(sess.title)}">${escapeHtml(sess.title)}</span>
      <button class="btn-danger-xs" title="Delete session">×</button>
    `;
    el.querySelector(".session-title").addEventListener("click", () => selectSession(sess.id, sess.title));
    el.querySelector("button").addEventListener("click", async (e) => {
      e.stopPropagation();
      await apiFetch(`/api/v1/sessions/${sess.id}`, { method: "DELETE" });
      if (state.currentSessionId === sess.id) {
        startNewSession();
      }
      await loadSessions();
      await refreshStatus();
    });
    container.appendChild(el);
  });
}

async function selectSession(sessionId, title) {
  state.currentSessionId = sessionId;
  document.getElementById("currentSessionTitle").textContent = title || "Conversation";
  await loadSessions();

  const data = await apiFetch(`/api/v1/sessions/${sessionId}/messages`);
  const box = document.getElementById("chatMessages");
  box.innerHTML = "";
  data.messages.forEach((m) => {
    appendMessageBubble(m.role, m.content, {
      toolCalls: m.tool_calls || [],
      retrievedContext: [],
      meta: m.metadata || {},
    });
  });
  box.scrollTop = box.scrollHeight;
}

function startNewSession() {
  state.currentSessionId = null;
  document.getElementById("currentSessionTitle").textContent = "New Conversation";
  const box = document.getElementById("chatMessages");
  box.innerHTML = `
    <div class="welcome-card">
      <h2>New Conversation Session</h2>
      <p>Send a message below or click a starter prompt to test memory, RAG, and tool calling.</p>
    </div>
  `;
  loadSessions();
}

document.getElementById("newSessionBtn").addEventListener("click", startNewSession);

// ============================================================================
// Chat & SSE Streaming
// ============================================================================
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function appendMessageBubble(role, content, details = {}) {
  const box = document.getElementById("chatMessages");
  const welcome = box.querySelector(".welcome-card");
  if (welcome) welcome.remove();

  const row = document.createElement("div");
  row.className = `msg-row ${role}`;

  // Optional trace drawer for assistant tool calls & RAG context
  if (role === "assistant") {
    const toolCalls = details.toolCalls || [];
    const ctxItems = details.retrievedContext || [];
    const memSaved = details.memoriesSaved || [];
    if (toolCalls.length > 0 || ctxItems.length > 0 || memSaved.length > 0) {
      const trace = document.createElement("details");
      trace.className = "trace-box";
      const summaryParts = [];
      if (toolCalls.length) summaryParts.push(`${toolCalls.length} tool call(s)`);
      if (ctxItems.length) summaryParts.push(`${ctxItems.length} context item(s)`);
      if (memSaved.length) summaryParts.push(`${memSaved.length} memory saved`);
      trace.innerHTML = `<summary>⚡ Agent Execution Trace (${summaryParts.join(" · ")})</summary>`;

      toolCalls.forEach((tc) => {
        const stepEl = document.createElement("div");
        stepEl.className = "trace-step";
        stepEl.innerHTML = `<strong>Tool #${tc.step}: ${escapeHtml(tc.tool_name)}</strong> (${tc.duration_ms} ms)\nArgs: ${escapeHtml(JSON.stringify(tc.arguments))}\nOutput: ${escapeHtml(tc.output.slice(0, 400))}`;
        trace.appendChild(stepEl);
      });

      ctxItems.forEach((c) => {
        const ctxEl = document.createElement("div");
        ctxEl.className = "trace-step";
        ctxEl.innerHTML = `<strong>[${escapeHtml(c.source_type.toUpperCase())}] ${escapeHtml(c.title)}</strong> (score=${c.score})\n${escapeHtml(c.content.slice(0, 260))}`;
        trace.appendChild(ctxEl);
      });

      row.appendChild(trace);
    }
  }

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = content;
  row.appendChild(bubble);

  if (role === "assistant" && details.meta && details.meta.provider) {
    const meta = document.createElement("div");
    meta.className = "msg-meta";
    const specBadge = details.meta.specialists
      ? `<span>Routed to: <strong>${escapeHtml(details.meta.specialists)}</strong></span> · `
      : "";
    meta.innerHTML = `${specBadge}<span>Provider: <strong>${escapeHtml(details.meta.provider)}</strong> (${escapeHtml(details.meta.model || "")})</span> · <span>Latency: <strong>${details.meta.latency_ms || 0} ms</strong></span>`;
    row.appendChild(meta);
  }

  box.appendChild(row);
  box.scrollTop = box.scrollHeight;
  return { row, bubble };
}

async function sendChatMessage(messageText) {
  const text = messageText.trim();
  if (!text) return;

  const userId = document.getElementById("userIdInput").value.trim() || "default_user";
  const enableTools = document.getElementById("toggleTools").checked;
  const enableRag = document.getElementById("toggleRag").checked;
  const enableMemory = document.getElementById("toggleMemory").checked;
  const specChoice = document.getElementById("specialistSelect").value;
  let specialistId = "auto_router";
  let projectMode = null;
  if (specChoice.startsWith("mode:")) {
    projectMode = specChoice.slice(5);
  } else {
    specialistId = specChoice;
  }

  appendMessageBubble("user", text);
  const input = document.getElementById("chatInput");
  input.value = "";
  const sendBtn = document.getElementById("sendBtn");
  sendBtn.disabled = true;
  sendBtn.textContent = "Thinking...";

  try {
    const payload = {
      message: text,
      session_id: state.currentSessionId,
      user_id: userId,
      specialist_id: specialistId,
      project_mode: projectMode,
      enable_tools: enableTools,
      enable_rag: enableRag,
      enable_memory: enableMemory,
    };

    const res = await apiFetch("/api/v1/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    state.currentSessionId = res.session_id;
    const activeSpecIds = (res.active_specialists || []).map((s) => s.id);
    await renderChibiVillageStage(activeSpecIds);

    // Update House / Farm progress counters when Chibi crew works
    const domainsWorked = new Set((res.active_specialists || []).map((s) => s.domain));
    if (domainsWorked.has("webapp") || domainsWorked.has("orchestrator")) {
      state.houseLevel += 1;
      const lbl = document.getElementById("houseProgressLabel");
      if (lbl) lbl.textContent = `House Build Lv.${state.houseLevel} · Active!`;
    }
    if (domainsWorked.has("game") || domainsWorked.has("core")) {
      state.farmHarvests += 1;
      const lbl = document.getElementById("farmProgressLabel");
      if (lbl) lbl.textContent = `Farm Harvest #${state.farmHarvests} · Blooming!`;
    }

    appendMessageBubble("assistant", res.reply, {
      toolCalls: res.tool_calls,
      retrievedContext: res.retrieved_context,
      memoriesSaved: res.memories_saved,
      activeSpecialists: res.active_specialists || [],
      meta: {
        provider: res.provider,
        model: res.model,
        latency_ms: res.latency_ms,
        specialists: (res.active_specialists || [])
          .map((s) => `${s.icon} ${s.chibi?.chibi_name || s.name}`)
          .join(" + "),
      },
    });

    await loadSessions();
    await refreshStatus();
  } catch (err) {
    appendMessageBubble("assistant", `Error: ${err.message}`);
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = "Send ➔";
  }
}

document.getElementById("chatForm").addEventListener("submit", (e) => {
  e.preventDefault();
  sendChatMessage(document.getElementById("chatInput").value);
});

document.getElementById("chatInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage(document.getElementById("chatInput").value);
  }
});

document.addEventListener("click", (e) => {
  const chip = e.target.closest(".prompt-chip");
  if (chip) {
    sendChatMessage(chip.getAttribute("data-prompt"));
  }
});

// ============================================================================
// Specialist Agents Tab (Web App & Game Studio)
// ============================================================================
async function loadSpecialists() {
  const data = await apiFetch("/api/v1/specialists");
  state.specialists = data.specialists || [];
  const list = document.getElementById("specialistsList");
  list.innerHTML = "";

  data.specialists.forEach((sp) => {
    const card = document.createElement("div");
    card.className = "list-card";
    const c = sp.chibi || {};
    const zoneBadge = c.zone === "farm" ? "🌾 Farm Crew" : "🏡 House Builder";
    const kwHtml = (sp.keywords || [])
      .slice(0, 8)
      .map((k) => `<span class="tag-pill">${escapeHtml(k)}</span>`)
      .join("");
    const delBtn = sp.custom
      ? `<button class="btn-danger-xs" data-del-id="${escapeHtml(sp.id)}">Delete</button>`
      : `<span class="tag-pill">Built-in</span>`;

    card.innerHTML = `
      <div>
        <div class="list-card-title">
          ${escapeHtml(sp.icon)} ${escapeHtml(sp.name)}
          <span class="tag-pill">${escapeHtml(zoneBadge)} · ${escapeHtml(c.chibi_name || "")} (${escapeHtml(c.tool_emoji || "")})</span>
          <span class="tag-pill">${escapeHtml(sp.domain.toUpperCase())}</span>
        </div>
        <div class="list-card-sub" style="color: #a5b4fc; margin-bottom: 4px;">
          ${escapeHtml(sp.role)} — Station: <strong>${escapeHtml(c.station || "Village")}</strong>
        </div>
        <div class="list-card-sub">${escapeHtml(sp.description)}</div>
        <div style="margin-top: 6px;">${kwHtml}</div>
      </div>
      ${delBtn}
    `;
    const btn = card.querySelector("button[data-del-id]");
    if (btn) {
      btn.addEventListener("click", async () => {
        await apiFetch(`/api/v1/specialists/${sp.id}`, { method: "DELETE" });
        await loadSpecialists();
        await renderChibiVillageStage(state.activeChibiIds);
        await refreshStatus();
      });
    }
    list.appendChild(card);
  });
}

document.getElementById("createSpecialistForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const keywords = document
    .getElementById("specKeywords")
    .value.split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  await apiFetch("/api/v1/specialists", {
    method: "POST",
    body: JSON.stringify({
      id: document.getElementById("specId").value.trim(),
      name: document.getElementById("specName").value.trim(),
      icon: document.getElementById("specIcon").value.trim() || "🤖",
      role: document.getElementById("specRole").value.trim(),
      domain: document.getElementById("specDomain").value,
      keywords,
      description: document.getElementById("specDesc").value.trim(),
      system_prompt: document.getElementById("specPrompt").value.trim(),
      preferred_tools: ["search_knowledge_base", "save_memory", "recall_memory"],
    }),
  });

  document.getElementById("specId").value = "";
  document.getElementById("specName").value = "";
  document.getElementById("specDesc").value = "";
  document.getElementById("specPrompt").value = "";
  await loadSpecialists();
  await refreshStatus();
});

document.getElementById("refreshSpecialistsBtn").addEventListener("click", loadSpecialists);

// ============================================================================
// Monthly Trend Learning Tab (Strictly Trends Only)
// ============================================================================
async function loadTrends() {
  const data = await apiFetch("/api/v1/trends");
  const monthBadge = document.getElementById("activeTrendMonthBadge");
  if (monthBadge) monthBadge.textContent = `Month: ${data.current_month}`;

  const list = document.getElementById("trendsList");
  if (!list) return;
  list.innerHTML = "";

  data.trends.forEach((t) => {
    const card = document.createElement("div");
    card.className = "list-card";
    const tagsHtml = (t.trend_tags || [])
      .map((tag) => `<span class="tag-pill">#${escapeHtml(tag)}</span>`)
      .join("");

    card.innerHTML = `
      <div style="width: 100%;">
        <div class="list-card-title">
          <span class="tag-pill">${escapeHtml(t.month_key)}</span>
          <span class="tag-pill">${escapeHtml(t.domain.toUpperCase())}</span>
          <span class="tag-pill">🔥 Momentum: ${t.momentum_score}%</span>
          <span class="tag-pill">Agent: ${escapeHtml(t.agent_id)}</span>
        </div>
        <div style="font-weight: 700; font-size: 14px; margin: 6px 0 4px 0; color: #f8fafc;">
          ${escapeHtml(t.trend_title)}
        </div>
        <div class="list-card-sub">${escapeHtml(t.trend_summary)}</div>
        <div style="margin-top: 6px;">${tagsHtml}</div>
      </div>
    `;
    list.appendChild(card);
  });
}

document.getElementById("addTrendForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const tags = document
    .getElementById("trendTags")
    .value.split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  await apiFetch("/api/v1/trends", {
    method: "POST",
    body: JSON.stringify({
      agent_id: document.getElementById("trendAgentId").value,
      domain: document.getElementById("trendDomain").value,
      trend_title: document.getElementById("trendTitle").value.trim(),
      momentum_score: parseInt(document.getElementById("trendScore").value, 10) || 90,
      trend_tags: tags,
      trend_summary: document.getElementById("trendSummary").value.trim(),
    }),
  });

  document.getElementById("trendTitle").value = "";
  document.getElementById("trendSummary").value = "";
  await loadTrends();
  await refreshStatus();
});

document.getElementById("syncMonthlyTrendsBtn").addEventListener("click", async () => {
  await apiFetch("/api/v1/trends/sync", { method: "POST" });
  await loadTrends();
  await refreshStatus();
});

// ============================================================================
// Long-Term Memory Tab
// ============================================================================
async function loadMemories() {
  const data = await apiFetch("/api/v1/memories");
  const list = document.getElementById("memoriesList");
  list.innerHTML = "";

  if (!data.memories.length) {
    list.innerHTML = `<div class="small-muted">No persistent memories stored yet.</div>`;
    return;
  }

  data.memories.forEach((m) => {
    const card = document.createElement("div");
    card.className = "list-card";
    card.innerHTML = `
      <div>
        <div class="list-card-title">
          <span class="tag-pill">${escapeHtml(m.category)}</span>
          <span class="tag-pill">★ ${m.importance}/5</span>
          <span class="tag-pill">user: ${escapeHtml(m.user_id)}</span>
        </div>
        <div class="list-card-sub" style="color: var(--text-main); margin-top: 6px;">${escapeHtml(m.content)}</div>
      </div>
      <button class="btn-danger-xs">Delete</button>
    `;
    card.querySelector("button").addEventListener("click", async () => {
      await apiFetch(`/api/v1/memories/${m.id}`, { method: "DELETE" });
      await loadMemories();
      await refreshStatus();
    });
    list.appendChild(card);
  });
}

document.getElementById("addMemoryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  await apiFetch("/api/v1/memories", {
    method: "POST",
    body: JSON.stringify({
      user_id: document.getElementById("memUserId").value.trim(),
      category: document.getElementById("memCategory").value,
      importance: parseInt(document.getElementById("memImportance").value, 10) || 4,
      content: document.getElementById("memContent").value.trim(),
    }),
  });
  document.getElementById("memContent").value = "";
  await loadMemories();
  await refreshStatus();
});

document.getElementById("refreshMemoriesBtn").addEventListener("click", loadMemories);

// ============================================================================
// Knowledge Base (RAG) Tab
// ============================================================================
async function loadDocuments() {
  const data = await apiFetch("/api/v1/knowledge");
  const list = document.getElementById("documentsList");
  list.innerHTML = "";

  data.documents.forEach((doc) => {
    const card = document.createElement("div");
    card.className = "list-card";
    const tagsHtml = (doc.tags || []).map((t) => `<span class="tag-pill">#${escapeHtml(t)}</span>`).join("");
    card.innerHTML = `
      <div>
        <div class="list-card-title">${escapeHtml(doc.title)}</div>
        <div class="list-card-sub">
          Source: <code>${escapeHtml(doc.source)}</code> · <strong>${doc.chunk_count}</strong> chunks (${doc.char_count} chars)
        </div>
        <div style="margin-top: 6px;">${tagsHtml}</div>
      </div>
      <button class="btn-danger-xs">Delete</button>
    `;
    card.querySelector("button").addEventListener("click", async () => {
      await apiFetch(`/api/v1/knowledge/${doc.id}`, { method: "DELETE" });
      await loadDocuments();
      await refreshStatus();
    });
    list.appendChild(card);
  });
}

document.getElementById("ingestDocForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const rawTags = document.getElementById("docTags").value;
  const tags = rawTags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  await apiFetch("/api/v1/knowledge", {
    method: "POST",
    body: JSON.stringify({
      title: document.getElementById("docTitle").value.trim(),
      source: document.getElementById("docSource").value.trim() || "manual",
      tags,
      content: document.getElementById("docContent").value.trim(),
    }),
  });

  document.getElementById("docTitle").value = "";
  document.getElementById("docContent").value = "";
  await loadDocuments();
  await refreshStatus();
});

document.getElementById("searchKnowledgeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const query = document.getElementById("ragSearchInput").value.trim();
  const data = await apiFetch("/api/v1/knowledge/search", {
    method: "POST",
    body: JSON.stringify({ query, top_k: 4 }),
  });

  const box = document.getElementById("ragSearchResults");
  box.innerHTML = "";
  if (!data.results.length) {
    box.innerHTML = `<div class="small-muted">No matching chunks found.</div>`;
    return;
  }

  data.results.forEach((hit) => {
    const el = document.createElement("div");
    el.className = "list-card";
    el.innerHTML = `
      <div>
        <div class="list-card-title">
          ${escapeHtml(hit.title)} <span class="tag-pill">score: ${hit.score}</span>
        </div>
        <div class="list-card-sub">${escapeHtml(hit.content)}</div>
      </div>
    `;
    box.appendChild(el);
  });
});

document.getElementById("refreshDocsBtn").addEventListener("click", loadDocuments);

// ============================================================================
// Tools & Sandbox Tab
// ============================================================================
const DEFAULT_TOOL_ARGS = {
  python_calculator: { expression: "sqrt(256) * 15 + mean([10, 20, 30])" },
  search_knowledge_base: { query: "production endpoints", top_k: 3 },
  save_memory: { content: "Preferred deployment target is Docker on AWS ECS", category: "preference", importance: 4 },
  recall_memory: { query: "deployment target", user_id: "default_user" },
  sql_analytics_query: { sql_query: "SELECT id, title, user_id, created_at FROM sessions LIMIT 5" },
  system_clock: {},
  web_fetch: { url: "https://httpbin.org/json", max_chars: 1000 },
};

async function loadTools() {
  const data = await apiFetch("/api/v1/tools");
  state.tools = data.tools;

  const list = document.getElementById("toolsList");
  const select = document.getElementById("sandboxToolSelect");
  list.innerHTML = "";
  select.innerHTML = "";

  data.tools.forEach((t) => {
    const card = document.createElement("div");
    card.className = "list-card";
    card.innerHTML = `
      <div style="width: 100%;">
        <div class="list-card-title"><span class="tag-pill">${escapeHtml(t.name)}</span></div>
        <div class="list-card-sub">${escapeHtml(t.description)}</div>
        <pre class="code-block">${escapeHtml(JSON.stringify(t.parameters, null, 2))}</pre>
      </div>
    `;
    list.appendChild(card);

    const opt = document.createElement("option");
    opt.value = t.name;
    opt.textContent = t.name;
    select.appendChild(opt);
  });

  select.onchange = () => {
    const sample = DEFAULT_TOOL_ARGS[select.value] || {};
    document.getElementById("sandboxToolArgs").value = JSON.stringify(sample, null, 2);
  };
  select.onchange();
}

document.getElementById("runToolForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const toolName = document.getElementById("sandboxToolSelect").value;
  const rawArgs = document.getElementById("sandboxToolArgs").value;
  const outBox = document.getElementById("sandboxToolOutput");

  try {
    const parsed = JSON.parse(rawArgs || "{}");
    const res = await apiFetch(`/api/v1/tools/${toolName}/execute`, {
      method: "POST",
      body: JSON.stringify(parsed),
    });
    outBox.textContent = JSON.stringify(res, null, 2);
    await refreshStatus();
  } catch (err) {
    outBox.textContent = `Execution Error: ${err.message}`;
  }
});

// ============================================================================
// Runtime LLM Config Tab
// ============================================================================
async function loadRuntimeConfig() {
  const cfg = await apiFetch("/api/v1/config");
  document.getElementById("cfgProvider").value = cfg.llm_provider || "auto";
  document.getElementById("cfgOpenaiModel").value = cfg.openai_model || "";
  document.getElementById("cfgOpenaiBaseUrl").value = cfg.openai_base_url || "";
  document.getElementById("cfgGeminiModel").value = cfg.gemini_model || "";
  document.getElementById("cfgAnthropicModel").value = cfg.anthropic_model || "";
  document.getElementById("cfgOllamaUrl").value = cfg.ollama_base_url || "";
  document.getElementById("cfgOllamaModel").value = cfg.ollama_model || "";
  document.getElementById("cfgSystemPrompt").value = cfg.system_prompt || "";
}

document.getElementById("runtimeConfigForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const res = await apiFetch("/api/v1/config", {
    method: "POST",
    body: JSON.stringify({
      llm_provider: document.getElementById("cfgProvider").value,
      openai_api_key: document.getElementById("cfgOpenaiKey").value,
      openai_model: document.getElementById("cfgOpenaiModel").value,
      openai_base_url: document.getElementById("cfgOpenaiBaseUrl").value,
      gemini_api_key: document.getElementById("cfgGeminiKey").value,
      gemini_model: document.getElementById("cfgGeminiModel").value,
      anthropic_api_key: document.getElementById("cfgAnthropicKey").value,
      anthropic_model: document.getElementById("cfgAnthropicModel").value,
      ollama_base_url: document.getElementById("cfgOllamaUrl").value,
      ollama_model: document.getElementById("cfgOllamaModel").value,
      system_prompt: document.getElementById("cfgSystemPrompt").value,
    }),
  });

  const notice = document.getElementById("configSaveNotice");
  notice.textContent = `✓ Updated! Active: ${res.active_provider.toUpperCase()} (${res.active_model})`;
  setTimeout(() => (notice.textContent = ""), 4000);
  await refreshStatus();
});

// Initial Boot
(async function init() {
  await refreshStatus();
  await loadSessions();
  await renderChibiVillageStage(["auto_router"]);
})();

