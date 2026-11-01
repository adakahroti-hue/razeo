// Tes: import modul _lib (tempat requireUser hidup)
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const mod: any = await import("./_lib");
    const user = await mod.requireUser(req);
    res.status(200).json({ step: "lib-ok", user });
  } catch (e: any) {
    res.status(200).json({ step: "lib-failed", message: String(e?.message || e) });
  }
}