-- 0006: kolom meta_deskripsi di content_items (tab Konten)
-- Jalankan di Supabase SQL Editor.
alter table public.content_items
  add column if not exists meta_deskripsi text;
