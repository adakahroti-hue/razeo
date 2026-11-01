// GET /api/auth/callback — menerima hasil otorisasi Google, simpan token ke user_tokens
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase } from "razeo-shared";
import { newOAuth2Client, getRedirectUri } from "razeo-shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { code, state: uid } = req.query;
  if (!code || !uid || typeof uid !== "string") {
    return res.status(400).send("Missing code/state");
  }

  try {
    const oauth2Client = newOAuth2Client(getRedirectUri(req));
    const { tokens } = await oauth2Client.getToken(code as string);

    const { error: upsertErr } = await supabase
      .from("user_tokens")
      .upsert({ uid, tokens, updated_at: new Date().toISOString() });
    if (upsertErr) {
      console.error("Failed to save OAuth tokens to Supabase:", upsertErr.message);
      return res.status(500).send("Authentication failed (database error)");
    }

    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else { window.location.href = '/'; }
          </script>
          <p>Authentication successful. Closing window...</p>
        </body>
      </html>
    `);
  } catch (error: any) {
    console.error("OAuth callback failed:", error.message);
    res.status(500).send("Authentication failed");
  }
}