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

    // ===== Mode COMPARE (tab Cek): halaman per periode — sekarang vs pembanding =====
    if (String(action || "") === "compare") {
      const csd = String(req.query.compareStartDate || "");
      const ced = String(req.query.compareEndDate || "");
      if (!csd || !ced) return res.status(400).json({ error: "compareStartDate & compareEndDate wajib diisi" });
      const byPage = (sd: string, ed: string) =>
        searchconsole.searchanalytics.query({
          siteUrl: siteUrl as string,
          requestBody: { startDate: sd, endDate: ed, dimensions: ["page"], rowLimit: 25000 },
        });
      const fmt = (rows: any[]) =>
        (rows || []).map((r: any) => ({
          url: r.keys?.[0] || "",
          clicks: r.clicks ?? 0,
          impressions: r.impressions ?? 0,
          ctr: r.ctr ?? 0,
          position: r.position ?? 0,
        }));
      const [cur, prev] = await Promise.all([byPage(startDate as string, endDate as string), byPage(csd, ced)]);
      return res.status(200).json({ current: fmt(cur.data.rows), previous: fmt(prev.data.rows) });
    }

    // ===== Mode BRANDED (tab Insight): agregat impresi/klik/CTR utk keyword branded =====
    if (String(action || "") === "branded") {
      const kws = String(req.query.keywords || "")
        .split(/[\r\n,]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 50);
      if (!kws.length) return res.status(200).json({ keywords: [], summary: { impressions: 0, clicks: 0, ctr: 0 } });
      const q = await searchconsole.searchanalytics.query({
        siteUrl: siteUrl as string,
        requestBody: {
          startDate: startDate as string,
          endDate: endDate as string,
          dimensions: ["query"],
          rowLimit: 25000,
        },
      });
      const rows = q.data.rows || [];
      const set = new Set(kws);
      const per = new Map<string, { query: string; impressions: number; clicks: number; ctr: number; position: number }>(
        kws.map((k) => [k, { query: k, impressions: 0, clicks: 0, ctr: 0, position: 0 }])
      );
      let sumsI = 0, sumsC = 0;
      for (const r of rows) {
        const kw = String(r.keys?.[0] || "").toLowerCase();
        if (!set.has(kw)) continue;
        const e = per.get(kw)!;
        e.impressions += r.impressions ?? 0;
        e.clicks += r.clicks ?? 0;
        if (r.position) e.position += (r.position as number) * (r.impressions ?? 1);
        sumsI += r.impressions ?? 0;
        sumsC += r.clicks ?? 0;
      }
      const out = [...per.values()];
      for (const e of out) {
        e.ctr = e.impressions > 0 ? (e.clicks / e.impressions) * 100 : 0;
        e.position = e.impressions > 0 ? Math.round((e.position / e.impressions) * 10) / 10 : 0;
      }
      out.sort((a, b) => b.impressions - a.impressions);
      return res.status(200).json({
        keywords: out,
        summary: { impressions: sumsI, clicks: sumsC, ctr: sumsI > 0 ? (sumsC / sumsI) * 100 : 0 },
      });
    }

    // ===== Mode OVERVIEW (tab Overview): top page, top query, rata-rata periode =====
    if (String(action || "") === "overview") {
      const base = { startDate: startDate as string, endDate: endDate as string };
      // ===== 7 periode ke belakang (kartu Overview) =====
      // Panjang 1 periode = panjang rentang tanggal yang dipilih user.
      // 1 query deret harian membentang 6×panjang-periode sebelum startDate →
      // dipecah jadi 7 blok (tua → baru) untuk diagram batang yang benar-benar
      // menampilkan kenaikan/penurunan 7 periode ke belakang.
      const MS_DAY = 86400000;
      const toMs = (iso: string) => new Date(`${iso}T00:00:00Z`).getTime();
      const shiftDays = (iso: string, n: number) => new Date(toMs(iso) + n * MS_DAY).toISOString().slice(0, 10);
      const perLen = Math.min(Math.max(1, Math.round((toMs(base.endDate) - toMs(base.startDate)) / MS_DAY) + 1), 365);
      // GSC hanya menyimpan ±16 bulan data — deret dijepit di 480 hari terakhir
      // supaya query tidak ditolak (periode terjauh yang tak punya data = 0).
      const wideStart = [
        shiftDays(base.startDate, -6 * perLen),
        shiftDays(base.endDate, -480),
      ].sort()[1];
      const [summary, daily, topPagesRes, topQueriesRes, wideRes] = await Promise.all([
        searchconsole.searchanalytics.query({ siteUrl: siteUrl as string, requestBody: base }),
        searchconsole.searchanalytics.query({ siteUrl: siteUrl as string, requestBody: { ...base, dimensions: ["date"] } }),
        searchconsole.searchanalytics.query({ siteUrl: siteUrl as string, requestBody: { ...base, dimensions: ["page"], rowLimit: 100 } }),
        searchconsole.searchanalytics.query({ siteUrl: siteUrl as string, requestBody: { ...base, dimensions: ["query"], rowLimit: 100 } }),
        searchconsole.searchanalytics.query({
          siteUrl: siteUrl as string,
          requestBody: { startDate: wideStart, endDate: base.endDate, dimensions: ["date"], rowLimit: 25000 },
        }),
      ]);
      const wideByDate = new Map<string, any>(
        (wideRes.data.rows || []).map((r: any) => [r.keys?.[0] || "", r])
      );
      const periodSeries = Array.from({ length: 7 }, (_, i) => {
        const lag = 6 - i; // i=0 paling tua … i=6 = rentang sekarang
        const pStart = shiftDays(base.startDate, -lag * perLen);
        const pEnd = shiftDays(base.endDate, -lag * perLen);
        let clicks = 0, impressions = 0, posW = 0, posN = 0;
        for (let t = toMs(pStart); t <= toMs(pEnd); t += MS_DAY) {
          const rr = wideByDate.get(new Date(t).toISOString().slice(0, 10));
          if (!rr) continue;
          const c = rr.clicks ?? 0, imp = rr.impressions ?? 0, pos = rr.position ?? 0;
          clicks += c; impressions += imp;
          if (imp > 0) { posW += pos * imp; posN += imp; } // rata-rata ditimbang impresi
        }
        return {
          start: pStart,
          end: pEnd,
          clicks,
          impressions,
          ctr: impressions > 0 ? (clicks / impressions) * 100 : 0, // persen
          position: posN > 0 ? Math.round((posW / posN) * 10) / 10 : 0,
        };
      });
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
        periodSeries,                              // 7 periode ke belakang (tua → baru)
        timeSeries: dailyRows.map((r: any) => ({
          date: r.keys?.[0] ?? "",
          clicks: r.clicks ?? 0,
          impressions: r.impressions ?? 0,
          ctr: r.ctr ?? 0,
          position: r.position ?? 0,
        })),
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