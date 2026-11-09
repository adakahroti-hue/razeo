-- 0008: kolom internal_link di content_items (tab Konten)
-- Daftar URL artikel lain yang di-link dari konten ini (satu URL per baris).
-- Jalankan di Supabase SQL Editor.
alter table public.content_items
  add column if not exists internal_link text;
