-- ============================================================
-- Razeo — Tabel pendataan konten (tab Konten)
-- Jalankan di: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  uid text not null,                      -- pembuat baris (audit trail)
  kategori text,                          -- kategori konten (mis. "Blog", "Landing")
  target_keyword text,                    -- keyword target utama
  judul text not null,                    -- judul artikel
  tanggal_publikasi date,                 -- tanggal publikasi
  link_artikel text,                      -- URL artikel
  peran text,                             -- "role" perancang pembuat (mis. Penulis, Editor)
  prioritas text default 'sedang',        -- rendah | sedang | tinggi
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_items_project_idx
  on public.content_items (project_id, created_at desc);

-- RLS deny-all: akses hanya lewat server (pemeriksaan keanggotaan dilakukan di API)
alter table public.content_items enable row level security;