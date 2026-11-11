-- ============================================================
-- Razeo — Posisi flowchart tab Visualisasi (layout edit per project)
-- Jalankan di: Supabase Dashboard → SQL Editor → New query
-- (tanpa simbol ">" — itu format kutipan chat)
-- ============================================================

create table if not exists public.project_layout (
  project_id uuid primary key references public.projects (id) on delete cascade,
  -- { "<nama kategori>": { "<nodeId>": { "dx": number, "dy": number } } }
  flow_positions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS deny-all: akses hanya lewat server (pemeriksaan keanggotaan di API)
alter table public.project_layout enable row level security;