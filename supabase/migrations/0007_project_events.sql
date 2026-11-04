-- ============================================================
-- Razeo — Nama event scroll & CTA per project (disimpan di DB)
-- Jalankan di: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create table if not exists public.project_events (
  project_id uuid primary key references public.projects (id) on delete cascade,
  scroll25 text not null default 'scroll_25',
  scroll50 text not null default 'scroll_50',
  scroll75 text not null default 'scroll_75',
  ctas jsonb not null default '["click_cta_article", "click_cta_ke_produk", "purchase"]'::jsonb,
  updated_at timestamptz not null default now()
);

-- RLS deny-all: akses hanya lewat server (pemeriksaan keanggotaan di API)
alter table public.project_events enable row level security;