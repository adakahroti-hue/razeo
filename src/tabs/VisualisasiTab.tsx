import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Network, Folder, ChevronDown, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ContentItem } from './KontenTab';
import { keywordMap, urlToKeyword } from '../lib/resolveKeyword';

type Props = {
  loading: boolean;
  items: ContentItem[];
};

const splitLinks = (v: string | null): string[] =>
  (v || '').split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);

const ROLE_FILL: Record<string, string> = {
  inspire: 'bg-[#5b8def] text-white',
  educate: 'bg-[#69bfae] text-white',
  convert: 'bg-[#f2994a] text-white',
};
const FALLBACK_FILL = 'bg-[#9aa3af] text-white';

// ===== geometri kanvas mini (px) =====
const W = 214;
const H = 46;
const RG = 22;
const GX = 94;      // ruang lorong antar kolom
const PAD_X = 22;
const PAD_TOP = 46; // ruang lane atas utk panah mundur
const PAD_BOT = 16;
const LANE_A = 16;
const LANE_B = 30;

const colX = (c: number) => PAD_X + c * (W + GX);
const rowY = (r: number) => PAD_TOP + r * (H + RG);
const midY = (r: number) => rowY(r) + H / 2;

type GNode = { id: string; kw: string; role: string; extra: string[]; outIds: string[] };
type Box = { x: number; y: number };

// ===== layout utk SEBUAH subgraph =====
function runLayout(nodes: GNode[]): { pos: Map<string, Box>; edges: { d: string }[]; width: number; height: number; cols: number } {
  const n = nodes.length;
  if (n === 0) return { pos: new Map(), edges: [], width: PAD_X * 2, height: 60, cols: 0 };
  const idx = new Map(nodes.map((k, i) => [k.id, i]));
  const outgoing = nodes.map((k) => k.outIds.filter((t) => idx.has(t)).map((t) => idx.get(t)!) );
  const incoming = nodes.map(() => [] as number[]);
  outgoing.forEach((o, s) => o.forEach((t) => incoming[t].push(s)));
  const indeg = incoming.map((x) => x.length);

  // LAYERING (lurus kiri -> kanan): col(v) = 0 jika tanpa penghubung masuk,
  // selain itu 1 + max(col u) utk tiap u -> v. TUNGGU semua incoming dulu.
  const stage = new Array<number>(n).fill(-1);
  const done = new Array<boolean>(n).fill(false);
  for (let i = 0; i < n; i++) if (indeg[i] === 0) { stage[i] = 0; done[i] = true; }
  let guard = 0, progress = true;
  while (done.some((d) => !d) && progress && guard < n + 5) {
    progress = false; guard++;
    for (let i = 0; i < n; i++) {
      if (done[i]) continue;
      const parents = incoming[i]; // u -> i
      if (parents.length === 0) { stage[i] = 0; done[i] = true; progress = true; continue; }
      if (parents.every((u) => done[u])) { stage[i] = 1 + Math.max(...parents.map((u) => stage[u])); done[i] = true; progress = true; }
    }
    // sisa (siklus / jaringan tak berujung): paksa col 0 — arah panahnya nanti diatur routing lane
    if (!progress) for (let i = 0; i < n; i++) if (!done[i]) { stage[i] = 0; done[i] = true; }
  }

  const maxStage = Math.max(0, ...stage);
  let columns: number[][] = Array.from({ length: maxStage + 1 }, () => [] as number[]);
  nodes.forEach((_, i) => columns[stage[i]].push(i));

  // barycenter sweep — rapatkan anak dekat induk, minimkan silang
  const posIn = (c: number, i: number) => columns[c].indexOf(i);
  const bary = (i: number, peers: number[]) => {
    const ps = peers.filter((p) => p >= 0);
    if (!ps.length) return posIn(stage[i], i);
    return ps.reduce((a, b) => a + b, 0) / ps.length;
  };
  for (let pass = 0; pass < 4; pass++) {
    const fwd = pass % 2 === 0;
    const order = fwd ? columns.map((_, c) => c) : columns.map((_, c) => c).reverse();
    for (const col of order) {
      const scored = columns[col].map((i) => {
        const peers = fwd
          ? outgoing[i].filter((t) => stage[t] === col + 1).map((t) => posIn(col + 1, t))
          : incoming[i].filter((s) => stage[s] === col - 1).map((s) => posIn(col - 1, s));
        return { i, s: bary(i, peers) };
      });
      scored.sort((a, b) => a.s - b.s || a.i - b.i);
      columns[col] = scored.map((x) => x.i);
    }
  }

  // posisi + ukuran
  const pos = new Map<string, Box>();
  columns.forEach((rows, col) => rows.forEach((i, r) => pos.set(nodes[i].id, { x: colX(col), y: rowY(r) })));
  const maxRows = columns.reduce((m, c) => Math.max(m, c.length), 1);
  const cols = columns.length;
  const width = colX(cols - 1) + W + PAD_X;
  const height = rowY(maxRows - 1) + H + PAD_BOT;

  // ===== edge routing =====
  const gutter = (col: number) => colX(col) - GX / 2 + 8;
  const edges: { d: string }[] = [];
  for (let a = 0; a < n; a++) {
    for (const b of outgoing[a]) {
      const pa = pos.get(nodes[a].id), pb = pos.get(nodes[b].id);
      if (!pa || !pb) continue;
      const ax = pa.x + W, ay = midY(stageRows(columns, nodes[a].id, stage)),
            bx = pb.x,     by = midY(stageRows(columns, nodes[b].id, stage));
      let d: string;
      const ca = stage[a], cb = stage[b];
      if (cb === ca + 1) {
        const gx = (ax + bx) / 2;
        d = `M ${ax} ${ay} C ${gx} ${ay}, ${gx} ${by}, ${bx - 7} ${by}`;
      } else {
        // jauh / mundur: jalur lokal lewat sisi kanan kolom sumber + lane atas + turun di lorong target
        const lane = LANE_A + ((a + b) % 2) * (LANE_B - LANE_A);
        const gOut = gutter(ca + 1 < cols ? ca + 1 : ca);
        const gIn  = gutter(cb);
        d =
          `M ${ax} ${ay} ` +
          `C ${ax + 24} ${ay}, ${gOut + 20} ${ay}, ${gOut} ${lane} ` +
          `L ${gIn} ${lane} ` +
          `C ${gIn} ${lane + 26}, ${gIn} ${by}, ${gIn + 26} ${by} ` +
          `L ${bx - 7} ${by}`;
      }
      edges.push({ d });
    }
  }
  return { pos, edges, width, height, cols };

  function stageRows(colsArr: number[][], id: string, stages: number[]): number {
    const st = stages.find((_v, i) => nodes[i].id === id);
    if (st === undefined) return 0;
    const rows = colsArr[st] ?? [];
    const r = rows.findIndex((i) => nodes[i].id === id);
    return r < 0 ? 0 : r;
  }
}

type Group = { name: string; nodes: GNode[] };

export default function VisualisasiTab({ loading, items }: Props) {
  const [q, setQ] = useState('');
  const kwMap = useMemo(() => keywordMap(items), [items]);

  // ===== node global (edge tetap by keyword -> id) =====
  const nodesAll: GNode[] = useMemo(() => {
    const list = items.map((it) => ({
      id: it.id,
      kw: (it.target_keyword || it.judul || '(tanpa keyword)').trim(),
      role: (it.peran || '').toLowerCase(),
      extra: [],
      outIds: [] as string[],
    }));
    const lookup = new Map<string, string>();
    for (const it of items) {
      const kw = (it.target_keyword || it.judul || '').trim();
      if (kw && !lookup.has(kw.toLowerCase())) lookup.set(kw.toLowerCase(), it.id);
    }
    const byId = new Map(list.map((x) => [x.id, x]));
    for (const it of items) {
      const src = byId.get(it.id);
      if (!src) continue;
      for (const u of splitLinks(it.internal_link)) {
        const t = lookup.get(urlToKeyword(u, kwMap).trim().toLowerCase());
        if (t && t !== src.id && !src.outIds.includes(t)) src.outIds.push(t);
      }
    }
    return list;
  }, [items, kwMap]);

  // ===== kelompok per kategori dari data asli (urutan kategori inventaris) =====
  const groups: Group[] = useMemo(() => {
    const byId = new Map(nodesAll.map((x) => [x.id, x]));
    const out: Group[] = [];
    const gIdx = new Map<string, Group>();
    for (const it of items) {
      const nm = (it.kategori || '').trim() || 'Tanpa Kategori';
      let g = gIdx.get(nm);
      if (!g) { g = { name: nm, nodes: [] }; gIdx.set(nm, g); out.push(g); }
      const nd = byId.get(it.id);
      if (nd) g.nodes.push(nd);
    }
    // potong edge tak terpakai? tidak perlu — runLayout memfilter idx
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, [items, nodesAll]);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const shownGroups = groups.filter((g) => !q || q.length < 2 || g.name.toLowerCase().includes(q.toLowerCase()) || g.nodes.some((n) => n.kw.toLowerCase().includes(q.toLowerCase())));
  const allOpen = shownGroups.length > 0 && shownGroups.every((g) => openMap[g.name] !== false);
  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    shownGroups.forEach((g) => { next[g.name] = !allOpen; });
    setOpenMap({ ...openMap, ...next });
  };

  // ===== layout per grup — dihitung per grup tampil, tanpa state (pure) =====
  const layoutCache = useMemo(() => {
    const m: Record<string, ReturnType<typeof runLayout>> = {};
    for (const g of shownGroups) m[g.name] = runLayout(g.nodes);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shownGroups, q]);

  const totalNode = shownGroups.reduce((s, g) => s + g.nodes.length, 0);
  const linked = nodesAll.filter((n) => n.outIds.length > 0).length;
  const totalEdge = nodesAll.reduce((s, n) => s + n.outIds.length, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari kategori atau target keyword..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-500 whitespace-nowrap">
          Total: <b className="text-emerald-600">{totalNode} Node</b>
          <span className="mx-1.5 text-gray-300">&bull;</span>
          Punya cabang: <b className="text-emerald-600">{linked}</b>
          <span className="mx-1.5 text-gray-300">&bull;</span>
          Panah: <b className="text-emerald-600">{totalEdge}</b>
        </div>
        <button
          onClick={toggleAll}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:border-emerald-300"
          title={allOpen ? 'Tutup semua grup' : 'Buka semua grup'}
        >
          {allOpen ? <ChevronsDownUp className="w-4 h-4 text-gray-400" /> : <ChevronsUpDown className="w-4 h-4 text-gray-400" />}
          {allOpen ? 'Collapse Semua' : 'Buka Semua'}
        </button>
      </div>

      {/* status kosong */}
      {loading && items.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-8 text-center text-gray-400 text-sm">Memuat diagram...</div>
      )}
      {!loading && shownGroups.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-10 text-center text-gray-400 text-sm">
          <Network className="w-6 h-6 mx-auto mb-2 text-gray-300" />
          {items.length === 0
            ? 'Belum ada artikel. Tambahkan konten dulu di sub-tab Artikel.'
            : 'Tidak ada kategori / artikel yang cocok dengan pencarian.'}
        </div>
      )}

      {/* ===== kartu per kategori, diagram mini kanvasnya ===== */}
      <div className="space-y-3">
        {shownGroups.map((g) => {
          const open = openMap[g.name] !== false;
          const lay = open ? layoutCache[g.name] : null;
          const withEdge = g.nodes.filter((n) => n.outIds.length > 0).length;
          return (
            <div key={g.name} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setOpenMap({ ...openMap, [g.name]: !open })}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/60 transition-colors"
                aria-expanded={open}
              >
                <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <Folder className="w-4 h-4 text-emerald-600" />
                </span>
                <span className="font-bold text-sm text-gray-900 truncate">{g.name}</span>
                <span className="shrink-0 inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold">
                  {g.nodes.length} Node
                </span>
                <span className="shrink-0 text-[11px] text-gray-400 whitespace-nowrap">
                  {withEdge} berhubungan
                </span>
                <span className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400 whitespace-nowrap">
                  Klik untuk tutup/buka
                  <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform', open ? '' : '-rotate-90')} />
                </span>
              </button>

              {open && (
                <div className="border-t border-gray-100 bg-[#f6f7f9] overflow-x-auto px-3 py-3">
                  <div className="relative" style={{ width: Math.max(lay!.width, 520), height: Math.max(lay!.height, 140) }}>
                    {/* panah */}
                    <svg className="absolute inset-0 pointer-events-none" width={Math.max(lay!.width, 520)} height={Math.max(lay!.height, 140)} aria-hidden>
                      <defs>
                        <marker id={`rah-${g.name.replace(/\W/g, '')}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M0,0 L10,5 L0,10 z" fill="#5b6068" />
                        </marker>
                      </defs>
                      {lay!.edges.map((e, i) => (
                        <path key={i} d={e.d} fill="none" stroke="#5b6068" strokeWidth={1.3} strokeLinecap="round" markerEnd={`url(#rah-${g.name.replace(/\W/g, '')})`} />
                      ))}
                    </svg>
                    {/* kotak */}
                    {g.nodes.map((k) => {
                      const p = lay!.pos.get(k.id);
                      if (!p) return null;
                      const fill = ROLE_FILL[k.role] ?? FALLBACK_FILL;
                      return (
                        <div
                          key={k.id}
                          title={k.kw}
                          className={cn('absolute rounded-xl px-2.5 flex items-center text-[12px] font-medium text-center justify-center leading-tight shadow-sm hover:shadow-md hover:brightness-[1.05] transition', fill)}
                          style={{ left: p.x, top: p.y, width: W, height: H }}
                        >
                          <span className="line-clamp-2 break-words">{k.kw}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* legenda */}
      <p className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5"><span className="w-7 h-4 rounded-md bg-[#5b8def]" /> inspire</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-7 h-4 rounded-md bg-[#69bfae]" /> educate</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-7 h-4 rounded-md bg-[#f2994a]" /> convert</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-7 h-4 rounded-md bg-[#9aa3af]" /> tanpa role</span>
        <span className="text-gray-300 hidden md:inline">|</span>
        <span>diagram per kategori: kotak kiri = sumber, panah = alur Internal Link antar kolom (depth)</span>
      </p>
    </motion.div>
  );
}