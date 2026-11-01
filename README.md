# Razeo — SEO Content Audit

Audit SEO yang tersambung ke **Google Search Console** & **GA4**, dengan database **Supabase** (pengganti Firestore).

Repo ini diduplikasi dari `SEO-Audit-Ultimate` dengan perubahan utama: semua penyimpanan data dipindah ke Supabase.

## Arsitektur

- **Frontend** (`src/App.tsx`) — React 19 + Vite + Tailwind CSS v4
- **API server** (`server.ts`) — Express: OAuth Google, endpoint GSC/GA4, dan `/api/logs`
- **Login** — Supabase Auth (Google OAuth), token dibawa ke API server
- **Database** — Supabase (PostgreSQL): tabel `logs` & `user_tokens`
- **Keamanan** — kunci database (service-role) hanya ada di server; frontend tidak pernah memegangnya, dan Row Level Security (RLS) aktif

## Alur data

1. User login dengan Google (Supabase Auth → OAuth).
2. Server memverifikasi token JWT Supabase.
3. User menghubungkan akun Google (OAuth) untuk Search Console & GA4 → token disimpan di tabel `user_tokens`.
4. Data log optimasi dibaca/ditulis lewat `/api/logs` (server → Supabase).

## Menjalankan lokal

```bash
npm install
cp .env.example .env.local    # isi semua isinya
npm run dev                   # buka http://localhost:3000
```

### Setup database (wajib sekali)

Buka **Supabase Dashboard → SQL Editor**, jalankan isi file:

`supabase/migrations/0001_init.sql`

Ini membuat tabel `logs`, `user_tokens`, index, dan mengaktifkan RLS.

## Perintah

| Perintah        | Fungsi                          |
|-----------------|---------------------------------|
| `npm run dev`   | jalan lokal (dev, Vite + API)   |
| `npm run build` | build frontend ke `dist/`       |
| `npm run start` | produksi (serve `dist/` + API)  |
| `npm run lint`  | cek TypeScript (`tsc --noEmit`) |

## Perubahan dari versi asli

- 🔄 Auth: Firebase → **Supabase Auth** (login Google, JWT)
- 🔄 Database: Firestore → **Supabase** (tabel `logs`, `user_tokens`)
- 🔐 Log diakses lewat API server (`/api/logs`) — kunci Supabase tidak pernah menyentuh browser
- 🧹 Dependency sampah dibuang: `@google/genai`, `better-sqlite3`, `date-fns` (tidak pernah dipakai)
- ➕ ditambah: `@supabase/supabase-js`
- 📄 `firestore.rules`, `firebase-applet-config.json`, dependensi `firebase`/`firebase-admin` dihapus (firebase sudah tidak dipakai sama sekali)