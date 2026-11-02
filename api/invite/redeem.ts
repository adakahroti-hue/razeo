// POST /api/invite/redeem { "token": "..." } — masuk project via link undangan
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, requireUser } from "razeo-shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = String(req.body?.token || "").trim();
  if (!token) return res.status(400).json({ error: "Token undangan kosong" });

  try {
    const { data: found, error } = await supabase
      .from("invitations")
      .select("id, project_id, expires_at, revoked_at, projects(name)")
      .eq("token", token)
      .maybeSingle();
    if (error) throw error;
    // relasi bisa berupa objek atau array (subjek diketahui)
    const rel: any = (found as any) && (Array.isArray((found as any).projects) ? {...(found as any), projects: (found as any).projects[0]} : found);
    const inv: any = rel;
    if (!inv) return res.status(404).json({ error: "Link undangan tidak ditemukan" });
    if (inv.revoked_at) return res.status(410).json({ error: "Undangan sudah dibatalkan" });
    if (new Date(inv.expires_at) < new Date()) {
      return res.status(410).json({ error: "Undangan sudah kedaluwarsa" });
    }

    // sudah anggota? → idempotent, anggap sukses
    const { data: existing } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("project_id", inv.project_id)
      .eq("uid", user.uid)
      .maybeSingle();
    if (!existing) {
      const { error: e2 } = await supabase
        .from("project_members")
        .insert({ project_id: inv.project_id, uid: user.uid, role: "member" });
      if (e2) throw e2;
    }
    return res.status(200).json({
      project_id: inv.project_id,
      name: inv.projects?.name || null,
      joined: !existing,
    });
  } catch (error: any) {
    console.error("redeem error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
