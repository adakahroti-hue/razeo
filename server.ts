// ============================================================
// Dev server — pelapis tipis untuk pengembangan lokal.
//
// PRINSIP: tidak ada logika API di sini. Semua endpoint
// di-mount LANSUNG dari file handler `api/*.ts` yang sama
// dipakai Vercel di produksi. Jadi perilaku lokal identik
// dengan produksi (project gate, koneksi per-project,
// keanggotaan, scope owner-only — semuanya ikut teruji).
//
// Jalankan: `npm run dev` (port 3000)
// ============================================================
import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const app = express();
app.use(express.json());

// Satu route Express per file handler Vercel — logika API ada di api/*.ts.
const mounts: Array<[string, string]> = [
  ["/api/auth/url", "./api/auth/url.ts"],
  ["/api/auth/status", "./api/auth/status.ts"],
  ["/api/auth/callback", "./api/auth/callback.ts"],
  ["/auth/callback", "./api/auth/callback.ts"], // alias lama, kalau ada link lama
  ["/api/auth/logout", "./api/auth/logout.ts"],
  ["/api/logs", "./api/logs.ts"],
  ["/api/logs/:id", "./api/logs/[id].ts"],
  ["/api/gsc/sites", "./api/gsc/sites.ts"],
  ["/api/gsc/data", "./api/gsc/data.ts"],
  ["/api/ga4/properties", "./api/ga4/properties.ts"],
  ["/api/ga4/data", "./api/ga4/data.ts"],
  ["/api/projects", "./api/projects.ts"],
];

async function mountAll() {
  for (const [route, modulePath] of mounts) {
    const mod = await import(modulePath);
    const handler = mod.default;
    if (typeof handler !== "function") {
      console.error(`BAD HANDLER ${modulePath}: default export bukan function`);
      continue;
    }
    // Handler Vercel tidak butuh route params — req/res Express sudah kompatibel
    app.all(route, (req, res) => {
      Promise.resolve(handler(req, res)).catch((err) => {
        console.error(`Unhandled error ${route}:`, err?.message || err);
        if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
      });
    });
    console.log(`mounted ${route}`);
  }

  // API tak dikenal → JSON 404 (jangan kirim dokumentasi SPA sebagai "API")
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Dev: middleware Vite (SPA + HMR) — harus terpasang paling akhir
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

mountAll().catch((e) => {
  console.error("Gagal mount API:", e);
  process.exit(1);
});