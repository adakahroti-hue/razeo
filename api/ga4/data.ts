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

    // ===== Mode USERS (tab Insight): % Returning user = Returning / Total x 100 =====
    // NOTE (rev 2026-11): "returningUsers" DITOLAK beberapa property GA4
    // ("Field returningUsers is not a valid metric", saran: activeUsers).
    // Jadi coba 3 cara berurutan, pakai yang pertama sukses:
    //   1) seri penuh  [totalUsers, newUsers, returningUsers]
    //   2) [activeUsers, newUsers]  → returning dihitung active - new
    //   3) [activeUsers]            → pakai active = total, new 0
    if (String(action || "") === "users") {
      const run = async (metrics: string[]) => {
        const r = await analyticsdata.properties.runReport({
          property: `properties/${propertyId}`,
          requestBody: {
            dateRanges: [{ startDate: startDate as string, endDate: endDate as string }],
            metrics: metrics.map((name) => ({ name })),
          },
        });
        return r.data?.rows?.[0]?.metricValues || [];
      };
      const out = async (): Promise<{ total: number; fresh: number; returning: number }> => {
        // 1 — seri penuh
        try {
          const m = await run(["totalUsers", "newUsers", "returningUsers"]);
          if (m.length >= 3) {
            const t = Number(m[0]?.value || 0), f = Number(m[1]?.value || 0);
            return { total: t, fresh: f, returning: m[2]?.value ? Number(m[2].value) : Math.max(0, t - f) };
          }
        } catch { /* lanjut metode 2 */ }
        // 2 — tanpa returningUsers (yang selama ini bikin error)
        try {
          const m = await run(["activeUsers", "newUsers"]);
          if (m.length >= 2) {
            const t = Number(m[0]?.value || 0), f = Number(m[1]?.value || 0);
            return { total: t, fresh: f, returning: Math.max(0, t - f) };
          }
        } catch { /* lanjut metode 3 */ }
        // 3 — terakhir: hitung total saja (new 0, returning = total utk tampilan aman)
        const m = await run(["activeUsers"]);
        const t = Number(m[0]?.value || 0);
        return { total: t, fresh: 0, returning: t };
      };
      const { total, fresh, returning } = await out();
      const returningPct = total > 0 ? (returning / total) * 100 : 0;
      return res.status(200).json({ totalUsers: total, newUsers: fresh, returningUsers: returning, returningPct });
    }

    // ===== Mode BACKLINKS (tab Insight): link masuk dari situs luar =====
    // Sumber: GA4 `pageReferrer` = halaman yang dibuka SEBELUM pengunjung masuk ke
    // halaman kita (diambil saat sesi dimulai). Jadi tiap baris = satu "mention":
    //   referrer = halaman di situs lain tempat link berada
    //   page     = halaman web kita yang dituju link itu
    // Catatan jujur: ini tercatat dari KUNJUNGAN NYATA (yang diklik), bukan semua
    // backlink yang ada di internet (itu perlu layanan indeks backlink terpisah).
    if (String(action || "") === "backlinks") {
      const r = await analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: startDate as string, endDate: endDate as string }],
          dimensions: [{ name: "pageReferrer" }, { name: "pagePath" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: "500",
        },
      });
      const items = (r.data?.rows || [])
        .map((row: any) => ({
          referrer: row.dimensionValues?.[0]?.value || "",
          page: row.dimensionValues?.[1]?.value || "/",
          sessions: Number(row.metricValues?.[0]?.value || 0),
        }))
        .filter((x: any) => {
          const ref = String(x.referrer).trim();
          if (!ref) return false;
          // direct / (not set) bukan backlink
          if (/^\((not set|direct)/i.test(ref)) return false;
          return true;
        });
      return res.status(200).json({ items });
    }

    // ===== Mode PAGES (tab Overview): 3 halaman teratas utk kelompok yg diklik =====
    if (String(action || "") === "pages") {
      const dim = (String(req.query.dimension || "") || "").trim();
      const val = String(req.query.dimensionValue || "");
      const ACCEPT: Record<string, string> = {
        source: "sessionSource", medium: "sessionMedium", city: "city",
        browser: "browser", operatingSystem: "operatingSystem", deviceCategory: "deviceCategory",
        pagePath: "pagePath",
      };
      if (!val) return res.status(400).json({ error: "dimensionValue wajib diisi" });
      if (!(dim in ACCEPT)) return res.status(400).json({ error: "dimension tidak dikenal" });
      // baris sumber trafik = source + medium → gabung 2 filter AND biar cocok 1 baris
      const primary = {
        fieldName: ACCEPT[dim],
        stringFilter: { value: val, matchType: "EXACT" },
      };
      const secDim = String(req.query.secondaryDimension || "").trim();
      const secVal = String(req.query.secondaryValue || "");
      const secondary = secVal && secDim in ACCEPT
        ? { fieldName: ACCEPT[secDim], stringFilter: { value: secVal, matchType: "EXACT" } }
        : null;
      const r = await analyticsdata.properties.runReport({
        property: `properties/${propertyId}`,
        requestBody: {
          dateRanges: [{ startDate: startDate as string, endDate: endDate as string }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "sessions" }],
          dimensionFilter: secondary
            ? { andGroup: { expressions: [{ filter: primary as any }, { filter: secondary as any }] } }
            : { filter: primary as any },
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: "3",
        },
      });
      const pages = (r.data?.rows || []).map((row: any) => ({
        page: row.dimensionValues?.[0]?.value || "",
        sessions: Number(row.metricValues?.[0]?.value || 0),
      }));
      return res.status(200).json({ pages });
    }

    if (String(action || "") === "compare") {
      const csd = String(req.query.compareStartDate || "");
      const ced = String(req.query.compareEndDate || "");
      if (!csd || !ced) return res.status(400).json({ error: "compareStartDate & compareEndDate wajib diisi" });
      const rep = (sd: string, ed: string, dims: any[], metric: string, extra: any = {}) =>
        analyticsdata.properties.runReport({
          property: `properties/${propertyId}`,
          requestBody: {
            dateRanges: [{ startDate: sd, endDate: ed }],
            dimensions: dims,
            metrics: [{ name: metric }],
            orderBys: [{ metric: { metricName: metric }, desc: true }],
            limit: "100",
            ...extra,
          },
        });
      const pack = (rows: any[]) =>
        (rows || []).map((r: any) => ({
          url: r.dimensionValues?.[0]?.value || "",
          value: Number(r.metricValues?.[0]?.value || 0),
        }));
      const pageDims = [{ name: "pagePath" }];
      // nama event scroll-75 dikirim dari pengaturan (frontend)
      const ev75 = String(req.query.scroll75Event || "").trim() || "scroll_75";
      const [sC, sP, eC, eP] = await Promise.all([
        rep(startDate as string, endDate as string, pageDims, "sessions"),
        rep(csd, ced, pageDims, "sessions"),
        rep(startDate as string, endDate as string, [{ name: "pagePath" }, { name: "eventName" }], "eventCount", {
          dimensionFilter: {
            filter: { fieldName: "eventName", inListFilter: { values: [ev75] } },
          },
        }),
        rep(csd, ced, [{ name: "pagePath" }, { name: "eventName" }], "eventCount", {
          dimensionFilter: {
            filter: { fieldName: "eventName", inListFilter: { values: [ev75] } },
          },
        }),
      ]);
      return res.status(200).json({
        sessions: { current: pack(sC.data.rows), previous: pack(sP.data.rows) },
        scroll75: { current: pack(eC.data.rows), previous: pack(eP.data.rows) },
      });
    }

    // ===== Mode OVERVIEW (tab Overview): sumber trafik & kota pengunjung =====
    if (String(action || "") === "overview") {
      const range = { startDate: startDate as string, endDate: endDate as string };
      const [srcRes, cityRes, totRes, dailyRes, browserRes, osRes, deviceRes] = await Promise.all([
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
        // browser, sistem operasi, kategori device — semua metrik: sesi
        analyticsdata.properties.runReport({
          property: `properties/${propertyId}`,
          requestBody: {
            dateRanges: [range],
            dimensions: [{ name: "browser" }],
            metrics: [{ name: "sessions" }],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: "100",
          },
        }),
        analyticsdata.properties.runReport({
          property: `properties/${propertyId}`,
          requestBody: {
            dateRanges: [range],
            dimensions: [{ name: "operatingSystem" }],
            metrics: [{ name: "sessions" }],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: "100",
          },
        }),
        analyticsdata.properties.runReport({
          property: `properties/${propertyId}`,
          requestBody: {
            dateRanges: [range],
            dimensions: [{ name: "deviceCategory" }],
            metrics: [{ name: "sessions" }],
            orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
            limit: "100",
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
      // ===== 7 periode ke belakang (kartu Sesi di Overview) =====
      // Deret harian dibentangkan 6×panjang-periode sebelum startDate → dipecah
      // jadi 7 blok (tua → baru). Rata-rata per hari per blok supaya rentang
      // panjang tidak membuat batang membengkak.
      const MS_DAY = 86400000;
      const pToMs = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
      const pShift = (iso: string, n: number) => new Date(pToMs(iso) + n * MS_DAY).toISOString().slice(0, 10);
      const perLen = Math.min(Math.max(1, Math.round((pToMs(range.endDate) - pToMs(range.startDate)) / MS_DAY) + 1), 365);
      const wideStartSesi = [
        pShift(range.startDate, -6 * perLen),
        pShift(range.endDate, -420), // GA4 riwayat default ±14 bulan
      ].sort()[1];
      let sesiWide: any[] = [];
      try {
        const w = await analyticsdata.properties.runReport({
          property: `properties/${propertyId}`,
          requestBody: {
            dateRanges: [{ startDate: wideStartSesi, endDate: range.endDate }],
            dimensions: [{ name: "date" }],
            metrics: [{ name: "sessions" }],
          },
        });
        sesiWide = (w.data.rows || []).map((r: any) => ({
          date: r.dimensionValues?.[0]?.value || "",
          sessions: Number(r.metricValues?.[0]?.value || 0),
        }));
      } catch { /* deret lanjutan opsional — kalau gagal, kartu pakai deret periode ini */ }
      const sesiByDate = new Map<string, number>(sesiWide.map((r: any) => [r.date, r.sessions]));
      const sesiPeriod = Array.from({ length: 7 }, (_, i) => {
        const pStart = pShift(range.startDate, -(6 - i) * perLen);
        const pEnd = pShift(range.endDate, -(6 - i) * perLen);
        let total = 0, found = 0;
        for (let t = pToMs(pStart); t <= pToMs(pEnd); t += MS_DAY) {
          const key = new Date(t).toISOString().slice(0, 10);
          if (sesiByDate.has(key)) { total += sesiByDate.get(key)!; found++; }
        }
        if (i === 6 && found === 0) return totalSessions; // fallback: total resmi periode ini
        return found > 0 ? Math.round(total / found) : 0;  // rata-rata per hari
      });
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
      return res.status(200).json({
        topSources: packSource(srcRes.data.rows),
        topCities: pack(cityRes.data.rows),
        topBrowsers: pack(browserRes.data.rows),
        topOss: pack(osRes.data.rows),
        topDevices: pack(deviceRes.data.rows),
        totalSessions,
        sesiHarian,
        sesiPeriod,                              // rata-rata sesi/hari × 7 periode ke belakang
      });
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
              // daftar event dikirim dari pengaturan (frontend, dipisah koma);
              // page_view & session_start SELALU ditambahkan karena keduanya
              // sumber 'sessions' + 'engagement_rate' per halaman di frontend
              values: (() => {
                const fromClient = String(req.query.events || "")
                  .split(",").map((x) => x.trim()).filter(Boolean);
                const base = fromClient.length ? fromClient : [
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
                ];
                return Array.from(new Set([...base, "session_start", "page_view"]));
              })(),
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