-- ============================================================
-- Razeo — skema database Supabase (pengganti Firestore)
-- Jalankan di: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Tokens OAuth Google (untuk Search Console & GA4)
-- Disimpan server-side dengan service-role key, TIDAK dibaca dari browser.
create table if not exists public.user_tokens (
  uid text primary key,             -- Firebase UID user yang login
  tokens jsonb not null,            -- token OAuth Google (access_token, refresh_token, dll.)
  updated_at timestamptz not null default now()
);

-- 2. Log optimasi SEO (Pelacak Aksi SEO)
create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  uid text not null,                -- pemilik log (Firebase UID)
  url text not null check (char_length(url) between 1 and 2048),
  date date not null,               -- tanggal audit (YYYY-MM-DD)
  aspect text[] not null default '{}', -- daftar aspek yang dioptimasi
  queries text,                     -- query pencarian terkait
  before text not null default '',  -- kondisi sebelum optimasi
  after text not null default '',   -- kondisi sesudah optimasi
  note text,                        -- catatan opsional
  created_at timestamptz not null default now()
);

create index if not exists logs_uid_date_idx on public.logs (uid, date desc);

-- Hapus Firestore lama jika pernah ada (opsional)
-- drop table if exists firestore_logs;

-- ============================================================
-- Row Level Security (keamanan level baris)
-- API server memakai service-role key (melewati RLS).
-- Anon key (browser) TIDAK boleh baca/tulis data ini.
-- ============================================================
alter table public.user_tokens enable row level security;
alter table public.logs enable row level security;

-- Tidak ada policy anon → anon key ditolak. Service role bebas.
-- Jika kelak ingin akses langsung dari browser, tambahkan policy
-- misal using (auth.uid() = uid) — tapi sekarang tidak perlu.