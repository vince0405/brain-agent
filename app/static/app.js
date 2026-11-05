// Brain Production Agent Studio - Frontend Logic

const state = {
  currentSessionId: null,
  tools: [],
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
  } catch (err) {
    document.getElementById("activeProviderLabel").textContent = "Offline / Error";
  }
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
    appendMessageBubble("assistant", res.reply, {
      toolCalls: res.tool_calls,
      retrievedContext: res.retrieved_context,
      memoriesSaved: res.memories_saved,
      activeSpecialists: res.active_specialists || [],
      meta: {
        provider: res.provider,
        model: res.model,
        latency_ms: res.latency_ms,
        specialists: (res.active_specialists || []).map((s) => `${s.icon} ${s.name}`).join(" + "),
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
  const list = document.getElementById("specialistsList");
  list.innerHTML = "";

  data.specialists.forEach((sp) => {
    const card = document.createElement("div");
    card.className = "list-card";
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
          <span class="tag-pill">${escapeHtml(sp.domain.toUpperCase())}</span>
          <span class="tag-pill">id: ${escapeHtml(sp.id)}</span>
        </div>
        <div class="list-card-sub" style="color: #a5b4fc; margin-bottom: 4px;">${escapeHtml(sp.role)}</div>
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
})();

