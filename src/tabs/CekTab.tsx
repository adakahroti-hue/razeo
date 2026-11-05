import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, BarChart3, ArrowDown, ArrowUp, MousePointer2, ScanLine, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';

type GscRow = { url: string; clicks?: number; impressions?: number; ctr?: number; position?: number };
type Pair = { url: string; value: number };

type Props = {
  loading: boolean;
  kind: Kind;
  onKind: (k: Kind) => void;
  data: null | {
    gsc: { current: GscRow[]; previous: GscRow[] };
    sesi: { current: Pair[]; previous: Pair[] };
    scroll75: { current: Pair[]; previous: Pair[] };
  };
};

export type Kind = 'impressi' | 'posisi' | 'klik' | 'sesi' | 'scroll';

// daftar jenis data — tombolnya ada di SIDEBAR (App.tsx), jadi ikut diekspor
export const KINDS: { id: Kind; label: string; icon: any }[] = [
  { id: 'impressi', label: 'Impresi', icon: MapPin },
  { id: 'posisi', label: 'Posisi', icon: BarChart3 },
  { id: 'klik', label: 'Klik', icon: MousePointer2 },
  { id: 'sesi', label: 'Sesi', icon: Activity },
  { id: 'scroll', label: 'Scroll', icon: ScanLine },
];

/** posisi 0 (atau absen) = TIDAK ADA posisi; posisi 1 = tertinggi (tak ada di atasnya) → null */
const posNum = (v: unknown): number | null => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};
// status perbandingan posisi dua periode
type PosStatus = 'none' | 'muncul' | 'hilang' | 'naik' | 'turun' | 'sama';
const posStatus = (pp: number | null, pc: number | null): PosStatus => {
  if (pp == null && pc == null) return 'none';       // tak pernah tampil sama sekali
  if (pp == null) return 'muncul';                   // 0 → >0 : BAGUS (muncul di indeks)
  if (pc == null) return 'hilang';                   // >0 → 0 : BURUK (hilang dari indeks)
  return pc < pp ? 'naik' : pc > pp ? 'turun' : 'sama'; // naik = mendekati posisi 1 = bagus
};
// teks selisih + warna utk status posisi
const posStatusView = (s: PosStatus, pc: number | null, pp: number | null) => {
  if (s === 'none') return { text: '—', cls: 'text-gray-400' };
  if (s === 'muncul') return { text: `▲ muncul (dari 0 → ${pc!.toFixed(1)})`, cls: 'text-emerald-700' };
  if (s === 'hilang') return { text: `▼ hilang (dari ${pp!.toFixed(1)} → 0)`, cls: 'text-red-600' };
  if (s === 'sama') return { text: '0.0', cls: 'text-gray-500' };
  const d = pc! - pp!;
  return { text: `${d > 0 ? '▼' : '▲'} ${Math.abs(d).toFixed(1)}`, cls: d < 0 ? 'text-emerald-700' : 'text-red-600' };
};

const div = (d: number | undefined | null) => (d == null ? '—' : `${d > 0 ? '+' : ''}${d}`);
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

function DeltaBadge({ value, inverse = false, raw, extra, digits = 2 }: { value: number | null; inverse?: boolean; raw?: string; extra?: 'muncul' | 'hilang'; digits?: number }) {
  if (extra === 'muncul') return <span className="inline-flex items-center text-xs font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">↑ muncul</span>;
  if (extra === 'hilang') return <span className="inline-flex items-center text-xs font-black px-2 py-0.5 rounded-md bg-red-50 text-red-600">↓ hilang</span>;
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

export default function CekTab({ loading, data, kind, onKind }: Props) {
  const [sort, setSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);
  // ganti jenis data dari sidebar → urutan kolom lama tak relevan lagi
  useEffect(() => { setSort(null); }, [kind]);

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
          // posisi 0 = TIDAK ADA posisi (posisi 1 = tertinggi) → status khusus,
          // bukan selisih biasa (0 dianggap angka terendah oleh aritmatika)
          const pp = posNum(p.position);
          const pc = posNum(c.position);
          const pStatus = posStatus(pp, pc);
          const selPos = pp != null && pc != null ? pc - pp : null;
          return { url, prev: p.impressions ?? 0, cur: c.impressions ?? 0, sel, delta: rel(c.impressions ?? 0, p.impressions ?? 0), pp, pc, pStatus, selPos };
        }
        if (kind === 'posisi') {
          // posisi 0 = tak ada posisi → null = tidak muncul di hasil pencarian
          const pp = posNum(p.position);
          const pc = posNum(c.position);
          const pStatus = posStatus(pp, pc);
          const selImp = (c.impressions ?? 0) - (p.impressions ?? 0);
          return { url, prev: pp, cur: pc, pStatus, selImp };
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
    // status posisi: 'sama'/'none' dianggap skor tertinggi (tampil ‘0.0’/‘—’ di atas)
    const scoreSt = (s: string) => (s === 'sama' || s === 'none' ? Infinity : s === 'muncul' ? 1e9 : s === 'turun' ? 1 : 0);
    const num = (r: any): number => {
      if (sort.id === 'sel' && kind === 'posisi') return r.pStatus ? scoreSt(r.pStatus) : -Infinity;
      if (sort.id === 'delta' && kind === 'impressi') return r.pStatus ? scoreSt(r.pStatus) : -Infinity;
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
          { id: 'prev', label: 'Impresi Periode Sebelumnya', right: true },
          { id: 'cur', label: 'Impresi Periode Sekarang', right: true },
          { id: 'sel', label: 'Selisih Impresi', right: true },
          { id: 'delta', label: 'Perubahan Posisi SERP', right: true },
        ]
      : kind === 'posisi'
      ? [
          { id: 'url', label: 'URL' },
          { id: 'prev', label: 'Posisi (Sebelumnya)', right: true },
          { id: 'cur', label: 'Posisi (Sekarang)', right: true },
          { id: 'sel', label: 'Selisih Posisi (0 = tak tampil)', right: true },
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
      if (kind === 'posisi') {
        const v = posStatusView(r.pStatus, r.cur, r.prev);
        return <span className={cn('font-bold', v.cls)}>{v.text}</span>;
      }
      if (kind === 'klik') return <span className={cn('font-bold', r.sel > 0 ? 'text-emerald-700' : r.sel < 0 ? 'text-red-600' : 'text-gray-500')}>{pct(r.sel)}</span>;
      return <span className={cn('font-bold', r.sel > 0 ? 'text-emerald-700' : r.sel < 0 ? 'text-red-600' : 'text-gray-500')}>{div(r.sel)}</span>;
    }
    if (id === 'delta') {
      if (kind === 'impressi') {
        const v = posStatusView(r.pStatus, r.pc, r.pp);
        return <span className={cn('font-bold', v.cls)}>{v.text}</span>;
      }
      if (kind === 'posisi') return null;
      return <DeltaBadge value={r.delta} />;
    }
    if (id === 'selImp') return <span className="font-bold text-gray-600">{div(r.selImp)}</span>; // posisi: selisih impresi
    if (kind === 'posisi') return <span className="font-bold text-gray-900">{r[id] == null ? '—' : Number(r[id]).toFixed(1)}</span>; // posisi 0 = tak ada posisi → tampil —
    if (kind === 'klik') return <span className="font-bold text-gray-900">{Number(r[id] ?? 0).toFixed(2)}%</span>;
    if (id === 'prev' || id === 'cur') return <span className="font-bold text-gray-900">{id === 'cur' ? r.cur : r.prev}</span>;
    return <span>{String(r[id])}</span>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      {/* jenis data (Impresi/Posisi/Klik/Sesi/Scroll) dipilih dari sidebar; sini cuma info jumlah */}
      <div className="flex items-center justify-end">
        <span className="text-[11px] font-bold text-gray-400 uppercase">{rows.length} URL</span>
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
            <tbody className="block overflow-y-auto max-h-[calc(100vh-16rem)]">
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