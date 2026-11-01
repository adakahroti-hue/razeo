// Helper OAuth Google untuk Search Console & GA4 (token disimpan di tabel user_tokens)
import { google } from "googleapis";
import type { VercelRequest } from "@vercel/node";
import { supabase } from "./_lib";

// URL callback OAuth milik aplikasi
export function getRedirectUri(req: VercelRequest): string {
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (appUrl) return `${appUrl}/api/auth/callback`;
  const proto =
    (req.headers["x-forwarded-proto"] as string) ||
    (req.headers.host?.includes("vercel.app") ? "https" : "http");
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}/api/auth/callback`;
}

export function newOAuth2Client(redirectUri?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  );
}

// Kembalikan klien OAuth milik user, atau null kalau belum pernah hubungkan akun
export async function getClientForUser(
  uid: string,
  req: VercelRequest
) {
  const { data, error } = await supabase
    .from("user_tokens")
    .select("tokens")
    .eq("uid", uid)
    .maybeSingle();
  if (error || !data?.tokens) {
    if (error) console.error("Failed to read user_tokens from Supabase:", error.message);
    return null;
  }
  const client = newOAuth2Client();
  client.setCredentials({ ...data.tokens, redirect_uri: getRedirectUri(req) });
  return client;
}

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
];