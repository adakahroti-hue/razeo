// Kode bersama API — dipakai semua handler sebagai package node_modules
// "razeo-shared" (bukan *.ts lokal) supaya pasti ikut ter-bundle di Vercel.
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { google } from "googleapis";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("WARNING: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — auth & API will fail.");
}

export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY || "placeholder",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Verifikasi koneksi saat cold start — selalu ditangkap, tanpa unhandled rejection
Promise.resolve(supabase.from("logs").select("id").limit(1))
  .then(({ error }) => {
    if (error) console.error("Supabase connection check failed:", error.message);
    else console.log("Supabase connection verified successfully");
  })
  .catch((e) => console.error("Supabase connection check crashed:", e?.message || e));

/** Verifikasi token login Supabase. Return user atau null (handler wajib 401). */
export async function requireUser(req) {
  const authHeader = req.headers?.authorization;
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

// ===== Google OAuth (Search Console & GA4) =====

export function getRedirectUri(req) {
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (appUrl) return `${appUrl}/api/auth/callback`;
  const proto =
    (req.headers["x-forwarded-proto"]) ||
    (req.headers.host?.includes("vercel.app") ? "https" : "http");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}/api/auth/callback`;
}

export function newOAuth2Client(redirectUri) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

/** Klien OAuth milik user, atau null kalau belum hubungkan akun. */
export async function getClientForUser(uid, req) {
  const { data, error } = await supabase
    .from("user_tokens")
    .select("tokens")
    .eq("uid", uid)
    .maybeSingle();
  if (error || !data?.tokens) {
    if (error) console.error("Failed to read user_tokens from Supabase:", error.message);
    return null;
  }
  const client = newOAuth2Client(getRedirectUri(req));
  client.setCredentials({ ...data.tokens, redirect_uri: getRedirectUri(req) });
  return client;
}

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
];