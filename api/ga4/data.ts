// GET /api/ga4/data — laporan event GA4 (scroll, CTA, purchase) per halaman
import { google } from "googleapis";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser, requireProject, getClientForProject } from "razeo-shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { propertyId, startDate, endDate, action } = req.query;
  if (!propertyId) return res.status(400).json({ error: "propertyId is required" });

  try {
    const info = await requireProject(user.uid, req);
    if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
    if (!info.connection) return res.status(401).json({ error: "Project belum connect data" });
    // Token dipakai = token PEMILIK koneksi project (bukan user yang minta)
    const client = await getClientForProject(info.projectId, req);
    if (!client) return res.status(401).json({ error: "Token koneksi tidak valid" });

    const analyticsdata = google.analyticsdata({ version: "v1beta", auth: client });

    // ===== Mode OVERVIEW (tab Overview): sumber trafik & kota pengunjung =====
    if (String(action || "") === "overview") {
      const range = { startDate: startDate as string, endDate: endDate as string };
      const [srcRes, cityRes, totRes, dailyRes] = await Promise.all([
        analyticsdata.properties.runReport({
          property: `properties/${propertyId}`,
          requestBody: {
            dateRanges: [range],
            dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
            metrics: [{ name: "sessions" }],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: "100",
          },
        }),
        analyticsdata.properties.runReport({
          property: `properties/${propertyId}`,
          requestBody: {
            dateRanges: [range],
            dimensions: [{ name: "city" }],
            metrics: [{ name: "sessions" }],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: "100",
          },
        }),
        analyticsdata.properties.runReport({
          property: `properties/${propertyId}`,
          requestBody: {
            dateRanges: [range],
            metrics: [{ name: "sessions" }],
          },
        }),
        analyticsdata.properties.runReport({
          property: `properties/${propertyId}`,
          requestBody: {
            dateRanges: [range],
            dimensions: [{ name: "date" }],
            metrics: [{ name: "sessions" }],
          },
        }),
      ]);
      const totalSessions = Number(totRes.data.rows?.[0]?.metricValues?.[0]?.value || 0);
      // deret sesi harian — bahan diagram batang kartu "Sesi"
      const sesiHarian = (dailyRes.data.rows || [])
        .map((r: any) => ({
          date: r.dimensionValues?.[0]?.value || "",
          sessions: Number(r.metricValues?.[0]?.value || 0),
        }))
        .sort((x: any, y: any) => String(x.date).localeCompare(String(y.date)));
      const pack = (rows: any[]) =>
        (rows || []).map((r: any) => ({
          key: (r.dimensionValues || []).map((d: any) => d.value).filter(Boolean).join(" / "), // untuk kota: "Jakarta"
          sessions: Number(r.metricValues?.[0]?.value || 0),
        }));
      // sumber trafik: kolom Sumber & Medium dipisah
      const packSource = (rows: any[]) =>
        (rows || []).map((r: any) => {
          const source = r.dimensionValues?.[0]?.value || "";
          const medium = r.dimensionValues?.[1]?.value || "";
          return { source, medium, key: `${source} / ${medium}`, sessions: Number(r.metricValues?.[0]?.value || 0) };
        });
      return res.status(200).json({ topSources: packSource(srcRes.data.rows), topCities: pack(cityRes.data.rows), totalSessions, sesiHarian });
    }
    const response = await analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: startDate as string, endDate: endDate as string }],
        dimensions: [{ name: "pagePath" }, { name: "eventName" }],
        metrics: [{ name: "eventCount" }, { name: "sessions" }, { name: "engagementRate" }],
        dimensionFilter: {
          filter: {
            fieldName: "eventName",
            inListFilter: {
              values: [
                "click_cta_article",
                "click_cta_ke_produk",
                "purchase",
                "purchase_marketplace",
                "purchase_tiktok",
                "purchase_whatsapp",
                "scroll_25",
                "scroll_50",
                "scroll_75",
                "session_start",
                "page_view",
              ],
            },
          },
        },
      },
    });

    res.status(200).json(response.data.rows || []);
  } catch (error: any) {
    console.error("Error fetching GA4 data:", error.message);
    let message = error.message || "Failed to fetch GA4 data";
    if (message.includes("analyticsdata.googleapis.com")) {
      message =
        "Google Analytics Data API is not enabled. Enable it in Google Cloud Console: https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview";
    }
    res.status(500).json({ error: message });
  }
}