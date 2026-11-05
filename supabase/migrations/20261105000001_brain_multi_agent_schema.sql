-- ============================================================================
-- Brain Production Multi-Agent Schema for Supabase (Project: yqvbwrhhqivnmmiuxbgz)
-- Includes: Sessions, Messages, Episodic Memories, RAG Documents/Chunks,
-- Specialist Sub-Agents (Web App & Game Dev), and Telemetry
-- ============================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "vector";

-- 1. Specialist Agents Registry (Web App & Game Dev Specialists)
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
    created_at timestamptz not null default now()
);

-- 2. Conversation Sessions
create table if not exists public.sessions (
    id text primary key,
    user_id text not null default 'default_user',
    title text not null default 'New Conversation',
    metadata_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_sessions_user_id on public.sessions(user_id, updated_at desc);

-- 3. Conversation Messages
create table if not exists public.messages (
    id bigserial primary key,
    session_id text not null references public.sessions(id) on delete cascade,
    role text not null,
    content text not null,
    active_agents_json jsonb not null default '[]'::jsonb,
    tool_calls_json jsonb not null default '[]'::jsonb,
    metadata_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_messages_session_id on public.messages(session_id, id asc);

-- 4. Persistent Long-Term Episodic Memories
create table if not exists public.memories (
    id text primary key,
    user_id text not null default 'default_user',
    content text not null,
    category text not null default 'general',
    importance integer not null default 3,
    embedding_json jsonb not null default '[]'::jsonb,
    metadata_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_memories_user_id on public.memories(user_id, importance desc);

-- 5. Knowledge Base Documents & Chunks (Hybrid RAG)
create table if not exists public.documents (
    id text primary key,
    title text not null,
    source text not null default 'manual',
    tags_json jsonb not null default '[]'::jsonb,
    content text not null,
    metadata_json jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create table if not exists public.document_chunks (
    id text primary key,
    document_id text not null references public.documents(id) on delete cascade,
    chunk_index integer not null,
    content text not null,
    embedding_json jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_chunks_doc_id on public.document_chunks(document_id, chunk_index asc);

-- 6. Telemetry Logs
create table if not exists public.telemetry_logs (
    id bigserial primary key,
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
