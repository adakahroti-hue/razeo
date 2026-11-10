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

// Warna kotak per role — gaya diagram referensi (kotak solid, teks putih, sudut bulat)
const ROLE_FILL: Record<string, string> = {
  inspire: 'bg-[#5b8def] text-white',   // biru — penyebab / gaya inspire
  educate: 'bg-[#69bfae] text-white',   // teal — cara / educate
  convert: 'bg-[#f2994a] text-white',   // oranye — produk / convert
};
const FALLBACK_FILL = 'bg-[#9aa3af] text-white'; // tanpa role-kategori

// Geometri kanvas (px) — deterministik supaya panah SVG selalu pas digambar
const W = 214;      // lebar kotak
const H = 46;       // tinggi kotak
const RG = 20;      // jarak baris vertikal
const GX = 78;      // jarak antar kolom (ruang panah)
const PAD_X = 18;   // padding kanvas
const PAD_Y = 14;

const colX = (col: number) => PAD_X + col * (W + GX);
const rowY = (row: number) => PAD_Y + row * (H + RG);

type GNode = { id: string; kw: string; role: string; outIds: string[] };

export default function VisualisasiTab({ loading, items }: Props) {
  const [q, setQ] = useState('');
  const kwMap = useMemo(() => keywordMap(items), [items]);

  // ===== 1. bangun node & edge (keyword tujuan -> id node) =====
  const nodes: GNode[] = useMemo(() => {
    const list: GNode[] = items.map((it) => ({
      id: it.id,
      kw: (it.target_keyword || it.judul || '(tanpa keyword)').trim(),
      role: (it.peran || '').toLowerCase(),
      outIds: [],
    }));
    // cari id node berdasarkan keyword tujuan (kembali lagi ke id agar di-layout)
    // lookup keyword -> id node (urlToKeyword balikkan target_keyword persis)
    const lookup = new Map<string, string>();
    for (const it of items) {
      const kw = (it.target_keyword || it.judul || '').trim();
      if (kw) lookup.set(kw.toLowerCase(), it.id);
    }
    const byId = new Map(list.map((n) => [n.id, n]));
    for (const it of items) {
      const src = byId.get(it.id);
      if (!src) continue;
      for (const u of splitLinks(it.internal_link)) {
        const targetKw = urlToKeyword(u, kwMap).trim().toLowerCase();
        const tid = lookup.get(targetKw);
        if (tid && tid !== src.id && !src.outIds.includes(tid)) src.outIds.push(tid);
        // tujuan tanpa node di daftar ini (slug biasa) -> abaikan dari diagram
      }
    }
    return list;
  }, [items, kwMap]);

  // ===== 2. filter pencarian =====
  const visibleIds = useMemo(() => {
    if (!q) return null; // null = semua tampil
    const s = q.toLowerCase();
    const ok = new Set(nodes.filter((n) => n.kw.toLowerCase().includes(s)).map((n) => n.id));
    return ok;
  }, [nodes, q]);

  // ===== 3. penentuan level (kolom) — node tanpa incoming = kolom 0 =====
  const layers = useMemo(() => {
    const n = nodes.length;
    const inCount = new Array(n).fill(0);
    const idx = new Map(nodes.map((k, i) => [k.id, i]));
    const outgoing: number[][] = nodes.map((k) => k.outIds.map((t) => idx.get(t)).filter((v): v is number => v !== undefined));
    const incoming: number[][] = nodes.map(() => []);
    outgoing.forEach((outs, i) => outs.forEach((t) => { inCount[t]++; incoming[t].push(i); }));

    const stage = new Array(n).fill(-1);
    const done = new Array(n).fill(false);
    // roots = tanpa incoming
    for (let i = 0; i < n; i++) if (inCount[i] === 0) { stage[i] = 0; done[i] = true; }
    let guard = 0;
    let progress = true;
    while (done.some((d) => !d) && progress && guard < n + 5) {
      progress = false;
      guard++;
      for (let i = 0; i < n; i++) {
        if (done[i]) continue;
        // tahap = 1 + max stage target; semua target harus selesai dulu
        const outs = outgoing[i];
        if (outs.length === 0) { stage[i] = 0; done[i] = true; progress = true; continue; }
        if (outs.every((t) => done[t])) {
          stage[i] = 1 + Math.max(...outs.map((t) => stage[t]));
          done[i] = true; progress = true;
        }
      }
      // siklus / sisa yang tak maju: tempel di tahap 0 (terhubung mundur tetap aman visual)
      if (!progress) for (let i = 0; i < n; i++) if (!done[i]) { stage[i] = 0; done[i] = true; }
    }

    // kelompokkan per kolom sesuai urutan items (stabil)
    const colOf = new Map<string, number>();
    const columns: number[][] = [];
    nodes.forEach((k, i) => {
      const col = stage[i] ?? 0;
      colOf.set(k.id, col);
      if (!columns[col]) columns[col] = [];
      columns[col].push(i);
    });

    // posisi piksel
    const pos = new Map<string, { x: number; y: number; col: number; row: number }>();
    let maxWidth = 0;
    columns.forEach((rowsArr, col) => {
      rowsArr.forEach((idx, row) => {
        pos.set(nodes[idx].id, { x: colX(col), y: rowY(row), col, row });
      });
      maxWidth = Math.max(maxWidth, colX(col) + W + PAD_X);
    });
    const maxRows = columns.reduce((m, c) => Math.max(m, c.length), 0);

    // edge untuk digambar (hanya bila kedua ujung terlihat — sajian graf)
    const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
    nodes.forEach((k) => {
      const a = pos.get(k.id);
      if (!a) return;
      k.outIds.forEach((t) => {
        const b = pos.get(t);
        if (!b) return;
        if (visibleIds && (!visibleIds.has(k.id) || !visibleIds.has(t))) return;
        edges.push({ x1: a.x + W, y1: a.y + H / 2, x2: b.x, y2: b.y + H / 2 });
      });
    });

    return { pos, columns, edges, width: maxWidth, height: PAD_Y * 2 + maxRows * H + Math.max(0, maxRows - 1) * RG };
  }, [nodes, visibleIds]);

  const shownCount = visibleIds ? visibleIds.size : nodes.length;
  const linkedCount = nodes.filter((k) => k.outIds.length > 0).length;
  const totalEdges = nodes.reduce((s, k) => s + k.outIds.length, 0);

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
          Total: <b className="text-emerald-600">{shownCount} Node</b>
          <span className="mx-1.5 text-gray-300">&bull;</span>
          Punya cabang: <b className="text-emerald-600">{linkedCount}</b>
          <span className="mx-1.5 text-gray-300">&bull;</span>
          Panah: <b className="text-emerald-600">{totalEdges}</b>
        </div>
      </div>

      {/* kanvas diagram */}
      {loading && items.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-8 text-center text-gray-400 text-sm">Memuat diagram...</div>
      )}
      {!loading && shownCount === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-10 text-center text-gray-400 text-sm">
          <Network className="w-6 h-6 mx-auto mb-2 text-gray-300" />
          {items.length === 0
            ? 'Belum ada artikel. Tambahkan konten dulu di sub-tab Artikel.'
            : 'Tidak ada artikel yang cocok dengan pencarian.'}
        </div>
      )}

      {shownCount > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto bg-[#f6f7f9] px-3 py-4">
            <div className="relative" style={{ width: Math.max(layers.width, 640), height: Math.max(layers.height, 180) }}>
              {/* ===== panah (SVG overlay, digambar dulu di bawah kotak) ===== */}
              <svg className="absolute inset-0 pointer-events-none" width={layers.width} height={layers.height} aria-hidden>
                <defs>
                  <marker id="rah-viso" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                    <path d="M0,0 L10,5 L0,10 z" fill="#5b6068" />
                  </marker>
                </defs>
                {layers.edges.map((e, i) => {
                  const mx = (e.x1 + e.x2) / 2;
                  return (
                    <path
                      key={i}
                      d={`M ${e.x1} ${e.y1} C ${mx} ${e.y1}, ${mx} ${e.y2}, ${e.x2 - 4} ${e.y2}`}
                      fill="none"
                      stroke="#5b6068"
                      strokeWidth={1.4}
                      markerEnd="url(#rah-viso)"
                    />
                  );
                })}
              </svg>

              {/* ===== kotak-kotak node ===== */}
              {nodes.map((k) => {
                const p = layers.pos.get(k.id);
                if (!p) return null;
                if (visibleIds && !visibleIds.has(k.id)) return null;
                const fill = ROLE_FILL[k.role] ?? FALLBACK_FILL;
                return (
                  <div
                    key={k.id}
                    title={k.kw}
                    className={cn(
                      'absolute rounded-xl px-3 flex items-center text-[12px] font-medium text-center justify-center leading-tight shadow-sm hover:brightness-105 transition',
                      fill
                    )}
                    style={{ left: p.x, top: p.y, width: W, height: H }}
                  >
                    <span className="line-clamp-2 break-words">{k.kw}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* legenda warna role + arah aliran */}
      <p className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5"><span className="w-7 h-4 rounded-md bg-[#5b8def]" /> inspire</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-7 h-4 rounded-md bg-[#69bfae]" /> educate</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-7 h-4 rounded-md bg-[#f2994a]" /> convert</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-7 h-4 rounded-md bg-[#9aa3af]" /> tanpa role</span>
        <span className="text-gray-300 hidden md:inline">|</span>
        <span>aliran panah kiri → kanan mengikuti Internal Link; kolom kiri = tidak dituju siapa pun, makin kanan = makin tujuan</span>
      </p>
    </motion.div>
  );
}