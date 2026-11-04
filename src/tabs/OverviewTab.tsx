import React from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, BarChart3, Eye, Globe, MapPin, MousePointer2, RefreshCw, Target } from 'lucide-react';
import { cn } from '../lib/utils';

type OvRow = { key: string; clicks?: number; impressions?: number; ctr?: number; position?: number; sessions?: number };

type Props = {
  loading: boolean;
  data: null | {
    gsc: { summary: any; topPages: OvRow[]; topQueries: OvRow[] };
    topSources: OvRow[];
    topCities: OvRow[];
  };
  note: string | null;
  startDate: string;
  endDate: string;
  onPreset: (days: number) => void;
  onRefresh: () => void;
};

const PRESETS = [
  { days: 7, label: '7 hari' },
  { days: 14, label: '14 hari' },
  { days: 30, label: '30 hari' },
  { days: 90, label: '90 hari' },
];

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

export default function OverviewTab({ loading, data, note, startDate, endDate, onPreset, onRefresh }: Props) {
  const s = data?.gsc.summary;
  const fmtNum = (n: number | undefined | null) =>
    (n ?? 0) >= 1000 ? `${((n ?? 0) / 1000).toFixed(1)}K` : String(n ?? 0);
  const dateLabel = `${startDate} → ${endDate}`;

  const avgCards = s
    ? [
        { label: 'Rata-rata klik/hari', value: fmtNum(s.avgClicks), icon: MousePointer2, circle: 'bg-blue-50', color: 'text-blue-500' },
        { label: 'Rata-rata impresi/hari', value: fmtNum(s.avgImpressions), icon: Eye, circle: 'bg-violet-50', color: 'text-violet-500' },
        { label: `CTR rata-rata (${s.days} hari)`, value: `${((s.ctr ?? 0) * 100).toFixed(2)}%`, icon: Target, circle: 'bg-teal-50', color: 'text-teal-500' },
        { label: 'Rata-rata posisi', value: (s.position ?? 0).toFixed(1), icon: BarChart3, circle: 'bg-amber-50', color: 'text-amber-500' },
      ]
    : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
      {/* ===== Filter waktu durasi ===== */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Durasi</span>
          {PRESETS.map((p) => (
            <button
              key={p.days}
              onClick={() => onPreset(p.days)}
              className="px-3.5 py-2 rounded-lg text-xs font-bold border transition-colors hover:border-emerald-300 hover:text-emerald-700 text-gray-600"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-gray-500">{dateLabel}</span>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            {loading ? 'Memuat…' : 'Terapkan'}
          </button>
        </div>
      </div>

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
          {/* ===== 4 kartu rata-rata ===== */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {avgCards.map((c, i) => (
              <div key={i} className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center', c.circle)}>
                    <c.icon className={cn('w-4 h-4', c.color)} />
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">{c.label}</span>
                </div>
                <div className="text-3xl font-extrabold text-gray-900 leading-none">{c.value}</div>
              </div>
            ))}
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