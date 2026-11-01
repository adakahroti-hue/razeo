// Tes: apakah import supabase-js / modul _lib bisa dimuat di runtime Vercel?
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // 1) import dinamis supabase-js
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { error } = await sb.from("logs").select("id").limit(1);
    res.status(200).json({ step: "supabase-ok", restError: error ? error.message : null });
  } catch (e: any) {
    res.status(200).json({ step: "failed", message: String(e?.message || e) });
  }
}