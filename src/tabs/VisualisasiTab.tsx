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
  inspire: 'bg-blue-50 text-blue-700',
  educate: 'bg-purple-50 text-purple-700',
  convert: 'bg-emerald-50 text-emerald-700',
};

type Node = { it: ContentItem; kw: string; outs: string[] };

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
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-500 whitespace-nowrap">
          Total: <b className="text-emerald-600">{vis.length} Node</b>
          <span className="mx-1.5 text-gray-300">&bull;</span>
          Punya cabang: <b className="text-emerald-600">{linked}</b>
          <span className="mx-1.5 text-gray-300">&bull;</span>
          Koneksi: <b className="text-emerald-600">{totalEdges}</b>
        </div>
      </div>

      {/* diagram struktural */}
      {loading && items.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-8 text-center text-gray-400 text-sm">Memuat diagram...</div>
      )}
      {!loading && vis.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-10 text-center text-gray-400 text-sm">
          <Network className="w-6 h-6 mx-auto mb-2 text-gray-300" />
          {items.length === 0
            ? 'Belum ada artikel. Tambahkan konten dulu di sub-tab Artikel.'
            : 'Tidak ada artikel yang cocok dengan pencarian.'}
        </div>
      )}
      {vis.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          {vis.map(({ it, kw, outs }) => (
            <div key={it.id} className="px-5 py-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/40">
              <div className="flex items-start">
                {/* ===== KOTAK INDUK: node kiri (target keyword utama) ===== */}
                <div className="w-[236px] shrink-0 rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 relative">
                  {/* bridge horizontal ke spine */}
                  <span className="absolute top-[22px] right-0 translate-x-full w-5 h-0.5 bg-emerald-400" aria-hidden />
                  <span className="block text-sm font-semibold text-gray-900 leading-snug break-words">{kw}</span>
                  <span className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {it.peran && (
                      <span className={cn('inline-block px-1.5 py-px rounded text-[10px] font-bold capitalize', roleStyle[it.peran] || 'bg-gray-100 text-gray-600')}>
                        {it.peran}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-500 font-medium">
                      {outs.length ? `${outs.length} cabang` : 'ujung (tanpa link)'}
                    </span>
                  </span>
                </div>

                {/* ===== CABANG KANAN: spine + anak ===== */}
                <ul className="relative flex-1 min-w-0 flex flex-col gap-1 pt-5 pb-2">
                  {/* spine vertikal — hanya bila >1 cabang */}
                  {outs.length > 1 && (
                    <span
                      className="absolute left-0 top-[22px] bottom-[25px] w-0.5 bg-emerald-400"
                      aria-hidden
                    />
                  )}
                  {outs.map((o, i) => (
                    <li key={i} className="relative pl-4 flex items-center min-h-[34px]">
                      {/* stub horizontal dari spine ke kotak anak */}
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-4 bg-emerald-400" aria-hidden />
                      <span
                        className="inline-block max-w-full px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-medium break-words leading-snug"
                        title={`Tujuan internal dari: ${kw}`}
                      >
                        {o}
                      </span>
                    </li>
                  ))}
                  {outs.length === 0 && (
                    <li className="pl-4 flex items-center min-h-[34px] text-xs text-gray-400 italic">
                      — tidak punya internal link
                    </li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-gray-400 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-8 h-5 rounded border border-emerald-300 bg-emerald-50" /> node induk (target keyword)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-6 h-0.5 bg-emerald-400" /> garis struktur (internal link)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-8 h-5 rounded border border-indigo-200 bg-indigo-50" /> anak tujuan (keyword artikel dituju)
        </span>
        <span className="text-gray-300">| struktur horizontal: induk di kiri, bercabang ke kanan</span>
      </p>
    </motion.div>
  );
}