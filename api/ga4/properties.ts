// GET /api/ga4/properties — daftar property GA4 milik user
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

  try {
    const client = await getClientForUser(user.uid, req);
    if (!client) return res.status(401).json({ error: "Not connected" });

    const analyticsadmin = google.analyticsadmin({ version: "v1beta", auth: client });
    const accountsResponse = await analyticsadmin.accounts.list();
    const accounts = accountsResponse.data.accounts || [];

    let allProperties: any[] = [];
    for (const account of accounts) {
      try {
        const propertiesResponse = await analyticsadmin.properties.list({
          filter: `parent:${account.name}`,
        });
        if (propertiesResponse.data.properties) {
          allProperties = [...allProperties, ...propertiesResponse.data.properties];
        }
      } catch (err) {
        console.error(`Failed to fetch properties for account ${account.name}:`, err);
      }
    }

    res.status(200).json(allProperties);
  } catch (error: any) {
    console.error("Error fetching GA4 properties:", error.message);
    let message = error.message || "Failed to fetch GA4 properties";
    if (message.includes("analyticsadmin.googleapis.com")) {
      message =
        "Google Analytics Admin API is not enabled. Enable it in Google Cloud Console: https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com/overview";
    }
    res.status(500).json({ error: message });
  }
}