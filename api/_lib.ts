// Modul bersama untuk API serverless Vercel — dipakai semua route di /api/*.
// Kunci Supabase hanya hidup di server (env Vercel), tidak pernah sampai browser.
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("WARNING: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — auth & API will fail.");
}

export const supabase: SupabaseClient = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY || "placeholder",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Verifikasi koneksi saat cold start — selalu ditangkap, tidak pernah unhandled rejection
Promise.resolve(supabase.from("logs").select("id").limit(1))
  .then(({ error }) => {
    if (error) console.error("Supabase connection check failed:", error.message);
    else console.log("Supabase connection verified successfully");
  })
  .catch((e) => console.error("Supabase connection check crashed:", e?.message || e));

export interface AuthedUser {
  uid: string;
  email?: string;
}

// Verifikasi token login Supabase JWT dari header Authorization.
// Kembalikan user, atau null kalau token tidak valid (handler wajib balas 401).
export async function requireUser(req: VercelRequest): Promise<AuthedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return { uid: data.user.id, email: data.user.email };
  } catch {
    return null;
  }
}