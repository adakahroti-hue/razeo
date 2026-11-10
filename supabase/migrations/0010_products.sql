-- ============================================================
-- Razeo — Tabel produk (sub-tab Produk di tab Konten)
-- Jalankan di: Supabase Dashboard → SQL Editor → New query
-- (jangan ikut simbol ">" — itu format kutipan chat)
-- ============================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  uid text not null,                           -- pembuat baris (audit trail)
  kategori text,                               -- kategori produk
  nama_produk text not null,                   -- nama produk
  judul_produk text,                           -- judul untuk halaman/artikel
  link_artikel text,                           -- URL artikel terkait
  link_shopee text,                            -- URL produk di Shopee
  harga numeric,                               -- harga rupiah
  tanggal_publikasi date,                      -- tanggal publikasi
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_project_idx
  on public.products (project_id, created_at desc);

-- RLS deny-all: akses hanya lewat server (pemeriksaan keanggotaan di API)
alter table public.products enable row level security;