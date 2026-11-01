// GET /api/gsc/data — ringkasan + deret waktu + detail query/p halaman
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "razeo-shared";
import { getClientForUser } from "razeo-shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { siteUrl, startDate, endDate } = req.query;
  if (!siteUrl || !startDate || !endDate) {
    return res.status(400).json({ error: "siteUrl, startDate, endDate wajib diisi" });
  }

  try {
    const client = await getClientForUser(user.uid, req);
    if (!client) return res.status(401).json({ error: "Not connected" });
    const searchconsole = google.searchconsole({ version: "v1", auth: client });

    const [summary, timeSeries, details] = await Promise.all([
      searchconsole.searchanalytics.query({
        siteUrl: siteUrl as string,
        requestBody: { startDate: startDate as string, endDate: endDate as string },
      }),
      searchconsole.searchanalytics.query({
        siteUrl: siteUrl as string,
        requestBody: {
          startDate: startDate as string,
          endDate: endDate as string,
          dimensions: ["date"],
        },
      }),
      searchconsole.searchanalytics.query({
        siteUrl: siteUrl as string,
        requestBody: {
          startDate: startDate as string,
          endDate: endDate as string,
          dimensions: ["query", "page", "device", "country"],
          rowLimit: 1000,
        },
      }),
    ]);

    res.status(200).json({
      summary: summary.data.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      timeSeries: timeSeries.data.rows || [],
      rows: details.data.rows || [],
    });
  } catch (error: any) {
    console.error("Failed to fetch gsc data:", error.message);
    res.status(500).json({ error: error.message });
  }
}