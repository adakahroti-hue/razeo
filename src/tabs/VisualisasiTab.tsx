import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Network, Folder, ChevronDown, ChevronsDownUp, ChevronsUpDown, Link2 } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ContentItem } from './KontenTab';
import { keywordMap, urlToKeyword } from '../lib/resolveKeyword';

type Props = {
  loading: boolean;
  items: ContentItem[];
};

// urut + tata persis seperti tab Konten: role inspire>educate>convert, pemecah tanggal terbaru
const ROLE_RANK: Record<string, number> = { inspire: 0, educate: 1, convert: 2 };
const rank = (p?: string | null) => (p && p.toLowerCase() in ROLE_RANK ? ROLE_RANK[p.toLowerCase()] : 3);
const dateKey = (it: { tanggal_publikasi?: string | null; created_at?: string }) => it.tanggal_publikasi || it.created_at || '';

const splitLinks = (v: string | null): string[] =>
  (v || '').split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);

// warna kotak node sumber per role (mirip referensi diagram)
const ROLE_FILL: Record<string, string> = {
  inspire: 'bg-[#5b8def] text-white',
  educate: 'bg-[#69bfae] text-white',
  convert: 'bg-[#f2994a] text-white',
};
const FALLBACK_FILL = 'bg-[#9aa3af] text-white';
// gaya kotak TUJUAN (daftar internal link) — indigo, selebihnya; sama pesan warna dg chip Internal Link tab Konten
const TARGET_FILL = 'bg-white border-2 border-dashed border-indigo-300 text-indigo-700';

// ===== aturan kolom = urutan ROLE FUNNEL (bukan depthing graph):
//      paling kiri inspire (biru) -> tengah educate (hijau) -> kanan produk/convert (oranye) -> paling ujung tanpa role
//      (ROLE_RANK sudah terdefinisi dgn urutan sama persis di atas — dipakai utk peringkat + index kolom)
const NROLE_COL = 3; // indx awal utk tanpa role
const PRODUK_COL = 2; // kolom kanan: produk/URL luar daftar (dan role convert bila nanti ada)
const COL_LABEL: { label: string; cls: string }[] = [
  { label: 'INSPIRE', cls: 'text-[#5b8def]' },
  { label: 'EDUCATE', cls: 'text-[#69bfae]' },
  { label: 'PRODUK', cls: 'text-[#f2994a]' },
  { label: 'LAINNYA', cls: 'text-gray-400' },
];
const colOf = (role: string) => (role in ROLE_RANK ? ROLE_RANK[role] : NROLE_COL);
const colOfNode = (k: GNode) => (k.colOverride !== undefined ? k.colOverride : colOf(k.role));

// ===== geometri kanvas mini (px) =====
const W = 214;
const H = 46;
const RG = 22;
const GX = 94;
const PAD_X = 22;
const PAD_TOP = 46;
const PAD_BOT = 16;
const LANE_A = 16;
const LANE_B = 30;

const colX = (c: number) => PAD_X + c * (W + GX);
const rowY = (r: number) => PAD_TOP + r * (H + RG);
const midY = (r: number) => rowY(r) + H / 2;

type GNode = { id: string; kw: string; role: string; member: boolean; outIds: string[]; colOverride?: number };
type Box = { x: number; y: number };
type Graph = { pos: Map<string, Box>; edges: { d: string }[]; width: number; height: number; colRows: number[] };

// ===== layout dgn layering incoming (kiri -> kanan) + rute panah lorong/lane =====
function runLayout(nodes: GNode[]): Graph {
  const n = nodes.length;
  if (n === 0) return { pos: new Map(), edges: [], width: PAD_X * 2, height: 60, colRows: [] };
  const idx = new Map(nodes.map((k, i) => [k.id, i]));
  const outgoing = nodes.map((k) => k.outIds.filter((t) => idx.has(t)).map((t) => idx.get(t)!));

  // ===== KOLOM = role funnel (bukan depthing graph) =====
  const stageUsingRole = nodes.map((k) => colOfNode(k));
  const stage = stageUsingRole; // alias — tetap dipakai utk routing & pengurutan baris
  const colsCount = NROLE_COL + 1;
  let columns: number[][] = Array.from({ length: colsCount }, () => [] as number[]);
  nodes.forEach((_, i) => columns[stage[i]].push(i));

  // sedikit rapihkan: barycenter dlm kolom — utamakan anak sebardn petunjuk langsung
  const posIn = (c: number, i: number) => columns[c].indexOf(i);
  const incomingRough = nodes.map(() => [] as number[]);
  nodes.forEach((k, i) => k.outIds.forEach((t) => {
    const j = nodes.findIndex((x) => x.id === t);
    if (j >= 0) incomingRough[j].push(i);
  }));
  const bary = (i: number, peers: number[]) => {
    const ps = peers.filter((p) => p >= 0);
    return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : posIn(stage[i], i);
  };
  for (let pass = 0; pass < 4; pass++) {
    const fwd = pass % 2 === 0;
    const order = fwd ? columns.map((_, c) => c) : columns.map((_, c) => c).reverse();
    for (const c of order) {
      const scored = columns[c].map((i) => {
        const idxT = (id: string) => nodes.findIndex((x) => x.id === id);
        const peers = fwd
          ? nodes[i].outIds.map((t) => (stage[idxT(t)] === c + 1 ? posIn(c + 1, idxT(t)) : -1))
          : incomingRough[i].map((u) => (stage[u] === c - 1 ? posIn(c - 1, u) : -1));
        return { i, s: bary(i, peers) };
      });
      scored.sort((a, b) => a.s - b.s || a.i - b.i);
      columns[c] = scored.map((x) => x.i);
    }
  }
  // buang kolom kosong di ujung kanan (bila tak ada convert / tanpa role)
  while (columns.length > 1 && columns[columns.length - 1].length === 0) columns.pop();

  const pos = new Map<string, Box>();
  columns.forEach((rows, col) => rows.forEach((i, r) => pos.set(nodes[i].id, { x: colX(col), y: rowY(r) })));
  const maxRows = columns.reduce((m, c) => Math.max(m, c.length), 1);
  const width = colX(Math.max(0, columns.length - 1)) + W + PAD_X;
  const height = rowY(maxRows - 1) + H + PAD_BOT;

  const gutter = (col: number) => colX(Math.min(col, Math.max(0, columns.length - 1))) - GX / 2 + 8;
  const edges: { d: string }[] = [];
  for (let a = 0; a < n; a++) {
    for (const b of outgoing[a]) {
      const pa = pos.get(nodes[a].id), pb = pos.get(nodes[b].id);
      if (!pa || !pb) continue;
      const ra = rowOf(stage, columns, nodes[a].id);
      const rb = rowOf(stage, columns, nodes[b].id);
      if (ra < 0 || rb < 0) continue;
      const ax = pa.x + W, ay = midY(ra), bx = pb.x, by = midY(rb);
      let d: string;
      if (stage[b] > stage[a]) {
        // maju ke kanan (funnel normal): curve di lorong
        const gx = (ax + bx) / 2;
        d = `M ${ax} ${ay} C ${gx} ${ay}, ${gx} ${by}, ${bx - 7} ${by}`;
      } else {
        // setara/kiri (lintas role ke arah berlawanan / sesama kolom): naik lane atas -> masuk kiri
        const lane = LANE_A + ((a + b) % 2) * (LANE_B - LANE_A);
        const gOut = gutter(Math.max(0, stage[a] + (stage[a] < columns.length - 1 ? 1 : 0)));
        const gIn = gutter(stage[b]);
        d =
          `M ${ax} ${ay} ` +
          `C ${ax + 24} ${ay}, ${gOut + 18} ${ay}, ${gOut} ${lane} ` +
          `L ${gIn} ${lane} ` +
          `C ${gIn} ${lane + 26}, ${gIn} ${by}, ${gIn + 24} ${by} ` +
          `L ${bx - 7} ${by}`;
      }
      edges.push({ d });
    }
  }
  return { pos, edges, width, height, colRows: columns.map((c) => c.length) };

  function rowOf(stg: number[], cols: number[][], id: string): number {
    const i = nodes.findIndex((x) => x.id === id);
    if (i < 0) return -1;
    const r = (cols[stg[i]] ?? []).findIndex((x) => nodes[x]?.id === id);
    return r;
  }
}

type Group = { name: string; all: GNode[] };

// READ-ONLY: tab ini HANYA menampilkan ringkasan visual dari tab Konten.
// Kontrak: jangan menambahkan tombol tambah/ubah/hapus, form, atau callback tulis (onAdd/onUpdate/onDelete).
// Sumber data = contentItems tab Konten (di App), disaring tampilan oleh state lokal (cari/buka-tutup) saja.
export default function VisualisasiTab({ loading, items }: Props) {
  const [q, setQ] = useState('');
  const kwMap = useMemo(() => keywordMap(items), [items]);

  // ===== data & urutan SAMA dgn tab Konten: role -> tanggal, kelompok kategori =====
  const groups: Group[] = useMemo(() => {
    if (!items.length) return [];
    // urut global persis pola artVis tab Konten
    const sorted = [...items].sort((a, b) => {
      const ra = rank(a.peran), rb = rank(b.peran);
      if (ra !== rb) return ra - rb;
      const ka = dateKey(a), kb = dateKey(b);
      return kb.localeCompare(ka); // terbaru dulu
    });
    const lowerToId = new Map<string, string>();
    for (const it of sorted) {
      const kw = (it.target_keyword || it.judul || '').trim().toLowerCase();
      if (kw && !lowerToId.has(kw)) lowerToId.set(kw, it.id);
    }

    // node sumber + edge dg seluruh isi kolom Internal Link (resolve URL -> kata kunci, sama dgn tab Konten)
    const nodeById = new Map<string, GNode>();
    for (const it of sorted) {
      nodeById.set(it.id, {
        id: it.id,
        kw: (it.target_keyword || it.judul || '(tanpa keyword)').trim(),
        role: (it.peran || '').toLowerCase(),
        member: true,
        outIds: [],
      });
    }
    const probePhantom = new Map<string, GNode>();
    const phantom = (lowerKw: string, kwText: string): GNode => {
      const pid = 'x:' + lowerKw;
      let p = probePhantom.get(pid);
      if (!p) {
        p = { id: pid, kw: kwText, role: '', member: false, outIds: [] };
        probePhantom.set(pid, p);
      }
      return p;
    };

    // per artikel: setiap baris internal_link -> kata kunci tujuan (urlToKeyword, fallback slug — persis tab Konten)
    for (const it of sorted) {
      const src = nodeById.get(it.id)!;
      const all = splitLinks(it.internal_link);
      for (const u of all) {
        const kwText = urlToKeyword(u, kwMap); // kwMap = URL link_artikel -> target_keyword (sumber sama dgn tab Konten)
        const lowered = kwText.toLowerCase();
        const targetId = lowerToId.get(lowered); // keyword resolusi -> id artikel (data sama dgn tab Konten)
        let tid: string;
        if (targetId && targetId !== src.id) {
          tid = targetId; // asli — ghost lokal dibuat saat penggabungan grup bila beda kategori
        } else {
          tid = phantom(lowered, kwText).id; // halaman produk / URL luar daftar -> kolom klik PRODUK (colOverride)
          const p = probePhantom.get('x:' + lowered);
          if (p) p.colOverride = PRODUK_COL;
        }
        if (!src.outIds.includes(tid)) src.outIds.push(tid);
      }
    }

    // kelompok per kategori (kunci dgn definisi SAMA dgn tab Konten)
    const order: Group[] = [];
    const gIdx = new Map<string, Group>();
    for (const it of sorted) {
      const nm = (it.kategori || '').trim() || 'Tanpa Kategori';
      let g = gIdx.get(nm);
      if (!g) { g = { name: nm, all: [] }; gIdx.set(nm, g); order.push(g); }
      g.all.push(nodeById.get(it.id)!);
    }

    // tujuan pd tiap grup: include node khusus ghost/luar-kategori sebagai daun dg ID sama (unique per grup)
    for (const g of order) {
      const inGroup = new Set(g.all.map((x) => x.id));
      const add: GNode[] = [];
      const addSet = new Set<string>();
      for (const src of g.all) {
        for (const tid of src.outIds) {
          if (inGroup.has(tid) || addSet.has(tid)) continue;
          const real = nodeById.get(tid);
          if (real) {
            // tujuan artikel kategori lain — ghost dgn role SAMA dgn artikel aslinya (utk tetap di kolom role-nya)
            const gp: GNode = { id: tid, kw: real.kw, role: real.role, member: false, outIds: [] };
            add.push(gp); addSet.add(tid);
          } else {
            const ph = probePhantom.get(tid)!;
            const gp: GNode = { id: ph.id, kw: ph.kw, role: '', member: false, outIds: [] };
            add.push(gp); addSet.add(tid);
          }
        }
      }
      g.all = [...g.all, ...add];
    }
    return order;
  }, [items, kwMap]);

  // ===== rangkuman (angka sinkron dgn tab Konten: total artikel & total chip internal link) =====
  const totalArticle = items.length;
  const totalChips = useMemo(() => items.reduce((s, it) => s + splitLinks(it.internal_link).length, 0), [items]);
  const withLink = useMemo(() => items.filter((it) => splitLinks(it.internal_link).length > 0).length, [items]);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const shown = useMemo(
    () =>
      groups.filter(
        (g) =>
          !q ||
          g.name.toLowerCase().includes(q.toLowerCase()) ||
          g.all.some((n) => n.kw.toLowerCase().includes(q.toLowerCase()))
      ),
    [groups, q]
  );
  const allOpen = shown.length > 0 && shown.every((g) => openMap[g.name] !== false);
  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    shown.forEach((g) => { next[g.name] = !allOpen; });
    setOpenMap({ ...openMap, ...next });
  };

  const layouts = useMemo(() => {
    const m: Record<string, Graph> = {};
    for (const g of shown) m[g.name] = runLayout(g.all);
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, openMap]);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      {/* toolbar — angka identik dgn basis tab Konten (artikel & chip internal link) */}
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
        <div className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-500 whitespace-nowrap" title="Angka mengikuti tab Konten (sub Artikel)">
          Total: <b className="text-emerald-600">{totalArticle} Artikel</b>
          <span className="mx-1.5 text-gray-300">&bull;</span>
          Punya internal link: <b className="text-emerald-600">{withLink}</b>
          <span className="mx-1.5 text-gray-300">&bull;</span>
          Tautan: <b className="text-emerald-600">{totalChips}</b>
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

      {loading && items.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-8 text-center text-gray-400 text-sm">Memuat diagram...</div>
      )}
      {!loading && shown.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl px-4 py-10 text-center text-gray-400 text-sm">
          <Network className="w-6 h-6 mx-auto mb-2 text-gray-300" />
          {items.length === 0
            ? 'Belum ada artikel. Tambahkan konten dulu di sub-tab Artikel.'
            : 'Tidak ada kategori / artikel yang cocok dengan pencarian.'}
        </div>
      )}

      {/* ===== kartu per kategori — urutan grup & node mengikuti tab Konten ===== */}
      <div className="space-y-3">
        {shown.map((g) => {
          const open = openMap[g.name] !== false;
          const lay = open ? layouts[g.name] : null;
          const members = g.all.filter((x) => x.member);
          const linkedCount = members.filter((m) => m.outIds.length > 0).length;
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
                  {members.length} Article
                </span>
                <span className="shrink-0 text-[11px] text-gray-400 whitespace-nowrap">{linkedCount} with link</span>
                <span className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400 whitespace-nowrap">
                  Klik untuk tutup/buka
                  <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform', open ? '' : '-rotate-90')} />
                </span>
              </button>

              {open && (
                <div className="border-t border-gray-100 bg-[#f6f7f9] overflow-x-auto px-3 py-3">
                  <div className="relative" style={{ width: Math.max(lay!.width, 520), height: Math.max(lay!.height, 140) }}>
                    <svg className="absolute inset-0 pointer-events-none" width={Math.max(lay!.width, 520)} height={Math.max(lay!.height, 140)} aria-hidden>
                      <defs>
                        <marker id={`rah-${g.name.replace(/\W/g, '')}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                          <path d="M0,0 L10,5 L0,10 z" fill="#6366f1" />
                        </marker>
                      </defs>
                      {lay!.edges.map((e, i) => (
                        <path key={i} d={e.d} fill="none" stroke="#6366f1" strokeWidth={1.3} strokeLinecap="round" markerEnd={`url(#rah-${g.name.replace(/\W/g, '')})`} />
                      ))}
                    </svg>
                    {/* label kolom funnel: INSPIRE(-> EDUKATE -> PRODUK) */}
                    {lay!.colRows.map((cnt, i) =>
                      cnt > 0 && COL_LABEL[i] ? (
                        <span
                          key={i}
                          className={cn('absolute text-[10px] font-black tracking-wider text-center leading-none', COL_LABEL[i].cls)}
                          style={{ left: colX(i), width: W, top: 14 }}
                        >
                          {COL_LABEL[i].label}
                        </span>
                      ) : null
                    )}
                    {g.all.map((k) => {
                      const p = lay!.pos.get(k.id);
                      if (!p) return null;
                      const cls = k.member ? (ROLE_FILL[k.role] ?? FALLBACK_FILL) : TARGET_FILL;
                      return (
                        <div
                          key={k.id}
                          title={k.member ? k.kw : `BAHAN dari kolom Internal Link: ${k.kw}`}
                          className={cn(
                            'absolute rounded-xl px-2.5 flex items-center text-[12px] font-medium text-center justify-center leading-tight shadow-sm hover:shadow-md transition',
                            cls
                          )}
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

      {/* legenda — tekankan kesamaan materi dgn kolom Internal Link tab Konten */}
      <p className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <span className="inline-flex items-center gap-1.5"><span className="w-7 h-4 rounded-md bg-[#5b8def]" /> inspire</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-7 h-4 rounded-md bg-[#69bfae]" /> educate</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-7 h-4 rounded-md bg-[#f2994a]" /> convert</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-7 h-4 rounded-md bg-[#9aa3af]" /> tanpa role</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-7 h-4 rounded-md border-2 border-dashed border-indigo-300 bg-white" /> tujuan internal link</span>
        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
          </svg>
          READ-ONLY
        </span>
        <span className="text-gray-300 hidden md:inline">|</span>
        <span><Link2 className="w-3 h-3 inline" /> semua data & tampilan mengikuti <b>tab Konten</b> — tak ada input di sini; ubah konten lewat tab Konten</span>
      </p>
    </motion.div>
  );
}
