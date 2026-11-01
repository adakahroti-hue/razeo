import express from "express";
import { createServer as createViteServer } from "vite";
import { google } from "googleapis";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase (database + auth Google) — key hanya di server.
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("WARNING: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — user_tokens & /api/logs will fail.");
}

const supabase: SupabaseClient = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY || "placeholder",
  { auth: { persistSession: false } }
);

// Verifikasi koneksi Supabase saat startup
(async () => {
  const { error } = await supabase.from("logs").select("id").limit(1);
  if (error) {
    console.error("Supabase connection check failed:", error.message);
  } else {
    console.log("Supabase connection verified successfully");
  }
})();

const app = express();
const PORT = 3000;

app.use(express.json());

// Middleware: verifikasi token login (Supabase JWT) via header Authorization
const authenticate = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const { data, error } = await supabase.auth.getUser(idToken);
    if (error || !data.user) {
      return res.status(401).json({ error: "Invalid token" });
    }
    req.user = {
      uid: data.user.id,                    // supabase uid dipakai di seluruh API
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    };
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const getRedirectUri = (req: any) => {
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (appUrl) return `${appUrl}/auth/callback`;
  const protocol = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  return `${protocol}://${req.get('host')}/auth/callback`;
};

// Auth URL endpoint
app.get("/api/auth/url", authenticate, (req: any, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(400).json({ 
      error: "Google OAuth credentials are not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment variables." 
    });
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    getRedirectUri(req)
  );

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/webmasters.readonly",
      "https://www.googleapis.com/auth/analytics.readonly",
      "https://www.googleapis.com/auth/userinfo.profile",
    ],
    prompt: "consent",
    state: req.user.uid // Pass UID to callback
  });

  res.json({ url });
});

// OAuth Callback
app.get("/auth/callback", async (req, res) => {
  const { code, state: uid } = req.query;
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      getRedirectUri(req)
    );

    const { tokens } = await oauth2Client.getToken(code as string);
    
    // Simpan token OAuth ke Supabase untuk user ini
    const { error: upsertErr } = await supabase
      .from("user_tokens")
      .upsert({ uid: uid as string, tokens, updated_at: new Date().toISOString() });
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
  } catch (error) {
    res.status(500).send("Authentication failed");
  }
});

// Helper to get user's OAuth client
async function getClientForUser(uid: string, req: any) {
  const { data, error } = await supabase
    .from("user_tokens")
    .select("tokens")
    .eq("uid", uid)
    .maybeSingle();
  if (error || !data?.tokens) {
    if (error) console.error("Failed to read user_tokens from Supabase:", error.message);
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri(req)
  );
  oauth2Client.setCredentials(data.tokens as any);
  return oauth2Client;
}

app.get("/api/auth/status", authenticate, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from("user_tokens")
      .select("uid")
      .eq("uid", req.user.uid)
      .maybeSingle();
    if (error) throw error;
    res.json({ 
      connected: !!data,
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    });
  } catch (error) {
    console.error("Auth status check failed:", error);
    res.status(500).json({ error: "Failed to check auth status" });
  }
});

// ============ LOGS API (Supabase) ============

// GET /api/logs — list log milik user yang login
app.get("/api/logs", authenticate, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .eq("uid", req.user.uid)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error("Failed to fetch logs:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/logs — tambah log baru
app.post("/api/logs", authenticate, async (req: any, res) => {
  const { url, date, aspect, queries, before, after, note } = req.body || {};
  if (!url || !date || !Array.isArray(aspect) || aspect.length === 0) {
    return res.status(400).json({ error: "url, date, dan aspect (minimal 1) wajib diisi" });
  }
  if (date.length !== 10 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date harus format YYYY-MM-DD" });
  }
  try {
    const { data, error } = await supabase
      .from("logs")
      .insert({
        uid: req.user.uid,
        url: String(url).slice(0, 2048),
        date,
        aspect,
        queries: queries || null,
        before: before || "",
        after: after || "",
        note: note || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    console.error("Failed to insert log:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/logs/:id — hapus log (hanya milik sendiri)
app.delete("/api/logs/:id", authenticate, async (req: any, res) => {
  try {
    const { error, count } = await supabase
      .from("logs")
      .delete({ count: "exact" })
      .eq("id", req.params.id)
      .eq("uid", req.user.uid);
    if (error) throw error;
    if (!count) return res.status(404).json({ error: "Log tidak ditemukan" });
    res.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete log:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/gsc/sites", authenticate, async (req: any, res) => {
  try {
    const client = await getClientForUser(req.user.uid, req);
    if (!client) return res.status(401).json({ error: "Not connected" });
    const searchconsole = google.searchconsole({ version: "v1", auth: client });
    const response = await searchconsole.sites.list();
    res.json(response.data.siteEntry || []);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch sites" });
  }
});

app.get("/api/gsc/data", authenticate, async (req: any, res) => {
  const { siteUrl, startDate, endDate } = req.query;
  try {
    const client = await getClientForUser(req.user.uid, req);
    if (!client) return res.status(401).json({ error: "Not connected" });
    const searchconsole = google.searchconsole({ version: "v1", auth: client });
    
    const [summary, timeSeries, details] = await Promise.all([
      searchconsole.searchanalytics.query({ siteUrl: siteUrl as string, requestBody: { startDate: startDate as string, endDate: endDate as string } }),
      searchconsole.searchanalytics.query({ siteUrl: siteUrl as string, requestBody: { startDate: startDate as string, endDate: endDate as string, dimensions: ["date"] } }),
      searchconsole.searchanalytics.query({ siteUrl: siteUrl as string, requestBody: { startDate: startDate as string, endDate: endDate as string, dimensions: ["query", "page", "device", "country"], rowLimit: 1000 } })
    ]);

    res.json({
      summary: summary.data.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      timeSeries: timeSeries.data.rows || [],
      rows: details.data.rows || [],
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GA4 Data Endpoints
app.get("/api/ga4/properties", authenticate, async (req: any, res) => {
  try {
    const client = await getClientForUser(req.user.uid, req);
    if (!client) return res.status(401).json({ error: "Not connected" });
    
    const analyticsadmin = google.analyticsadmin({ version: "v1beta", auth: client });
    
    // 1. List accounts
    const accountsResponse = await analyticsadmin.accounts.list();
    const accounts = accountsResponse.data.accounts || [];
    
    // 2. List properties for each account
    let allProperties: any[] = [];
    for (const account of accounts) {
      try {
        const propertiesResponse = await analyticsadmin.properties.list({
          filter: `parent:${account.name}`
        });
        if (propertiesResponse.data.properties) {
          allProperties = [...allProperties, ...propertiesResponse.data.properties];
        }
      } catch (err) {
        console.error(`Failed to fetch properties for account ${account.name}:`, err);
      }
    }
    
    res.json(allProperties);
  } catch (error: any) {
    console.error("Error fetching GA4 properties:", error);
    let message = error.message || "Failed to fetch GA4 properties";
    if (message.includes("analyticsadmin.googleapis.com")) {
      message = "Google Analytics Admin API is not enabled. Please enable it in your Google Cloud Console: https://console.developers.google.com/apis/api/analyticsadmin.googleapis.com/overview";
    }
    res.status(500).json({ error: message });
  }
});

app.get("/api/ga4/data", authenticate, async (req: any, res) => {
  const { propertyId, startDate, endDate } = req.query;
  if (!propertyId) return res.status(400).json({ error: "propertyId is required" });

  try {
    const client = await getClientForUser(req.user.uid, req);
    if (!client) return res.status(401).json({ error: "Not connected" });
    
    const analyticsdata = google.analyticsdata({ version: "v1beta", auth: client });
    
    const response = await analyticsdata.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: (startDate as string), endDate: (endDate as string) }],
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
                "page_view"
              ]
            }
          }
        }
      }
    });

    res.json(response.data.rows || []);
  } catch (error: any) {
    console.error("Error fetching GA4 data:", error);
    let message = error.message || "Failed to fetch GA4 data";
    if (message.includes("analyticsdata.googleapis.com")) {
      message = "Google Analytics Data API is not enabled. Please enable it in your Google Cloud Console: https://console.developers.google.com/apis/api/analyticsdata.googleapis.com/overview";
    }
    res.status(500).json({ error: message });
  }
});

app.post("/api/auth/logout", authenticate, async (req: any, res) => {
  try {
    const { error } = await supabase
      .from("user_tokens")
      .delete()
      .eq("uid", req.user.uid);
    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error("Logout failed:", error.message);
    res.status(500).json({ error: "Failed to logout" });
  }
});

// API 404 handler
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
