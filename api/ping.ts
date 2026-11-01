// Endpoint minimal: memverifikasi runtime function Vercel tanpa dependensi berat.
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ ok: true, env_supabase: !!process.env.SUPABASE_URL, has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY });
}