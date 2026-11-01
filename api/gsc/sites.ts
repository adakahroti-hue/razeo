// GET /api/gsc/sites — daftar property Search Console milik user
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_lib";
import { getClientForUser } from "../_google";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  try {
    const client = await getClientForUser(user.uid, req);
    if (!client) return res.status(401).json({ error: "Not connected" });
    const searchconsole = google.searchconsole({ version: "v1", auth: client });
    const response = await searchconsole.sites.list();
    res.status(200).json(response.data.siteEntry || []);
  } catch (error: any) {
    console.error("Failed to fetch sites:", error.message);
    res.status(500).json({ error: error.message || "Failed to fetch sites" });
  }
}