// /api/projects — daftar / buat project, buat undangan, tebus undangan
// GET                                → daftar project milik user (bootstrap otomatis)
// POST { name }                      → buat project baru milik sendiri
// POST { action:"invite" }           → buat link undangan utk project (header X-Project-Id)
// POST { action:"redeem", token }    → masuk project lewat link undangan
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, requireUser, listProjects, isMember, projectFrom, inviteToken, requireProject } from "razeo-shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    if (req.method === "GET") {
      const projects = await listProjects(user.uid);
      return res.status(200).json({ projects });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const action = String(body.action || "").trim();

      // --- tebus link undangan (masuk project sebagai anggota) ---
      if (action === "redeem") {
        const token = String(body.token || "").trim();
        if (!token) return res.status(400).json({ error: "Token undangan kosong" });
        const { data: inv, error } = await supabase
          .from("invitations")
          .select("id, project_id, expires_at, revoked_at, projects(name)")
          .eq("token", token)
          .maybeSingle();
        if (error) throw error;
        if (!inv) return res.status(404).json({ error: "Link undangan tidak ditemukan" });
        const rows: any = Array.isArray((inv as any).projects) ? (inv as any).projects[0] : (inv as any).projects;
        if ((inv as any).revoked_at) return res.status(410).json({ error: "Undangan sudah dibatalkan" });
        if (new Date((inv as any).expires_at) < new Date()) {
          return res.status(410).json({ error: "Undangan sudah kedaluwarsa" });
        }
        const { data: existing } = await supabase
          .from("project_members")
          .select("project_id")
          .eq("project_id", (inv as any).project_id)
          .eq("uid", user.uid)
          .maybeSingle();
        if (!existing) {
          const { error: e2 } = await supabase
            .from("project_members")
            .insert({ project_id: (inv as any).project_id, uid: user.uid, role: "member" });
          if (e2) throw e2;
        }
        return res.status(200).json({
          project_id: (inv as any).project_id,
          name: rows?.name || null,
          joined: !existing,
        });
      }

      // --- buat undangan utk project aktif ---
      if (action === "invite") {
        const projectId = projectFrom(req);
        const role = await isMember(user.uid, projectId);
        if (!role) return res.status(404).json({ error: "Bukan anggota project ini" });
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

      // --- ganti nama project (HANYA pemilik project) ---
      if (action === "rename") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        if (info.role !== "owner") return res.status(403).json({ error: "Hanya pemilik project yang boleh mengganti nama" });
        const name = String(body.name || "").trim().slice(0, 120);
        if (!name) return res.status(400).json({ error: "Nama project wajib diisi" });
        const { data, error } = await supabase
          .from("projects")
          .update({ name })
          .eq("id", info.projectId)
          .select("id, name")
          .single();
        if (error) throw error;
        return res.status(200).json({ project: data });
      }

      // --- info project aktif + koneksi GSC/GA4 (siapa pun anggota boleh baca) ---
      if (action === "connection-get") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        return res.status(200).json({
          project: info.project,
          role: info.role,
          connection: info.connection,
        });
      }

      // --- simpan/connect properti GSC & GA4 (HANYA pemilik project) ---
      if (action === "connection-save") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        if (info.role !== "owner") {
          return res.status(403).json({ error: "Hanya pemilik project yang boleh connect data" });
        }
        const gsc = body.gsc_site === undefined ? undefined : (body.gsc_site ? String(body.gsc_site).slice(0, 2048) : null);
        const ga4 = body.ga4_property === undefined ? undefined : (body.ga4_property ? String(body.ga4_property).slice(0, 128) : null);
        const patch: any = { owner_uid: user.uid, updated_at: new Date().toISOString() };
        if (gsc !== undefined) patch.gsc_site = gsc;
        if (ga4 !== undefined) patch.ga4_property = ga4;
        if (gsc !== null || ga4 !== null) patch.connected_at = new Date().toISOString();
        const { data, error } = await supabase
          .from("project_connections")
          .upsert({ project_id: info.projectId, ...patch }, { onConflict: "project_id" })
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json({ connection: data });
      }

      // --- buat project baru ---
      const { name } = body;
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
