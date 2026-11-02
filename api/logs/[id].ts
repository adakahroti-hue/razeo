// DELETE /api/logs/:id — hapus log (hmilik sendiri, atau dalam scope project)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, requireUser, isMember, projectFrom } from "razeo-shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!id) return res.status(400).json({ error: "id wajib" });

  const projectId = projectFrom(req);
  try {
    let q = supabase.from("logs").delete().eq("id", id);
    if (projectId) {
      const role = await isMember(user.uid, projectId);
      if (!role) return res.status(404).json({ error: "Bukan anggota project ini" });
      q = q.eq("project_id", projectId);
    } else {
      q = q.eq("uid", user.uid);
    }
    const { error } = await q;
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error("delete log error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
