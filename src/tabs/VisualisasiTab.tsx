import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Network } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ContentItem } from './KontenTab';
import { keywordMap, urlToKeyword } from '../lib/resolveKeyword';

type Props = {
  loading: boolean;
  items: ContentItem[];
};

const splitLinks = (v: string | null): string[] =>
  (v || '').split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);

const roleStyle: Record<string, string> = {
  inspire: 'bg-blue-50 text-blue-700 border-blue-100',
  educate: 'bg-purple-50 text-purple-700 border-purple-100',
  convert: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

type Node = { it: ContentItem; kw: string; outs: string[] };

// Geometri tetap (px) supaya garis lengkung SVG selalu pas dengan kartu:
// tinggi tiap baris anak = 36px; jarak bridge (titik 0,12) ke pusat anak ke-i = 30 + 36i
const CHILD_H = 36;
const BRIDGE_Y = 12; // pusat garis keluar dari kartu induk, relatif atas ul
const curve = (i: number) => {
  const y = BRIDGE_Y + 18 + i * CHILD_H;
  return `M0,${BRIDGE_Y} C22,${BRIDGE_Y} 30,${y} 56,${y}`;
};

export default function VisualisasiTab({ loading, items }: Props) {
  const [q, setQ] = useState('');
  const kwMap = useMemo(() => keywordMap(items), [items]);

  const nodes: Node[] = useMemo(
    () =>
      items.map((it) => {
        const kw = (it.target_keyword || it.judul || '(tanpa keyword)').trim();
        const outs = splitLinks(it.internal_link).map((u) => urlToKeyword(u, kwMap));
        return { it, kw, outs };
      }),
    [items, kwMap]
  );

  const vis = nodes.filter((n) => !q || n.kw.toLowerCase().includes(q.toLowerCase()));
  const linked = nodes.filter((n) => n.outs.length > 0).length;
  const totalEdges = nodes.reduce((s, n) => s + n.outs.length, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari target keyword..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 shadow-sm"
          />
        </div>
        <div className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-500 whitespace-nowrap shadow-sm">
          Total: <b className="text-emerald-600">{vis.length} Node</b>
          <span className="mx-1.5 text-gray-300">&bull;</span>
          Punya cabang: <b className="text-emerald-600">{linked}</b>
          <span className="mx-1.5 text-gray-300">&bull;</span>
          Koneksi: <b className="text-emerald-600">{totalEdges}</b>
        </div>
      </div>

      {/* diagram */}
      {loading && items.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-8 text-center text-gray-400 text-sm shadow-sm">Memuat diagram...</div>
      )}
      {!loading && vis.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-10 text-center text-gray-400 text-sm shadow-sm">
          <Network className="w-6 h-6 mx-auto mb-2 text-gray-300" />
          {items.length === 0
            ? 'Belum ada artikel. Tambahkan konten dulu di sub-tab Artikel.'
            : 'Tidak ada artikel yang cocok dengan pencarian.'}
        </div>
      )}

      {vis.length > 0 && (
        <div
          className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgb(229 231 235 / 0.6) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
          }}
        >
          {vis.map(({ it, kw, outs }) => (
            <div key={it.id} className="px-6 py-5 border-b border-gray-100 last:border-b-0 bg-white/70 hover:bg-white transition-colors">
              <div className="flex items-start">
                {/* ===== kartu induk (kiri) ===== */}
                <div className="w-[250px] shrink-0 rounded-2xl bg-white border border-gray-200/80 shadow-sm p-3.5 relative">
                  <span className="absolute left-0 top-3 bottom-3 w-1 rounded-full bg-emerald-400" aria-hidden />
                  <span className="block text-[13.5px] font-semibold text-gray-900 leading-snug break-words pl-1.5">{kw}</span>
                  <span className="flex flex-wrap items-center gap-1.5 mt-2 pl-1.5">
                    {it.peran && (
                      <span className={cn('inline-block px-1.5 py-px rounded-md text-[10px] font-bold capitalize border', roleStyle[it.peran] || 'bg-gray-50 text-gray-600 border-gray-100')}>
                        {it.peran}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400 font-medium">
                      {outs.length ? `${outs.length} cabang` : 'ujung (tanpa link)'}
                    </span>
                  </span>
                </div>

                {/* ===== cabang melengkung ke kanan ===== */}
                <ul className="relative flex-1 min-w-0 flex flex-col pt-3">
                  {/* path SVG melengkung — deterministik dari tinggi anak tetap */}
                  {outs.length > 0 && (
                    <svg
                      className="absolute left-0 top-0 h-full w-14 overflow-visible pointer-events-none"
                      aria-hidden
                      style={{ width: 56 }}
                    >
                      {outs.map((_, i) => (
                        <path
                          key={i}
                          d={curve(i)}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth={1.5}
                          strokeLinecap="round"
                          opacity={0.75}
                        />
                      ))}
                    </svg>
                  )}
                  {outs.map((o, i) => (
                    <li
                      key={i}
                      className="pl-14 flex items-center"
                      style={{ height: CHILD_H }}
                    >
                      <span
                        className="inline-flex items-baseline max-w-full bg-white border border-indigo-150 shadow-sm rounded-xl px-3 py-1 text-[12.5px] text-indigo-700 font-medium break-words leading-snug"
                        style={{ borderColor: '#e0e7ff' }}
                        title={`Tujuan internal dari: ${kw}`}
                      >
                        {o}
                      </span>
                    </li>
                  ))}
                  {outs.length === 0 && (
                    <li className="pl-14 flex items-center text-xs text-gray-300 italic" style={{ height: CHILD_H }}>
                      —
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-7 h-4 rounded-md bg-white border border-gray-200 shadow-sm" /> kartu artikel
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="26" height="8" className="shrink-0"><path d="M0,4 C7,4 19,4 26,4" stroke="#10b981" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.75" /></svg> garis internal link (lengkung)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-7 h-4 rounded-md bg-white border border-indigo-100 shadow-sm" /> kartu tujuan
        </span>
        <span className="text-gray-300 hidden sm:inline">| induk di kiri, bercabang halus ke kanan</span>
      </p>
    </motion.div>
  );
}