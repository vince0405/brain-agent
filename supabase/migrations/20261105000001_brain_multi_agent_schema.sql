-- ============================================================================
-- Brain Production Multi-Agent Schema for Supabase (Project: yqvbwrhhqivnmmiuxbgz)
-- Optimized with Supabase Postgres Best Practices:
--   1. SQL-standardGENERATED ALWAYS AS IDENTITY primary keys (schema-primary-keys)
--   2. Foreign key & composite indexes with equality-first ordering (query-composite-indexes)
--   3. Covering indexes using INCLUDE for Index-Only Scans (query-covering-indexes)
--   4. Partial indexes for hot filtered subsets (query-partial-indexes)
--   5. GIN jsonb_path_ops & generated tsvector full-text search (advanced-jsonb-indexing, advanced-full-text-search)
--   6. RLS policies using cached (SELECT auth.uid()) InitPlan pattern (security-rls-performance)
-- ============================================================================

create extension if not exists "vector";
create extension if not exists "pg_trgm";

-- 1. Specialist Agents Registry (with Chibi House/Farm Character Profiles)
create table if not exists public.specialist_agents (
    id text primary key,
    name text not null,
    role text not null,
    domain text not null default 'custom', -- 'orchestrator' | 'webapp' | 'game' | 'core' | 'custom'
    icon text not null default '🤖',
    description text not null,
    system_prompt text not null,
    keywords_json jsonb not null default '[]'::jsonb,
    preferred_tools_json jsonb not null default '[]'::jsonb,
    chibi_profile_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- Composite index for filtering specialists by domain + GIN jsonb_path_ops for keyword containment
create index if not exists idx_specialists_domain
    on public.specialist_agents (domain)
    include (name, role, icon);

create index if not exists idx_specialists_keywords_gin
    on public.specialist_agents using gin (keywords_json jsonb_path_ops);

-- 2. Monthly Trend Learnings (Strictly Trends: Web App, Game Dev & Tech Trends per YYYY-MM)
create table if not exists public.monthly_trend_learnings (
    id bigint generated always as identity primary key,
    month_key text not null,               -- e.g. '2026-11'
    domain text not null,                  -- 'webapp' | 'game' | 'core'
    agent_id text not null references public.specialist_agents(id) on delete cascade,
    trend_title text not null,
    trend_summary text not null,
    trend_tags_json jsonb not null default '[]'::jsonb,
    momentum_score integer not null default 85,
    created_at timestamptz not null default now(),
    unique (month_key, agent_id, trend_title)
);

-- Foreign key & composite covering index for fast monthly trend lookup per domain/agent
create index if not exists idx_trends_month_domain_cover
    on public.monthly_trend_learnings (month_key, domain, momentum_score desc)
    include (agent_id, trend_title, trend_summary);

create index if not exists idx_trends_agent_fk
    on public.monthly_trend_learnings (agent_id, month_key desc);

-- 3. Conversation Sessions
create table if not exists public.sessions (
    id text primary key,
    user_id text not null default 'default_user',
    title text not null default 'New Conversation',
    metadata_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Covering index avoids heap fetches when listing sessions for a user
create index if not exists idx_sessions_user_updated_cover
    on public.sessions (user_id, updated_at desc)
    include (title, created_at);

-- 4. Conversation Messages (IDENTITY PK instead of legacy bigserial)
create table if not exists public.messages (
    id bigint generated always as identity primary key,
    session_id text not null references public.sessions(id) on delete cascade,
    role text not null,
    content text not null,
    active_agents_json jsonb not null default '[]'::jsonb,
    tool_calls_json jsonb not null default '[]'::jsonb,
    metadata_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- Indexed FK + ordering column for fast session history pagination and CASCADE deletes
create index if not exists idx_messages_session_id_asc
    on public.messages (session_id, id asc)
    include (role, created_at);

-- 5. Persistent Long-Term Episodic Memories
create table if not exists public.memories (
    id text primary key,
    user_id text not null default 'default_user',
    content text not null,
    category text not null default 'general',
    importance integer not null default 3,
    embedding_json jsonb not null default '[]'::jsonb,
    embedding vector(128),
    metadata_json jsonb not null default '{}'::jsonb,
    search_vector tsvector generated always as (
        to_tsvector('english', coalesce(category, '') || ' ' || coalesce(content, ''))
    ) stored,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Composite index: equality columns (user_id, category) first, range/sort (importance, updated_at) last
create index if not exists idx_memories_user_cat_imp
    on public.memories (user_id, category, importance desc, updated_at desc)
    include (content);

-- Partial index for high-importance core memories (importance >= 4) recalled on every turn
create index if not exists idx_memories_core_partial
    on public.memories (user_id, updated_at desc)
    include (content, category, importance)
    where importance >= 4;

-- Full-text search GIN index on generated tsvector (100x faster than LIKE '%...%')
create index if not exists idx_memories_fts_gin
    on public.memories using gin (search_vector);

-- 6. Knowledge Base Documents & Chunks (Hybrid RAG)
create table if not exists public.documents (
    id text primary key,
    title text not null,
    source text not null default 'manual',
    tags_json jsonb not null default '[]'::jsonb,
    content text not null,
    metadata_json jsonb not null default '{}'::jsonb,
    search_vector tsvector generated always as (
        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, ''))
    ) stored,
    created_at timestamptz not null default now()
);

create index if not exists idx_documents_tags_gin
    on public.documents using gin (tags_json jsonb_path_ops);

create index if not exists idx_documents_fts_gin
    on public.documents using gin (search_vector);

create table if not exists public.document_chunks (
    id text primary key,
    document_id text not null references public.documents(id) on delete cascade,
    chunk_index integer not null,
    content text not null,
    embedding_json jsonb not null default '[]'::jsonb,
    embedding vector(128),
    search_vector tsvector generated always as (
        to_tsvector('english', coalesce(content, ''))
    ) stored,
    created_at timestamptz not null default now()
);

-- Foreign key composite index for fast JOINs and ON DELETE CASCADE
create index if not exists idx_chunks_doc_id_order
    on public.document_chunks (document_id, chunk_index asc);

-- Full-text search GIN index for lexical hybrid retrieval
create index if not exists idx_chunks_fts_gin
    on public.document_chunks using gin (search_vector);

-- HNSW vector index for fast approximate nearest-neighbor semantic search
create index if not exists idx_chunks_embedding_hnsw
    on public.document_chunks using hnsw (embedding vector_cosine_ops);

-- 7. Telemetry Logs (IDENTITY PK + Partial Index for Errors)
create table if not exists public.telemetry_logs (
    id bigint generated always as identity primary key,
    session_id text,
    user_id text,
    provider text,
    model text,
    specialist_ids text,
    tool_count integer default 0,
    latency_ms double precision default 0.0,
    status text default 'ok',
    created_at timestamptz not null default now()
);

create index if not exists idx_telemetry_user_created
    on public.telemetry_logs (user_id, created_at desc)
    include (latency_ms, provider, model);

-- Partial index for fast diagnostics on non-OK turns (5-20x smaller index)
create index if not exists idx_telemetry_errors_partial
    on public.telemetry_logs (created_at desc)
    where status <> 'ok';

-- ============================================================================
-- Row-Level Security (RLS) with Cached (SELECT auth.uid()) InitPlan Optimization
-- ============================================================================
alter table public.specialist_agents enable row level security;
alter table public.monthly_trend_learnings enable row level security;
alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.memories enable row level security;
alter table public.documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.telemetry_logs enable row level security;

-- Wrap auth.uid() in (SELECT auth.uid()) so Postgres caches the result once per query
create policy sessions_tenant_isolation on public.sessions
    for all to authenticated
    using (user_id = coalesce((select auth.uid())::text, 'default_user'))
    with check (user_id = coalesce((select auth.uid())::text, 'default_user'));

create policy memories_tenant_isolation on public.memories
    for all to authenticated
    using (user_id = coalesce((select auth.uid())::text, 'default_user'))
    with check (user_id = coalesce((select auth.uid())::text, 'default_user'));

create policy messages_via_session_isolation on public.messages
    for all to authenticated
    using (
        exists (
            select 1 from public.sessions s
            where s.id = messages.session_id
              and s.user_id = coalesce((select auth.uid())::text, 'default_user')
        )
    );

create policy read_only_specialists on public.specialist_agents
    for select to anon, authenticated
    using (true);

create policy read_only_monthly_trends on public.monthly_trend_learnings
    for select to anon, authenticated
    using (true);
