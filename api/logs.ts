// GET / POST /api/logs — log optimasi SEO (tabel `logs` di Supabase)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, requireUser } from "./_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "GET") {
    try {
      const { data, error } = await supabase
        .from("logs")
        .select("*")
        .eq("uid", user.uid)
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
      const { data, error } = await supabase
        .from("logs")
        .insert({
          uid: user.uid,
          url: String(url).slice(0, 2048),
          date,
          aspect,
          queries: queries || null,
          before: before || "",
          after: after || "",
          note: note || null,
        })
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