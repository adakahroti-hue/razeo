// GET /api/ga4/data — laporan event GA4 (scroll, CTA, purchase) per halaman
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

  const { propertyId, startDate, endDate } = req.query;
  if (!propertyId) return res.status(400).json({ error: "propertyId is required" });

  try {
    const client = await getClientForUser(user.uid, req);
    if (!client) return res.status(401).json({ error: "Not connected" });

    const analyticsdata = google.analyticsdata({ version: "v1beta", auth: client });
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