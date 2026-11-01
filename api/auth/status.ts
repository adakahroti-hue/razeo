// GET /api/auth/status — apakah user sudah hubungkan akun Google (GSC/GA4)?
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, requireUser } from "../_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  try {
    const { data, error } = await supabase
      .from("user_tokens")
      .select("uid")
      .eq("uid", user.uid)
      .maybeSingle();
    if (error) throw error;
    res.status(200).json({
      connected: !!data,
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    });
  } catch (error) {
    console.error("Auth status check failed:", error);
    res.status(500).json({ error: "Failed to check auth status" });
  }
}