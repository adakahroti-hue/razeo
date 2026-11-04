import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, BarChart3, ArrowDown, ArrowUp, MousePointer2, ScanLine, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';

type GscRow = { url: string; clicks?: number; impressions?: number; ctr?: number; position?: number };
type Pair = { url: string; value: number };

type Props = {
  loading: boolean;
  data: null | {
    gsc: { current: GscRow[]; previous: GscRow[] };
    sesi: { current: Pair[]; previous: Pair[] };
    scroll75: { current: Pair[]; previous: Pair[] };
  };
};

type Kind = 'impressi' | 'posisi' | 'klik' | 'sesi' | 'scroll';

const KINDS: { id: Kind; label: string; icon: any }[] = [
  { id: 'impressi', label: 'Impresi', icon: MapPin },
  { id: 'posisi', label: 'Posisi', icon: BarChart3 },
  { id: 'klik', label: 'Klik', icon: MousePointer2 },
  { id: 'sesi', label: 'Sesi', icon: Activity },
  { id: 'scroll', label: 'Scroll', icon: ScanLine },
];

const div = (d: number | undefined | null) => (d == null ? '—' : `${d > 0 ? '+' : ''}${d}`);
// selisih dalam satuan posisi/CTR: selalu 1 angka di belakang koma
const div1 = (d: number | undefined | null) => (d == null ? '—' : `${d > 0 ? '+' : ''}${d.toFixed(1)}`);
const pct = (d: number | undefined | null) =>
  d == null ? '—' : `${d > 0 ? '+' : ''}${d.toFixed(2)}%`;
// selisih %; posisi turun = bagus
const rel = (cur: number, prev: number) => {
  if (!prev) return null;
  return ((cur - prev) / prev) * 100;
};
// lolos cache parsial: semua URL dari penggabungan dua periode
const allUrls = (a: Pair[], b: Pair[]) => {
  const s = new Set<string>();
  for (const r of [...a, ...b]) r.url && s.add(r.url);
  return [...s];
};

function DeltaBadge({ value, inverse = false, raw, digits = 2 }: { value: number | null; inverse?: boolean; raw?: string; digits?: number }) {
  if (raw) return <span className="text-xs font-bold text-gray-600">{raw}</span>;
  if (value == null) return <span className="text-xs font-bold text-gray-400">—</span>;
  const isUp = value > 0;
  // posisi: turun (negatif) lebih baik
  const good = inverse ? !isUp : isUp;
  if (value === 0) return <span className="text-xs font-bold text-gray-400">0</span>;
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 text-xs font-black px-2 py-0.5 rounded-md',
      good ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
    )}>
      {isUp ? '↑' : '↓'} {Math.abs(value).toFixed(digits)}%
    </span>
  );
}

export default function CekTab({ loading, data }: Props) {
  const [kind, setKind] = useState<Kind>('impressi');
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);

  // gabung dua periode jadi satu daftar URL
  const rows = useMemo(() => {
    if (!data) return [] as any[];
    const fmt = (d: string) => `(${d})`;
    if (kind === 'impressi' || kind === 'posisi' || kind === 'klik') {
      const p2 = new Map(data.gsc.previous.map((r) => [r.url, r]));
      const p1 = new Map(data.gsc.current.map((r) => [r.url, r]));
      const urls = [...new Set([...p2.keys(), ...p1.keys()])].filter(Boolean);
      return urls.map((url) => {
        const c: Partial<GscRow> = p1.get(url) || {};
        const p: Partial<GscRow> = p2.get(url) || {};
        if (kind === 'impressi') {
          const sel = (c.impressions ?? 0) - (p.impressions ?? 0);
          // posisi 0 = TIDAK ADA posisi (tak tampil di indeks) → delta hanya
          // dihitung kalau URL punya posisi di KEDUA periode (posisi 1 = tertinggi)
          const pc = c.position && c.position > 0 ? c.position : null;
          const pp = p.position && p.position > 0 ? p.position : null;
          const selPos = pc != null && pp != null ? pc - pp : null;
          return { url, prev: p.impressions ?? 0, cur: c.impressions ?? 0, sel, delta: rel(c.impressions ?? 0, p.impressions ?? 0), selPos };
        }
        if (kind === 'posisi') {
          // posisi 0 = tak ada posisi → null = tidak muncul di hasil pencarian
          const pp = p.position && p.position > 0 ? p.position : null;
          const pc = c.position && c.position > 0 ? c.position : null;
          const sel = pp != null && pc != null ? pc - pp : null;
          const selImp = (c.impressions ?? 0) - (p.impressions ?? 0);
          return { url, prev: pp, cur: pc, sel, delta: sel, selImp };
        }
        // klik → CTR dua periode
        const sel = ((c.ctr ?? 0) - (p.ctr ?? 0)) * 100;
        return { url, prev: (p.ctr ?? 0) * 100, cur: (c.ctr ?? 0) * 100, sel, delta: sel };
      });
    }
    const src = kind === 'sesi' ? data.sesi : data.scroll75;
    const p2 = new Map(src.previous.filter((r) => r.url).map((r) => [r.url, r.value]));
    const p1 = new Map(src.current.filter((r) => r.url).map((r) => [r.url, r.value]));
    const urls = [...new Set([...p2.keys(), ...p1.keys()])];
    return urls.map((url) => {
      const cur = p1.get(url) ?? 0;
      const prev = p2.get(url) ?? 0;
      return { url, prev, cur, sel: cur - prev, delta: rel(cur, prev) };
    });
  }, [data, kind]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    if (sort.id === 'url') return [...rows].sort((a, b) => a.url.localeCompare(b.url) * dir);
    const num = (r: any): number => {
      const v = r[sort.id];
      return typeof v === 'number' ? v : v == null ? -Infinity : Number(v) || -Infinity;
    };
    return [...rows].sort((a, b) => (num(a) - num(b)) * dir);
  }, [rows, sort]);

  const click = (id: string) =>
    setSort((s) => (s && s.id === id ? { id, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { id, dir: 'desc' }));

  const cols: { id: string; label: string; right?: boolean }[] =
    kind === 'impressi'
      ? [
          { id: 'url', label: 'URL' },
          { id: 'prev', label: 'Impresi (Sebelumnya)', right: true },
          { id: 'cur', label: 'Impresi (Sekarang)', right: true },
          { id: 'sel', label: 'Selisih', right: true },
          { id: 'delta', label: 'Δ Posisi SERP', right: true },
        ]
      : kind === 'posisi'
      ? [
          { id: 'url', label: 'URL' },
          { id: 'prev', label: 'Posisi (Sebelumnya)', right: true },
          { id: 'cur', label: 'Posisi (Sekarang)', right: true },
          { id: 'sel', label: 'Selisih Posisi', right: true },
          { id: 'selImp', label: 'Selisih Impressi', right: true },
        ]
      : kind === 'klik'
      ? [
          { id: 'url', label: 'URL' },
          { id: 'prev', label: 'CTR (Sebelumnya)', right: true },
          { id: 'cur', label: 'CTR (Sekarang)', right: true },
          { id: 'sel', label: 'Selisih CTR', right: true },
        ]
      : [
          { id: 'url', label: 'URL' },
          { id: 'prev', label: kind === 'sesi' ? 'Sesi (Sebelumnya)' : 'Scroll 75% (Sebelumnya)', right: true },
          { id: 'cur', label: kind === 'sesi' ? 'Sesi (Sekarang)' : 'Scroll 75% (Sekarang)', right: true },
          { id: 'sel', label: 'Selisih', right: true },
        ];

  const cell = (r: any, id: string): React.ReactNode => {
    if (id === 'url') return <span className="text-gray-700 block truncate" title={r.url}>{r.url}</span>;
    if (id === 'sel') {
      if (kind === 'impressi') return <span className={cn('font-bold', r.sel > 0 ? 'text-emerald-700' : r.sel < 0 ? 'text-red-600' : 'text-gray-500')}>{div(r.sel)}</span>;
      if (kind === 'posisi') return <span className={cn('font-bold', r.sel < 0 ? 'text-emerald-700' : r.sel > 0 ? 'text-red-600' : 'text-gray-500')}>{div1(r.sel)}</span>;
      if (kind === 'klik') return <span className={cn('font-bold', r.sel > 0 ? 'text-emerald-700' : r.sel < 0 ? 'text-red-600' : 'text-gray-500')}>{pct(r.sel)}</span>;
      return <span className={cn('font-bold', r.sel > 0 ? 'text-emerald-700' : r.sel < 0 ? 'text-red-600' : 'text-gray-500')}>{div(r.sel)}</span>;
    }
    if (id === 'delta') {
      if (kind === 'impressi') return <DeltaBadge value={r.delta} />; // ringkasan selisih impresi (berdasar delta %)
      if (kind === 'posisi') return <DeltaBadge value={r.delta} inverse />;
      return <DeltaBadge value={r.delta} />;
    }
    if (id === 'selPos') return <span className="font-bold text-gray-600">{div1(r.selPos)}</span>; // impresi: selisih posisi
    if (id === 'selImp') return <span className="font-bold text-gray-600">{div(r.selImp)}</span>; // posisi: selisih impresi
    if (kind === 'posisi') return <span className="font-bold text-gray-900">{r[id] == null ? '—' : Number(r[id]).toFixed(1)}</span>; // posisi 0 = tak ada posisi → tampil —
    if (kind === 'klik') return <span className="font-bold text-gray-900">{Number(r[id] ?? 0).toFixed(2)}%</span>;
    if (id === 'prev' || id === 'cur') return <span className="font-bold text-gray-900">{id === 'cur' ? r.cur : r.prev}</span>;
    return <span>{String(r[id])}</span>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      {/* sub-tab jenis data */}
      <div className="flex items-center gap-2 flex-wrap">
        {KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => { setKind(k.id); setSort(null); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all',
              kind === k.id
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/25'
                : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
            )}
          >
            <k.icon className={cn('w-4 h-4', kind === k.id ? 'text-white' : 'text-gray-400')} />
            {k.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] font-bold text-gray-400 uppercase">{rows.length} URL</span>
      </div>

      {/* tabel */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[860px]">
            <thead>
              <tr className="border-b border-gray-100 grid grid-cols-[2.5rem_2fr_1fr_1fr_1fr_1fr] items-center">
                <th className="px-4 py-2 text-[11px] uppercase font-black text-gray-400">No.</th>
                {cols.map((c) => (
                  <th key={c.id} className={cn('px-4 py-2 text-[11px] uppercase font-black', sort?.id === c.id ? 'text-emerald-600' : 'text-gray-400', c.right && 'text-right')}>
                    <button onClick={() => click(c.id)} className="inline-flex items-center gap-1 group" title={`Urutkan ${c.label}`}>
                      {c.label}
                      <span className="flex flex-col leading-none text-[9px] opacity-60 group-hover:opacity-100">
                        <ArrowUp className={cn('w-2.5 h-2.5', sort?.id === c.id && sort.dir === 'asc' ? 'opacity-100 text-emerald-600' : 'opacity-40')} />
                        <ArrowDown className={cn('w-2.5 h-2.5 -mt-0.5', sort?.id === c.id && sort.dir === 'desc' ? 'opacity-100 text-emerald-600' : 'opacity-40')} />
                      </span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="block overflow-y-auto max-h-[560px]">
              {loading && rows.length === 0 && (
                <tr className="grid grid-cols-[2.5rem_2fr_1fr_1fr_1fr_1fr]">
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">Memuat…</td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr className="grid grid-cols-[2.5rem_2fr_1fr_1fr_1fr_1fr]">
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">Belum ada data pada kedua periode ini.</td>
                </tr>
              )}
              {sorted.map((r, i) => (
                <tr key={`${r.url}-${i}`} className="hover:bg-gray-50/60 grid grid-cols-[2.5rem_2fr_1fr_1fr_1fr_1fr] items-center border-b border-gray-50">
                  <td className="px-4 py-2.5 text-xs font-black text-gray-400 tabular-nums">{i + 1}</td>
                  {cols.map((c) => (
                    <td key={c.id} className={cn('px-4 py-2.5 min-w-0', c.right && 'text-right')}>{cell(r, c.id)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}