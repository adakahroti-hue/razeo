-- 0012: branded_keywords (daftar keyword branded utk tab Insight)
-- Disimpan di project_events (satu baris per project, jsonb array string).
-- Jalankan di Supabase SQL Editor (tanpa simbol ">").

alter table public.project_events
  add column if not exists branded_keywords jsonb not null default '[]'::jsonb;
