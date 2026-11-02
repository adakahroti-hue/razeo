// POST /api/projects/invite — buat link undangan (hanya owner project)
// GET — daftar undangan aktif di project ini
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, requireUser, isMember, projectFrom, inviteToken } from "razeo-shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  const projectId = projectFrom(req);

  try {
    const role = await isMember(user.uid, projectId);
    if (!role) return res.status(404).json({ error: "Bukan anggota project ini" });

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("invitations")
        .select("id, token, expires_at, revoked_at, created_at")
        .eq("project_id", projectId)
        .is("revoked_at", null)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return res.status(200).json({ invitations: data || [] });
    }

    if (req.method === "POST") {
      if (role !== "owner") {
        return res.status(403).json({ error: "Hanya pemilik project yang bisa mengundang" });
      }
      const { data, error } = await supabase
        .from("invitations")
        .insert({ project_id: projectId, token: inviteToken(), created_by: user.uid })
        .select("id, token, expires_at, created_at")
        .single();
      if (error) throw error;
      return res.status(201).json({ invitation: data });
    }
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error: any) {
    console.error("invite error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
