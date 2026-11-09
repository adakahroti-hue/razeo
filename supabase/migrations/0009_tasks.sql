-- ============================================================
-- Razeo — Tabel rencana tugas (tab Task)
-- Jalankan di: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  uid text not null,                              -- pembuat baris (audit trail)
  nama_tugas text not null,                       -- nama tugas / rencana kerja
  prioritas text default 'sedang',                -- rendah | sedang | tinggi
  status text default 'rencana',                  -- rencana | proses | selesai
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_project_idx
  on public.tasks (project_id, created_at desc);

-- RLS deny-all: akses hanya lewat server (pemeriksaan keanggotaan dilakukan di API)
alter table public.tasks enable row level security;