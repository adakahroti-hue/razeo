import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Link2, ArrowRight, Network } from 'lucide-react';
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
          Total: <b className="text-emerald-600">{vis.length} Artikel</b>
          <span className="mx-1.5 text-gray-300">&bull;</span>
          Punya link: <b className="text-emerald-600">{linked}</b>
        </div>
      </div>

      {/* diagram */}
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
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* header kolom diagram */}
          <div className="grid grid-cols-[minmax(200px,1fr)_56px_minmax(200px,1.3fr)] items-center gap-0 border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
            <span className="text-[11px] uppercase tracking-wide font-medium text-gray-400">Artikel (target keyword)</span>
            <span />
            <span className="text-[11px] uppercase tracking-wide font-medium text-gray-400 text-center">Ditujukan ke (internal link)</span>
          </div>

          {vis.map(({ it, kw, outs }) => (
            <div key={it.id} className="grid grid-cols-[minmax(200px,1fr)_56px_minmax(200px,1.3fr)] items-center gap-0 border-b border-gray-50 last:border-b-0 px-4 py-3 hover:bg-gray-50/60">
              {/* kotak kiri: artikel sumber */}
              <div className="flex items-center gap-2.5 min-w-0 pr-3">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" title="artikel sumber" />
                <div className="min-w-0">
                  <span className="block text-sm font-semibold text-gray-900 break-words leading-snug">{kw}</span>
                  <span className="flex items-center gap-1.5 mt-1">
                    {it.peran && (
                      <span className={cn('inline-block px-1.5 py-px rounded text-[10px] font-bold capitalize', roleStyle[it.peran] || 'bg-gray-100 text-gray-600')}>
                        {it.peran}
                      </span>
                    )}
                    <span className="text-[11px] text-gray-400">{outs.length ? `${outs.length} tujuan` : 'tanpa link'}</span>
                  </span>
                </div>
              </div>

              {/* panah horizontal */}
              <div className="flex items-center justify-center text-gray-300">
                {outs.length > 0 && <ArrowRight className="w-5 h-5" />}
              </div>

              {/* kotak kanan: tujuan (kata kunci) */}
              <div className="min-w-0">
                {outs.length === 0 ? (
                  <span className="text-xs text-gray-400 italic">—</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {outs.map((o, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs break-words">
                        <Link2 className="w-3 h-3 shrink-0" />
                        {o}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" /> artikel sumber
        <span className="mx-1">&rarr;</span>
        <span className="inline-block px-1.5 py-px rounded bg-indigo-50 text-indigo-700 text-[10px] font-bold">kata kunci tujuan</span>
        — tautan dari kolom Internal Link (URL otomatis dipetakan ke keyword artikel tujuannya)
      </p>
    </motion.div>
  );
}