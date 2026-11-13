-- ============================================================
-- Razeo — Core Web Vitals (kartu di tab Insight)
-- Jalankan di: Supabase Dashboard → SQL Editor → New query
-- (tanpa simbol ">" — itu format kutipan chat)
--
-- Sumber data: pengukuran Lighthouse (lokal, harian via cron) —
-- bukan PageSpeed Insights API (kuota publik habis / butuh API key).
-- ============================================================

create table if not exists public.site_cwv (
  site text primary key,                  -- hostname target, mis. 'daykit.id'
  measured_at timestamptz not null,        -- waktu pengukuran
  score int not null,                      -- skor performa Lighthouse 0-100
  -- { lcp, cls, tbt, fcp, speedIndex, tti } — nilai mentah + display
  metrics jsonb not null default '{}'::jsonb,
  -- daftar "yang perlu diperbaiki": [{ id, title, savings, displayValue, group }]
  fixes jsonb not null default '[]'::jsonb,
  -- audit mentah ringkas (opsional, utk debugging)
  lighthouse_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS deny-all: akses hanya lewat server (pemeriksaan keanggotaan di API)
alter table public.site_cwv enable row level security;
