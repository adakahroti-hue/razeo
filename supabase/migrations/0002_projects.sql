-- ============================================================
-- Razeo v2 — Multi User & Multi Project
-- Jalankan di: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Projects (wadah data: tiap orang punya project sendiri)
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  owner_uid text not null,             -- pembuat project
  created_at timestamptz not null default now()
);

-- 2. Keanggotaan — siapa boleh akses project apa (default: hanya pemilik)
create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  uid text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (project_id, uid)
);
create index if not exists project_members_uid_idx on public.project_members (uid);

-- 3. Undangan berbasis LINK (magic link) — opsi yang dipilih Aldy
--    Siapa pun yang login menebus token link ini jadi anggota.
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  token text not null unique,          -- potongan acak di URL undangan
  created_by text not null,            -- pengundang (siapa membuat link)
  expires_at timestamptz not null default now() + interval '30 days',
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists invitations_project_idx on public.invitations (project_id);

-- 4. Logs kehilangan keterikatan uid-as-pemilik → pindah ke project
alter table public.logs add column if not exists project_id uuid references public.projects (id) on delete cascade;
create index if not exists logs_project_date_idx on public.logs (project_id, date desc);

-- ============================================================
-- RLS (Row Level Security) — keamanan di LEVEL DATABASE.
-- Semua baca/tulis lewat service-role key milik server (melewati RLS),
-- tapi tetap isi policy "deny-all" supaya anon key / browser langsung
-- TIDAK bisa menyentuh tabel ini walau tahu tabelnya.
-- ============================================================
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.invitations enable row level security;

-- Tidak ada policy untuk anon → ditolak semua. Service role bebas.