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

// ===== Projects & keanggotaan (multi-user) =====

import { randomBytes } from "crypto";

/** Token link undangan acak (aman, 24 byte base64url). */
export function inviteToken() {
  return randomBytes(18).toString("base64url");
}

/**
 * Pastikan user punya minimal 1 project (auto-bootstrap).
 * Login pertama = project sendiri; login lagi = pakai project lama.
 * Return array project di mana user menjadi anggota.
 */
export async function listProjects(uid) {
  const { data, error } = await supabase
    .from("project_members")
    .select("project_id, role, projects(id, name, owner_uid, created_at)")
    .eq("uid", uid);
  if (error) throw error;
  const list = (data || []).map((r) => ({
    id: r.project_id,
    role: r.role,
    name: r.projects?.name,
    owner_uid: r.projects?.owner_uid,
    created_at: r.projects?.created_at,
  }));
  if (list.length > 0) return list;

  // belum ada project → buat milik pribadi
  const { data: proj, error: e1 } = await supabase
    .from("projects")
    .insert({ name: "Project Saya", owner_uid: uid })
    .select()
    .single();
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from("project_members")
    .insert({ project_id: proj.id, uid, role: "owner" });
  if (e2) throw e2;
  return [{ id: proj.id, role: "owner", name: proj.name, owner_uid: uid, created_at: proj.created_at }];
}

/** Apakah user ini anggota project tsb? Return role, atau null jika bukan anggota. */
export async function isMember(uid, projectId) {
  if (!projectId) return false;
  const { data, error } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("uid", uid)
    .maybeSingle();
  if (error) throw error;
  return data ? data.role : null;
}

/** Baca header X-Project-Id dari request. */
export function projectFrom(req) {
  const v = req.headers?.["x-project-id"];
  return typeof v === "string" ? v : null;
}

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
];