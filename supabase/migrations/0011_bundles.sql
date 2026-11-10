-- ============================================================
-- Razeo — Tabel bundle (sub-tab Bundle di tab Konten)
-- Jalankan di: Supabase Dashboard → SQL Editor → New query
-- (tanpa simbol ">" — itu format kutipan chat)
-- ============================================================

create table if not exists public.bundles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  uid text not null,                     -- pembuat baris (audit trail)
  url_bundle text not null,              -- URL bundle
  nama_bundle text not null,             -- nama bundle
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bundles_project_idx
  on public.bundles (project_id, created_at desc);

-- RLS deny-all: akses hanya lewat server (pemeriksaan keanggotaan di API)
alter table public.bundles enable row level security;