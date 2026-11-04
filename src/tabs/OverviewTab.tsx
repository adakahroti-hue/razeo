import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDown, ArrowUp, ArrowUpRight, BarChart3, Eye, Globe, MapPin, MousePointer2, Target, Users } from 'lucide-react';
import { cn } from '../lib/utils';

type OvRow = { key: string; clicks?: number; impressions?: number; ctr?: number; position?: number; sessions?: number };

type Props = {
  loading: boolean;
  data: null | {
    gsc: { summary: any; topPages: OvRow[]; topQueries: OvRow[]; timeSeries?: any[]; periodSeries?: { start: string; end: string; clicks: number; impressions: number; ctr: number; position: number }[] };
    gscPrev: any;
    topSources: OvRow[];
    topCities: OvRow[];
    totalSessions: number;
    totalSessionsPrev?: number;
    sesiHarian?: { date: string; sessions: number }[];
    sesiPeriod?: number[];
    sesiHarianPrev?: { date: string; sessions: number }[];
    topBrowsers?: OvRow[];
    topOss?: OvRow[];
    topDevices?: OvRow[];
  };
  note: string | null;
  startDate: string;
  endDate: string;
  compareStartDate: string;
  compareEndDate: string;
  isComparing: boolean;
  renderChange: (current: number, previous: number, inverse?: boolean) => React.ReactNode;
  onRefresh: () => void;
};

const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

function Panel({ title, icon: Icon, children, hint }:{ title: string; icon: any; children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <Icon className="w-4 h-4 text-emerald-600" />
          {title}
        </span>
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="p-8 text-center text-sm text-gray-400">{msg}</div>;
}

// ===== Tabel dengan pengurut per kolom (panah ↑/↓ di kanan nama kolom) =====
type Col = { id: string; label: string; align?: 'right' };

function SortableTable({
  cols, rows, cell, maxH = 'max-h-[430px]',
}: {
  cols: Col[];
  rows: OvRow[];
  cell: (row: OvRow, colId: string) => React.ReactNode;
  maxH?: string;
}) {
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const val = (r: OvRow) => {
      const v = (r as any)[sort.id];
      if (typeof v === 'number') return v;
      return v == null ? -Infinity : Number(v);
    };
    // kolom teks ('key') diurutkan alfabetis; sisanya numerik
    const dir2 = sort.dir === 'asc' ? 1 : -1;
    // kolom teks ('key','source','medium') urut alfabetis; sisanya numerik
    if (['key', 'source', 'medium'].includes(sort.id)) {
      const sval = (r: OvRow) => String((r as any)[sort.id] ?? '');
      return [...rows].sort((a, b) => sval(a).localeCompare(sval(b)) * dir2);
    }
    return [...rows].sort((a, b) => (val(a) - val(b)) * dir2);
  }, [rows, sort]);

  const click = (id: string) => {
    setSort((s) => (s && s.id === id ? { id, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { id, dir: 'desc' }));
  };

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-gray-100 grid grid-cols-[2.5rem_1fr_6rem_6rem_5rem] md:grid-cols-[2.5rem_1fr_7rem_7rem_6rem] items-center">
          <th className="px-4 py-2.5 text-[11px] uppercase font-black text-gray-400" title="Nomor urut">No.</th>
          {cols.map((c) => (
            <th key={c.id} className={cn('px-3 py-2.5 text-[11px] uppercase font-black text-gray-400', c.align === 'right' ? 'text-right' : 'text-left')}>
              <button
                onClick={() => click(c.id)}
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] uppercase font-black transition-colors group',
                  sort?.id === c.id ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
                )}
                title={`Urutkan ${c.label}`}
              >
                {c.label}
                <span className="flex flex-col leading-none text-[9px] opacity-70 group-hover:opacity-100">
                  <ArrowUp className={cn('w-2.5 h-2.5', sort?.id === c.id && sort.dir === 'asc' ? 'opacity-100 text-emerald-600' : 'opacity-40')} />
                  <ArrowDown className={cn('w-2.5 h-2.5 -mt-0.5', sort?.id === c.id && sort.dir === 'desc' ? 'opacity-100 text-emerald-600' : 'opacity-40')} />
                </span>
              </button>
            </th>
          ))}
        </tr>
      </thead>
      <tbody className={cn("divide-y divide-gray-50 block overflow-y-auto ", maxH)}>
        {sorted.map((r, i) => (
          <tr key={`${r.key}-${i}`} className="hover:bg-gray-50/60 grid grid-cols-[2.5rem_1fr_6rem_6rem_5rem] md:grid-cols-[2.5rem_1fr_7rem_7rem_6rem] items-center">
            <td className="px-4 py-2.5 text-xs font-black text-gray-400 tabular-nums">{i + 1}</td>
            {cols.map((c) => (
              <td key={c.id} className={cn('px-3 py-2.5 min-w-0', c.align === 'right' ? 'text-right' : '')}>
                {cell(r, c.id)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function OverviewTab({ loading, data, note, startDate, endDate, compareStartDate, compareEndDate, isComparing, renderChange, onRefresh }: Props) {
  const s = data?.gsc.summary;
  const cmp = data?.gscPrev?.summary;
  // filter sumber trafik (state utama — jangan useState di dalam render)
  const [srcFilter, setSrcFilter] = useState<'semua' | 'organic' | 'referral' | 'direct' | 'ai'>('semua');
  const fmtNum = (n: number | undefined | null) =>
    (n ?? 0) >= 1000 ? `${((n ?? 0) / 1000).toFixed(1)}K` : String(n ?? 0);

  // ===== 7 periode ke belakang (pemakaian ulang untuk tooltip) =====
  // Panjang 1 periode = panjang rentang tanggal yang di-set user; batang kiri
  // = periode paling tua, batang kanan = periode paling baru (sekarang).
  const periodeLabels = (() => {
    const ms = 86400000;
    const toMs = (d: string) => new Date(`${d}T00:00:00Z`).getTime();
    const per = Math.min(Math.max(1, Math.round((toMs(endDate) - toMs(startDate)) / ms) + 1), 365);
    const shift = (d: string, n: number) => new Date(toMs(d) + n * ms).toISOString().slice(0, 10);
    return Array.from({ length: 7 }, (_, i) => {
      const lag = 6 - i;
      return `${fmtDate(shift(startDate, -lag * per))} → ${fmtDate(shift(endDate, -lag * per))}`;
    });
  })();

  const timeSeries = data?.gsc?.timeSeries || [];

  // Kelompokkan deret harian menjadi 7 periode setara — tiap batang = satu bagian
  // dari rentang tanggal yang dipilih (gambar naik/turun 7 periode ke belakang).
  const bucketize = (rows: any[], key?: string): number[] => {
    const vals = rows.map((r: any) => Number(key ? r?.[key] : r) || 0);
    if (vals.length === 0) return [];
    const n = 7;
    const per = Math.max(1, Math.ceil(vals.length / n));
    const buckets: number[] = [];
    for (let i = 0; i < n; i++) {
      const slice = vals.slice(i * per, (i + 1) * per);
      if (slice.length === 0) break;
      // bagian terakhir: rata-rata saja biar posisi/click tidak membengkak
      const sum = slice.reduce((a, b) => a + b, 0);
      buckets.push(Math.round((sum / slice.length) * 100) / 100);
    }
    return buckets;
  };

  const spark = (key: string) => {
    const vals = bucketize(timeSeries, key);
    const max = Math.max(1, ...vals);
    return { vals, max };
  };
  // ambil deret batang 7 periode — sumber utama: deret asli dari server
  // (periodSeries GSC / sesiPeriod GA4). Fallback: bucketize harian lama.
  const bars = (stat: any): { vals: number[]; max: number } => {
    const ps = data?.gsc?.periodSeries;
    if (stat.key === '' && Array.isArray(data?.sesiPeriod) && data.sesiPeriod!.length > 0) {
      const vals = data.sesiPeriod!;
      return { vals, max: Math.max(1, ...vals) };
    }
    if (stat.key && Array.isArray(ps) && ps.length > 0) {
      const vals = ps.map((p: any) => Number(p[stat.key]) || 0);
      return { vals, max: Math.max(1, ...vals) };
    }
    if (stat.key) return spark(stat.key);
    const src = ((data as any)?.sesiHarian || []) as any[];
    const vals = bucketize(src, 'sessions');
    return { vals, max: Math.max(1, ...vals) };
  };

  // ===== Kartu SKOR — urutan: Average position, Total impressions, Total clicks, Average CTR, Total sessions =====
  const stats = s
    ? [
        { label: 'Posisi', value: (s.position ?? 0).toFixed(1), prevValue: cmp ? (cmp.position ?? 0).toFixed(1) : '—', icon: BarChart3, circle: 'bg-amber-50', color: 'text-amber-500', sparkCls: 'bg-amber-400', key: 'position', cur: s.position ?? 0, prev: cmp?.position ?? 0, inverse: true },
        { label: 'Impressi', value: fmtNum(s.impressions), prevValue: cmp ? fmtNum(cmp.impressions) : '—', icon: Eye, circle: 'bg-violet-50', color: 'text-violet-500', sparkCls: 'bg-violet-400', key: 'impressions', cur: s.impressions, prev: cmp?.impressions ?? 0 },
        { label: 'Klik', value: fmtNum(s.clicks), prevValue: cmp ? fmtNum(cmp.clicks) : '—', icon: MousePointer2, circle: 'bg-blue-50', color: 'text-blue-500', sparkCls: 'bg-blue-400', key: 'clicks', cur: s.clicks, prev: cmp?.clicks ?? 0 },
        { label: 'Ctr', value: `${((s.ctr ?? 0) * 100).toFixed(1)}%`, prevValue: cmp ? `${((cmp.ctr ?? 0) * 100).toFixed(1)}%` : '—', icon: Target, circle: 'bg-teal-50', color: 'text-teal-500', sparkCls: 'bg-teal-400', key: 'ctr', cur: (s.ctr ?? 0) * 100, prev: (cmp?.ctr ?? 0) * 100 },
        { label: 'Sesi', value: fmtNum(data?.totalSessions ?? 0), prevValue: data?.totalSessionsPrev ? fmtNum(data.totalSessionsPrev) : null, icon: Users, circle: 'bg-rose-50', color: 'text-rose-500', sparkCls: 'bg-rose-400', key: '', cur: data?.totalSessions ?? 0, prev: data?.totalSessionsPrev ?? 0 },
      ]
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      {note && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">{note}</div>
      )}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-white border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : !data ? (
        <div className="p-10 text-center text-gray-400 text-sm bg-white border border-dashed border-gray-200 rounded-2xl">
          Data overview akan tampil di sini setelah property dipilih.
        </div>
      ) : (
        <>
          {/* ===== 5 KARTU SKOR (urutan sesuai permintaan) ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {stats.map((stat, i) => {
              const { vals, max } = bars(stat);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 rounded-xl shadow-sm border border-gray-200 bg-white"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center", stat.circle)}>
                        <stat.icon className={cn("w-4 h-4", stat.color)} />
                      </span>
                      <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">{stat.label}</span>
                    </div>
                    {isComparing && renderChange(stat.cur, stat.prev, stat.inverse)}
                  </div>
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      {isComparing && stat.prevValue != null && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-sm font-bold text-gray-400">{stat.prevValue}</span>
                        </div>
                      )}
                      <div className="text-3xl font-extrabold leading-none text-gray-900">{stat.value}</div>
                    </div>
                    {vals.length > 0 && (
                      <div className="flex items-end gap-[3px] h-9">
                        {vals.map((v: number, k: number) => (
                          <div
                            key={k}
                            title={periodeLabels[k] || ''}
                            className={cn("w-1.5 rounded-sm", stat.sparkCls, "opacity-70")}
                            style={{ height: `${Math.max(10, (v / max) * 100)}%` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ===== Top artikel + top query ===== */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Panel title="Artikel Paling Perform" icon={ArrowUpRight}>
              {data.gsc.topPages.length === 0 ? (
                <Empty msg="Tidak ada artikel pada rentang ini." />
              ) : (
                <SortableTable
                  cols={[
                    { id: 'key', label: 'Halaman' },
                    { id: 'clicks', label: 'Klik', align: 'right' },
                    { id: 'impressions', label: 'Impresi', align: 'right' },
                    { id: 'position', label: 'Pos.', align: 'right' },
                  ]}
                  rows={data.gsc.topPages.filter((rr) => {
                    const k = rr.key || '';
                    // bukan artikel nyata: ada '#', atau halaman indeks /blog/ & /page/
                    if (k.includes('#')) return false;
                    if (k === 'https://daykit.id/blog/' || k === 'https://daykit.id/blog/page/') return false;
                    return true;
                  })}
                  cell={(r, col) => {
                    if (col === 'key') return <span className="text-gray-700 block truncate" title={r.key}>{r.key}</span>;
                    if (col === 'clicks') return <span className="font-bold text-gray-900">{fmtNum(r.clicks)}</span>;
                    if (col === 'impressions') return <span className="text-gray-600">{fmtNum(r.impressions)}</span>;
                    return <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-gray-100 text-gray-600">{(r.position ?? 0).toFixed(1)}</span>;
                  }}
                />
              )}
            </Panel>

            <Panel title="Query Paling Perform" icon={Target}>
              {data.gsc.topQueries.length === 0 ? (
                <Empty msg="Tidak ada query pada rentang ini." />
              ) : (
                <SortableTable
                  cols={[
                    { id: 'key', label: 'Query' },
                    { id: 'clicks', label: 'Klik', align: 'right' },
                    { id: 'impressions', label: 'Impresi', align: 'right' },
                    { id: 'position', label: 'Pos.', align: 'right' },
                  ]}
                  rows={data.gsc.topQueries}
                  cell={(r, col) => {
                    if (col === 'key') return <span className="text-gray-700 block truncate" title={r.key}>{r.key}</span>;
                    if (col === 'clicks') return <span className="font-bold text-gray-900">{fmtNum(r.clicks)}</span>;
                    if (col === 'impressions') return <span className="text-gray-600">{fmtNum(r.impressions)}</span>;
                    return <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700">{(r.position ?? 0).toFixed(1)}</span>;
                  }}
                />
              )}
            </Panel>
          </div>

          {/* ===== Sumber trafik + kota ===== */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Panel
              title="Sumber Trafik Terbanyak"
              icon={Globe}
              hint={
                <span className="flex items-center gap-1.5 flex-wrap justify-end">
                  {(['semua', 'organic', 'referral', 'ai'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setSrcFilter(f)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-colors border',
                        srcFilter === f
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700'
                      )}
                    >
                      {f === 'semua' ? 'Semua' : f}
                    </button>
                  ))}
                </span>
              }
            >
              {(() => {
                const med = (r: any) => String(r.medium ?? '').toLowerCase();
                const all = data.topSources as any[];
                const pass = (r: any) => {
                  const m = med(r);
                  if (srcFilter === 'semua') return true;
                  if (srcFilter === 'organic') return m.includes('organic');
                  if (srcFilter === 'referral') return m.includes('referral');
                  if (srcFilter === 'direct') return m.includes('direct');
                  // ai: sumber AI (ChatGPT, Perplexity, Gemini, Copilot, dll)
                  const s = String(r.source ?? '').toLowerCase();
                  return s.includes('ai') || s.includes('chatgpt') || s.includes('perplexity') || s.includes('gemini') || s.includes('copilot') || s.includes('llms-txt');
                };
                const rows = all.filter(pass);
                if (all.length === 0) return <Empty msg="Belum ada data sumber trafik (perlu property GA4 terpilih)." />;
                return (
                  <SortableTable
                      maxH="max-h-[420px]"
                      cols={[
                        { id: 'source', label: 'Sumber' },
                        { id: 'medium', label: 'Medium' },
                        { id: 'sessions', label: 'Sesi', align: 'right' },
                      ]}
                      rows={rows}
                      cell={(r, col) => {
                        const rr = r as any;
                        if (col === 'source') return <span className="text-gray-700 truncate block" title={rr.source || '-'}>{rr.source || '(tidak diketahui)'}</span>;
                        if (col === 'medium') return <span className="text-gray-600">{rr.medium || '-'}</span>;
                        return <span className="font-bold text-gray-900">{fmtNum(r.sessions)}</span>;
                      }}
                    />
                );
              })()}
            </Panel>

            <Panel title="Kota Pengunjung Terbanyak" icon={MapPin}>
              {data.topCities.length === 0 ? (
                <Empty msg="Belum ada data kota pengunjung (perlu property GA4 terpilih)." />
              ) : (
                <SortableTable
                  cols={[
                    { id: 'key', label: 'Kota' },
                    { id: 'sessions', label: 'Sesi', align: 'right' },
                  ]}
                  rows={data.topCities}
                  cell={(r, col) =>
                    col === 'key'
                      ? <span className="text-gray-700">{r.key || '(tidak diketahui)'}</span>
                      : <span className="font-bold text-gray-900">{fmtNum(r.sessions)}</span>
                  }
                />
              )}
            </Panel>
          </div>

          {/* ===== Browser / OS / Device — metrik: sesi ===== */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {([
              { title: 'Browser', icon: Globe, rows: data.topBrowsers || [] },
              { title: 'Operating System', icon: BarChart3, rows: data.topOss || [] },
              { title: 'Device Category', icon: Users, rows: data.topDevices || [] },
            ] as const).map((pnl) => (
              <div key={pnl.title}>
              <Panel title={pnl.title} icon={pnl.icon}>
                {pnl.rows.length === 0 ? (
                  <Empty msg="Belum ada data (perlu property GA4 terpilih)." />
                ) : (
                  <SortableTable
                    maxH="max-h-[430px]"
                    cols={[
                      { id: 'key', label: pnl.title },
                      { id: 'sessions', label: 'Sesi', align: 'right' },
                    ]}
                    rows={pnl.rows}
                    cell={(rw, col) =>
                      col === 'key'
                        ? <span className="text-gray-700 block truncate" title={rw.key}>{rw.key || '(tidak diketahui)'}</span>
                        : <span className="font-bold text-gray-900">{fmtNum(rw.sessions)}</span>
                    }
                  />
                )}
              </Panel>
              </div>
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}