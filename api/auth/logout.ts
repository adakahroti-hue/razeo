// POST /api/auth/logout — hapus token OAuth Google milik user
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, requireUser } from "razeo-shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "POST") {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  try {
    const { error } = await supabase
      .from("user_tokens")
      .delete()
      .eq("uid", user.uid);
    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("Logout failed:", error.message);
    res.status(500).json({ error: "Failed to logout" });
  }
}