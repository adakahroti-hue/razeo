// Probe: apakah modul _lib (requireUser/supabase) bisa di-import di runtime Vercel?
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const mod: any = await import("./_lib");
    const user = await mod.requireUser(req);
    res.status(200).json({ ok: true, user: user ?? null });
  } catch (e: any) {
    res.status(200).json({ ok: false, message: String(e?.message || e), stack: String(e?.stack || "").slice(0, 600) });
  }
}