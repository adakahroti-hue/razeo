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
const TARGET_FILL = 'bg-white border-2 border-dashed border-indigo-300 text-indigo-700'; // tujuan non-produk (lintas kategori)
const PRODUK_FILL = 'bg-[#f2994a] text-white'; // kolom PRODUK: bulat penuh oranye

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
// warna kotak: PRODUK penuh oranye dulu, member & isi lain pre-quad role
const fillOf = (k: GNode) =>
  colOfNode(k) === PRODUK_COL ? PRODUK_FILL : k.member ? (ROLE_FILL[k.role] ?? FALLBACK_FILL) : TARGET_FILL;

// ===== geometri kanvas mini (px) =====
const W = 214;
const H = 46;
const RG = 22;
const GX = 104;      // lorong lebih lega — kelonggaran rute panah
const PAD_X = 22;
const PAD_TOP = 66;  // band atas utk LABEL kolom + lane balik, jauh dari baris kotak
const PAD_BOT = 20;
const LANE_MIN = 30;  // lane atas mulai (d bawah label ~25, d atas baris gtk 66)
const SUB_MAX = 5;    // maks baris per DERET — lebih dari ini kolom dipecah jadi sub-deret samping
const SUB_GAP = 44;   // jarak antar sub-deret (lega utk jalur vertikal 90deg)
const LANE_STEP = 10;  // step sinkronin 4 slot utk hindari menumpuk

const colX = (c: number) => PAD_X + c * (W + GX);
const rowY = (r: number) => PAD_TOP + r * (H + RG);
const midY = (r: number) => rowY(r) + H / 2;

type GNode = { id: string; kw: string; role: string; member: boolean; outIds: string[]; colOverride?: number };
type Box = { x: number; y: number };
type Graph = { pos: Map<string, Box>; edges: { d: string }[]; width: number; height: number; colHeaders: { x: number; w: number; label: string; cls: string }[] };

// ===== layout dgn layering incoming (kiri -> kanan) + rute panah lorong/lane =====
function runLayout(nodes: GNode[]): Graph {
  const n = nodes.length;
  if (n === 0) return { pos: new Map(), edges: [], width: PAD_X * 2, height: 60, colHeaders: [] };
  const idx = new Map(nodes.map((k, i) => [k.id, i]));
  const outgoing = nodes.map((k) => k.outIds.filter((t) => idx.has(t)).map((t) => idx.get(t)!));

  // ===== SLOT: tiap kolom role dipecah sub-deret maks SUB_MAX baris (rapi & lebih pendek) =====
  const roleCol = nodes.map((k) => colOfNode(k));
  const slotsByRole = new Map<number, number[]>(); // roleCol -> [idx]
  nodes.forEach((_, i) => {
    const c = roleCol[i];
    if (!slotsByRole.has(c)) slotsByRole.set(c, []);
    slotsByRole.get(c)!.push(i);
  });

  // sub-deret UNTUK tiap role: pivot = maks SUB_MAX
  const subStart = new Map<number, number[]>(); // (key rolecol) -> [start-slot], el of slotsByRole dipotong
  const slotSubOf = new Map<number, number>();  // node idx -> sub-deret dlm role col
  const slotRowOf = new Map<number, number>();
  const colHeaders: Graph['colHeaders'] = [];
  let maxW = 0, maxRows = 0;

  const sortedRoleCols = [...slotsByRole.keys()].sort((x, y) => x - y);
  // pre-kalkulasi subCount per role -> lebar blok role (mencegah sub-deret role A menabrak role B)
  const subCountOf = new Map<number, number>();
  for (const rc of sortedRoleCols) subCountOf.set(rc, Math.max(1, Math.ceil(slotsByRole.get(rc)!.length / SUB_MAX)));
  // mulai x per role: desak ke kanan lebar total sub sebelumnya + lorong konstan
  const colStart = new Map<number, number>();
  let curX = PAD_X;
  for (const rc of sortedRoleCols) {
    const sc = subCountOf.get(rc)!;
    const totalW = sc * W + (sc - 1) * SUB_GAP;
    colStart.set(rc, curX);
    curX += totalW + GX;
  }

  for (const rc of sortedRoleCols) {
    const arr = slotsByRole.get(rc)!;
    // barycenter utk urut baris dlm role (jaga korelas anak-induk berdekatan)
    const inc = nodes.map((_, j) => nodes.map((k, si) => k.outIds.includes(nodes[j]?.id) ? si : -1).filter((v) => v >= 0));
    const incomingOrder = arr.map((i) => inc[i].map((u) => arr.indexOf(u)).filter((p) => p >= 0));
    const pairs = arr.map((i, p) => {
      const pr = incomingOrder[p];
      return { i, s: pr.length ? pr.reduce((x, y) => x + y, 0) / pr.length : p };
    });
    pairs.sort((x, y) => x.s - y.s || x.i - y.i);
    const ordered = pairs.map((p) => p.i);

    const subCount = Math.max(1, Math.ceil(ordered.length / SUB_MAX));
    for (let b = 0; b < subCount; b++) {
      const slice = ordered.slice(b * SUB_MAX, (b + 1) * SUB_MAX);
      const x0 = colStart.get(rc)! + b * (W + SUB_GAP);
      // header utk sub-deret pertama saja (sub samping tdk perlu label)
      colHeaders.push({
        x: x0, w: W,
        label: b === 0 ? (COL_LABEL[rc]?.label ?? '') : '',
        cls: COL_LABEL[rc]?.cls ?? 'text-gray-400',
      });
      slice.forEach((ni, r) => {
        slotSubOf.set(ni, b);
        slotRowOf.set(ni, r);
        maxW = Math.max(maxW, x0 + W + PAD_X);
        maxRows = Math.max(maxRows, r + 1);
      });
      if (b === 0) maxW = Math.max(maxW, x0 + W + PAD_X);
    }
  }

  // posisi piksel per node
  const pos = new Map<string, Box>();
  for (let i = 0; i < n; i++) {
    const rc = roleCol[i];
    const b = slotSubOf.get(i) ?? 0;
    const r = slotRowOf.get(i) ?? 0;
    pos.set(nodes[i].id, { x: (colStart.get(rc) ?? colX(rc)) + b * (W + SUB_GAP), y: rowY(r) });
  }

  const width = Math.max(maxW, curX - GX + PAD_X - PAD_X); // curX sudah termasuk lorong akhir
  const height = rowY(Math.max(1, maxRows) - 1) + H + PAD_BOT;
  if (sortedRoleCols.length) maxRows = maxRows; // no-op keep var used

  // ===== RUTE PANAH — SEMUA bezier murni (tanpa siku, tanpa L) =====
  // maju : satu kurva halus kanan-sumber -> kiri-target (margin 6/9 — tak menempel).
  // setara/mundur : keluar kanan -> naik landai lane per-edge -> horizontal -> turun landai masuk kiri.
  // ===== KONEKTOR ORTHOGONAL (Siku 90°) — lewat ruang kosong antar blok =====
  // FWD  (b > a): keluar tepi kanan sumber -> horizontal ke GAP tengah -> vertikal ke y target -> masuk kiri target
  // BACK/SAME: keluar tepi kanan sumber -> naik pendek ke LANE TOP -> horizontal (di ruang atas) -> turun di GAP -> masuk kiri
  // Semua segmen lurus + sudut r-8 (elbow diraba rapi), tanpa melintasi kotak.
  const edges: { d: string }[] = [];
  const gapEnd = new Map<number, number>();   // blok role -> tepi kanan blok
  for (const rc of sortedRoleCols) {
    const sc = subCountOf.get(rc)!;
    gapEnd.set(rc, colStart.get(rc)! + sc * W + (sc - 1) * SUB_GAP);
  }
  const gEnd = (rc: number) => gapEnd.get(rc) ?? colX(rc) + W;
  let eN = 0;
  const O = 6, E = 6, R = 8;
  const EL = (x: number, y: number) => `${x} ${y}`; // titik elbow
  for (let a = 0; a < n; a++) {
    for (const b of outgoing[a]) {
      const pa = pos.get(nodes[a].id), pb = pos.get(nodes[b].id);
      if (!pa || !pb) continue;
      const ra = slotRowOf.get(a) ?? -1;
      const rb = slotRowOf.get(b) ?? -1;
      if (ra < 0 || rb < 0) continue;
      const x0 = pa.x + W + O, y0 = rowY(ra) + H / 2;
      const x1 = pb.x - E,     y1 = rowY(rb) + H / 2;
      const ca = roleCol[a], cb = roleCol[b];
      const li = eN++;
      let d: string;

      if (cb > ca || (ca === cb && pa.x < pb.x)) {
        // maju: horizontal -> sudut 90 -> vertikal -> sudut 90 -> horizontal (direction-aware utk y naik/turun)
        const dir = y1 >= y0 ? 1 : -1;
        let at: number;
        if (ca === cb) {
          // sub-deret dlm role sama: kolom vertikal di TENGAH gap antar sub (SUB_GAP lega utk jalur)
          at = Math.max(x0 + 8, (x0 + x1) / 2 + 6);
        } else {
          // antar blok role: lane vertikal di gap lebar antar blok role
          const gA = gEnd(ca), gB = colStart.get(cb)!;
          at = Math.min(gA + 14 + (li % 5) * 14, Math.max(gA + 34, (gA + gB) / 2));
        }
        const x0p = Math.min(x0, at - R - 1);
        d =
          `M ${x0} ${y0} ` +
          `H ${x0p} Q ${at - R} ${y0}, ${at} ${y0 + dir * R} ` +
          `V ${y1 - dir * R} Q ${at} ${y1}, ${at + R} ${y1} ` +
          `H ${x1}`;
      } else {
        // backward / same: keluar kanan -> naik ke lane atas (ruang kosong antara label & baris pertama) -> turun di gap kiri target -> masuk kiri
        const lane = LANE_MIN + (li % 4) * LANE_STEP;
        const gQ = Math.max(colStart.get(cb)! - 16, colX(cb) - 16); // gap sblm blok target
        const xup = x0 + 14;
        d =
          `M ${x0} ${y0} ` +
          `H ${xup - R} Q ${xup} ${y0}, ${xup} ${y0 - R} ` +
          `V ${lane + R} Q ${xup} ${lane}, ${xup + R} ${lane} ` +
          `H ${gQ - R} Q ${gQ} ${lane}, ${gQ} ${lane + R} ` +
          `V ${y1 - R} Q ${gQ} ${y1}, ${gQ + R} ${y1} ` +
          `H ${x1}`;
      }
      edges.push({ d });
    }
  }

  return { pos, edges, width, height, colHeaders };
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
            // tujuan artikel kategori lain — ghost dgn role/col SAMA dgn artikel aslinya
            const gp: GNode = { id: tid, kw: real.kw, role: real.role, member: false, outIds: [], colOverride: real.colOverride };
            add.push(gp); addSet.add(tid);
          } else {
            const ph = probePhantom.get(tid)!;
            const gp: GNode = { id: ph.id, kw: ph.kw, role: ph.role, member: false, outIds: [], colOverride: ph.colOverride };
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
                    <svg className="absolute inset-0 pointer-events-none overflow-visible" width={Math.max(lay!.width, 520)} height={Math.max(lay!.height, 140)} aria-hidden>
                      <defs>
                        <marker id={`rah-${g.name.replace(/\W/g, '')}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                          <path d="M0,0 L10,5 L0,10 z" fill="#6366f1" />
                        </marker>
                      </defs>
                      {lay!.edges.map((e, i) => (
                        <path key={i} d={e.d} fill="none" stroke="#6366f1" strokeWidth={1.1} strokeLinecap="round" markerEnd={`url(#rah-${g.name.replace(/\W/g, '')})`} />
                      ))}
                    </svg>
                    {/* label kolom funnel — satu per role (sub-deret samping dkk label kosong) */}
                    {lay!.colHeaders.map((h, i) =>
                      h.label ? (
                        <span
                          key={i}
                          className={cn('absolute text-[10px] font-black tracking-wider text-center leading-none', h.cls)}
                          style={{ left: h.x, width: h.w, top: 12 }}
                        >
                          {h.label}
                        </span>
                      ) : null
                    )}
                    {g.all.map((k) => {
                      const p = lay!.pos.get(k.id);
                      if (!p) return null;
                      const cls = fillOf(k);
                      return (
                        <div
                          key={k.id}
                          title={k.member ? k.kw : `BAHAN dari kolom Internal Link: ${k.kw}`}
                          className={cn(
                            'absolute rounded-[10px] px-2.5 flex items-center text-[12px] font-semibold text-center justify-center leading-tight shadow-[0_1px_3px_rgba(15,23,42,0.10)] hover:shadow-[0_2px_6px_rgba(15,23,42,0.16)] transition',
                            cls
                          )}
                          style={{ left: p.x, top: p.y, width: W, height: H }}
                        >
                          <span className="line-clamp-2 break-words text-center">{k.kw}</span>
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
