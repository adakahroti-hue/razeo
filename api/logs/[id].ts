// DELETE /api/logs/:id — hapus log (hanya milik sendiri)
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, requireUser } from "razeo-shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "id wajib diisi" });
  }

  try {
    const { error, count } = await supabase
      .from("logs")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("uid", user.uid);
    if (error) throw error;
    if (!count) return res.status(404).json({ error: "Log tidak ditemukan" });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete log:", error.message);
    return res.status(500).json({ error: error.message });
  }
}