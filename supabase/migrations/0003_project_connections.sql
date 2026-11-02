-- ============================================================
-- Razeo v3 — Koneksi GSC/GA4 per project (khusus pemilik project)
-- Jalankan di: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Koneksi data analytics suatu project:
-- yang memilih properti = PEMILIK project; anggota lain hanya membaca.
-- Token Google yang dipakai mengambil data = token milik owner_uid.
create table if not exists public.project_connections (
  project_id uuid primary key references public.projects (id) on delete cascade,
  owner_uid text not null,             -- pemilik koneksi (token GSC/GA4 diambil dari sini)
  gsc_site text,                       -- siteUrl GSC yang dipilih (null = belum connect)
  ga4_property text,                   -- property ID GA4 yang dipilih (null = belum)
  connected_at timestamptz,            -- waktu connect terakhir
  updated_at timestamptz not null default now()
);

-- RLS deny-all (akses hanya lewat service-role di server)
alter table public.project_connections enable row level security;