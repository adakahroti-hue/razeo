-- 0012: kolom isi_artikel di content_items (sub-tab Artikel)
-- Isi teks mode HTML WordPress utuh (tanpa tag <html>/<head>; kira 40-200KB per artikel).
-- Jalankan di Supabase SQL Editor (tanpa simbol ">").

alter table public.content_items
  add column if not exists isi_artikel text;
