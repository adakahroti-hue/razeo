// GET /api/gsc/data — ringkasan + deret waktu + detail query/p halaman
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser, requireProject, getClientForProject } from "razeo-shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { siteUrl, startDate, endDate, action } = req.query;
  if (!siteUrl || !startDate || !endDate) {
    return res.status(400).json({ error: "siteUrl, startDate, endDate wajib diisi" });
  }

  try {
    const info = await requireProject(user.uid, req);
    if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
    if (!info.connection) return res.status(401).json({ error: "Project belum connect data" });
    // Token dipakai = token PEMILIK koneksi project (bukan user yang minta)
    const client = await getClientForProject(info.projectId, req);
    if (!client) return res.status(401).json({ error: "Token koneksi tidak valid" });
    const searchconsole = google.searchconsole({ version: "v1", auth: client });

    // ===== Mode OVERVIEW (tab Overview): top page, top query, rata-rata periode =====
    if (String(action || "") === "overview") {
      const base = { startDate: startDate as string, endDate: endDate as string };
      const [summary, daily, topPagesRes, topQueriesRes] = await Promise.all([
        searchconsole.searchanalytics.query({ siteUrl: siteUrl as string, requestBody: base }),
        searchconsole.searchanalytics.query({ siteUrl: siteUrl as string, requestBody: { ...base, dimensions: ["date"] } }),
        searchconsole.searchanalytics.query({ siteUrl: siteUrl as string, requestBody: { ...base, dimensions: ["page"], rowLimit: 10 } }),
        searchconsole.searchanalytics.query({ siteUrl: siteUrl as string, requestBody: { ...base, dimensions: ["query"], rowLimit: 10 } }),
      ]);
      const s = summary.data.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
      const dailyRows = daily.data.rows || [];
      const days = Math.max(1, dailyRows.length);
      const fmt = (rows: any[]) => (rows || []).map((r) => ({
        key: r.keys?.[0] ?? "",
        clicks: r.clicks ?? 0,
        impressions: r.impressions ?? 0,
        ctr: r.ctr ?? 0,
        position: r.position ?? 0,
      }));
      return res.status(200).json({
        summary: {
          clicks: s.clicks ?? 0,
          impressions: s.impressions ?? 0,
          ctr: s.ctr ?? 0,
          position: s.position ?? 0,
          days,                                  // jumlah hari terdata pada rentang ini
          avgClicks: Math.round((s.clicks ?? 0) / days * 10) / 10,
          avgImpressions: Math.round((s.impressions ?? 0) / days * 10) / 10,
        },
        topPages: fmt(topPagesRes.data.rows),
        topQueries: fmt(topQueriesRes.data.rows),
      });
    }

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