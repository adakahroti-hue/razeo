import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, BarChart3, Eye, Globe, MapPin, MousePointer2, RefreshCw, Target } from 'lucide-react';
import { cn } from '../lib/utils';

type OvRow = { key: string; clicks?: number; impressions?: number; ctr?: number; position?: number; sessions?: number };

type Props = {
  loading: boolean;
  data: null | {
    gsc: { summary: any; topPages: OvRow[]; topQueries: OvRow[]; timeSeries?: any[] };
    gscPrev: any;
    topSources: OvRow[];
    topCities: OvRow[];
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

function Panel({ title, icon: Icon, children, hint }: { title: string; icon: any; children: React.ReactNode; hint?: string }) {
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

export default function OverviewTab({ loading, data, note, startDate, endDate, compareStartDate, compareEndDate, isComparing, renderChange, onRefresh }: Props) {
  const s = data?.gsc.summary;
  const cmp = data?.gscPrev?.summary;
  const fmtNum = (n: number | undefined | null) =>
    (n ?? 0) >= 1000 ? `${((n ?? 0) / 1000).toFixed(1)}K` : String(n ?? 0);

  // sparkline dari deret harian (14 titik terakhir)
  const timeSeries = data?.gsc?.timeSeries || [];
  const spark = (key: string) => {
    const vals = timeSeries.slice(-14).map((r: any) => Number(r?.[key]) || 0);
    const max = Math.max(1, ...vals);
    return { vals, max };
  };

  // 4 kartu — gaya identik tab Audit (nilai besar, sparkline, badge compare)
  const stats = s
    ? [
        { label: 'Total clicks', value: fmtNum(s.clicks), prevValue: cmp ? fmtNum(cmp.clicks) : '—', icon: MousePointer2, circle: 'bg-blue-50', color: 'text-blue-500', sparkCls: 'bg-blue-400', key: 'clicks', cur: s.clicks, prev: cmp?.clicks ?? 0 },
        { label: 'Total impressions', value: fmtNum(s.impressions), prevValue: cmp ? fmtNum(cmp.impressions) : '—', icon: Eye, circle: 'bg-violet-50', color: 'text-violet-500', sparkCls: 'bg-violet-400', key: 'impressions', cur: s.impressions, prev: cmp?.impressions ?? 0 },
        { label: 'Average CTR', value: `${((s.ctr ?? 0) * 100).toFixed(1)}%`, prevValue: cmp ? `${((cmp.ctr ?? 0) * 100).toFixed(1)}%` : '—', icon: Target, circle: 'bg-teal-50', color: 'text-teal-500', sparkCls: 'bg-teal-400', key: 'ctr', cur: (s.ctr ?? 0) * 100, prev: (cmp?.ctr ?? 0) * 100 },
        { label: 'Average position', value: (s.position ?? 0).toFixed(1), prevValue: cmp ? (cmp.position ?? 0).toFixed(1) : '—', icon: BarChart3, circle: 'bg-amber-50', color: 'text-amber-500', sparkCls: 'bg-amber-400', key: 'position', cur: s.position ?? 0, prev: cmp?.position ?? 0, inverse: true },
      ]
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      {note && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">{note}</div>
      )}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-white border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : !data ? (
        <div className="p-10 text-center text-gray-400 text-sm bg-white border border-dashed border-gray-200 rounded-2xl">
          Data overview akan tampil di sini setelah property dipilih.
        </div>
      ) : (
        <>
          {/* ===== 4 KARTU — persis gaya tab Audit ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, i) => {
              const { vals, max } = spark(stat.key);
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
                      {isComparing && (
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <span className="text-sm font-bold text-gray-400">{stat.prevValue}</span>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">periode sebelumnya</span>
                        </div>
                      )}
                      <div className="text-3xl font-extrabold leading-none text-gray-900">{stat.value}</div>
                      <div className="text-[10px] text-gray-400 font-medium mt-2">
                        {fmtDate(isComparing ? compareStartDate : startDate)} - {fmtDate(isComparing ? compareEndDate : endDate)}
                      </div>
                    </div>
                    {vals.length > 0 && (
                      <div className="flex items-end gap-[3px] h-9">
                        {vals.map((v: number, k: number) => (
                          <div
                            key={k}
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
            <Panel title="10 Artikel Paling Perform" icon={ArrowUpRight} hint="urut: klik">
              {data.gsc.topPages.length === 0 ? (
                <Empty msg="Tidak ada artikel pada rentang ini." />
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-3 text-[11px] uppercase font-black text-gray-400">Halaman</th>
                      <th className="px-5 py-3 text-[11px] uppercase font-black text-gray-400 text-right">Klik</th>
                      <th className="px-5 py-3 text-[11px] uppercase font-black text-gray-400 text-right">Impresi</th>
                      <th className="px-5 py-3 text-[11px] uppercase font-black text-gray-400 text-right">Pos.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.gsc.topPages.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3 text-gray-700 max-w-[300px] truncate" title={r.key}>{r.key}</td>
                        <td className="px-5 py-3 text-right font-bold text-gray-900">{fmtNum(r.clicks)}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{fmtNum(r.impressions)}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-gray-100 text-gray-600">{(r.position ?? 0).toFixed(1)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel title="10 Query Paling Perform" icon={Target} hint="urut: klik">
              {data.gsc.topQueries.length === 0 ? (
                <Empty msg="Tidak ada query pada rentang ini." />
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-3 text-[11px] uppercase font-black text-gray-400">Query</th>
                      <th className="px-5 py-3 text-[11px] uppercase font-black text-gray-400 text-right">Klik</th>
                      <th className="px-5 py-3 text-[11px] uppercase font-black text-gray-400 text-right">Impresi</th>
                      <th className="px-5 py-3 text-[11px] uppercase font-black text-gray-400 text-right">Pos.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.gsc.topQueries.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3 text-gray-700 max-w-[300px] truncate" title={r.key}>{r.key}</td>
                        <td className="px-5 py-3 text-right font-bold text-gray-900">{fmtNum(r.clicks)}</td>
                        <td className="px-5 py-3 text-right text-gray-600">{fmtNum(r.impressions)}</td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700">{(r.position ?? 0).toFixed(1)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>

          {/* ===== Sumber trafik + kota ===== */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Panel title="10 Sumber Trafik Terbanyak" icon={Globe} hint="GA4 · sesi">
              {data.topSources.length === 0 ? (
                <Empty msg="Belum ada data sumber trafik (perlu property GA4 terpilih)." />
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-3 text-[11px] uppercase font-black text-gray-400">Sumber / Medium</th>
                      <th className="px-5 py-3 text-[11px] uppercase font-black text-gray-400 text-right">Sesi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.topSources.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3 text-gray-700">{r.key || '(tidak diketahui)'}</td>
                        <td className="px-5 py-3 text-right font-bold text-gray-900">{fmtNum(r.sessions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            <Panel title="10 Kota Pengunjung Terbanyak" icon={MapPin} hint="GA4 · sesi">
              {data.topCities.length === 0 ? (
                <Empty msg="Belum ada data kota pengunjung (perlu property GA4 terpilih)." />
              ) : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-3 text-[11px] uppercase font-black text-gray-400">Kota</th>
                      <th className="px-5 py-3 text-[11px] uppercase font-black text-gray-400 text-right">Sesi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.topCities.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/60">
                        <td className="px-5 py-3 text-gray-700">{r.key || '(tidak diketahui)'}</td>
                        <td className="px-5 py-3 text-right font-bold text-gray-900">{fmtNum(r.sessions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        </>
      )}
    </motion.div>
  );
}