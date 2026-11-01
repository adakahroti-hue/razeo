// GET /api/auth/url — bikin link otorisasi Google untuk Search Console & GA4
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_lib";
import { newOAuth2Client, getRedirectUri, GOOGLE_SCOPES } from "../_google";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  if (req.method !== "GET") {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(400).json({
      error:
        "Google OAuth credentials are not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment variables.",
    });
  }

  try {
    const oauth2Client = newOAuth2Client(getRedirectUri(req));
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: GOOGLE_SCOPES,
      prompt: "consent",
      state: user.uid, // dibawa ke callback untuk tahu milik siapa
    });
    res.status(200).json({ url });
  } catch (err: any) {
    console.error("Failed to build auth url:", err.message);
    res.status(500).json({ error: err.message || "Failed to build auth url" });
  }
}