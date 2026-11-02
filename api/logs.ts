// GET / POST /api/logs — log optimasi SEO (tabel `logs` di Supabase)
// Header opsional X-Project-Id: baca/tulis dalam scope satu project.
// Tanpa header → perilaku lama (semua log milik user tsb, backward-compat).
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, requireUser, isMember, projectFrom } from "razeo-shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const projectId = projectFrom(req);
  // jika minta scope project → wajib anggota
  if (projectId) {
    try {
      const role = await isMember(user.uid, projectId);
      if (!role) return res.status(404).json({ error: "Bukan anggota project ini" });
    } catch (e: any) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === "GET") {
    try {
      let q = supabase.from("logs").select("*");
      q = projectId
        ? q.eq("project_id", projectId)
        : q.eq("uid", user.uid);
      const { data, error } = await q
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return res.status(200).json(data || []);
    } catch (error: any) {
      console.error("Failed to fetch logs:", error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "POST") {
    const { url, date, aspect, queries, before, after, note } = req.body || {};
    if (!url || !date || !Array.isArray(aspect) || aspect.length === 0) {
      return res.status(400).json({ error: "url, date, dan aspect (minimal 1) wajib diisi" });
    }
    if (date.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date harus format YYYY-MM-DD" });
    }
    try {
      const row: any = {
        uid: user.uid,
        url: String(url).slice(0, 2048),
        date,
        aspect,
        queries: queries || null,
        before: before || "",
        after: after || "",
        note: note || null,
      };
      if (projectId) row.project_id = projectId;
      const { data, error } = await supabase
        .from("logs")
        .insert(row)
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    } catch (error: any) {
      console.error("Failed to insert log:", error.message);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
