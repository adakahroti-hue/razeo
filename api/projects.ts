// GET /api/projects — daftar project user (auto-buat saat login pertama)
// POST — buat project baru milik sendiri
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, requireUser, listProjects } from "razeo-shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    if (req.method === "GET") {
      const projects = await listProjects(user.uid);
      return res.status(200).json({ projects });
    }
    if (req.method === "POST") {
      const { name } = req.body || {};
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: "Nama project wajib diisi" });
      }
      const { data: proj, error } = await supabase
        .from("projects")
        .insert({ name: String(name).trim().slice(0, 120), owner_uid: user.uid })
        .select()
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase
        .from("project_members")
        .insert({ project_id: proj.id, uid: user.uid, role: "owner" });
      if (e2) throw e2;
      return res.status(201).json({ id: proj.id, name: proj.name, role: "owner" });
    }
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error: any) {
    console.error("projects error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
