import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Search, Network, Folder, ChevronDown, ChevronsDownUp, ChevronsUpDown, Link2, MousePointerClick, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '../lib/utils';
import type { ContentItem } from './KontenTab';
import { keywordMap, urlToKeyword, normUrl, normPath } from '../lib/resolveKeyword';

type Props = {
  loading: boolean;
  items: ContentItem[];
  /** daftar produk (tabel products via tab konten sub Produk) — utk bhkn kolom PRODUK */
  prodItems?: { nama_produk?: string | null; judul_produk?: string | null; link_shopee?: string | null; link_artikel?: string | null; kategori?: string | null }[];
  /** header auth (dari App) utk load/simpan posisi flowchart ke server */
  authHeaders?: () => Promise<Record<string, string>>;
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
type Graph = { pos: Map<string, Box>; edges: { d: string; black?: boolean }[]; width: number; height: number; colHeaders: { x: number; w: number; label: string; cls: string }[]; pairs?: { src: string; dst: string; black?: boolean }[] };

// ===== layout dgn layering incoming (kiri -> kanan) + rute panah lorong/lane =====
function runLayout(nodes: GNode[]): Graph {
  const n = nodes.length;
  if (n === 0) return { pos: new Map(), edges: [], width: PAD_X * 2, height: 60, colHeaders: [], pairs: [] };
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
  const pairs: { src: string; dst: string }[] = [];
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
      // ===== PORT ATAS/BAWAH — kartu sejajar (bertumpuk di satu deret) -> garis lurus
      // vertikal dari tepi ATAS/BAWAH kartu; jauh lebih rapi drpd keluar kanan lalu
      // menaiki jalur atas. Rute lama dipertahankan bila ruang antar-kartu penuh kartu lain.
      let vert: string | null = null;
      const xc0 = pa.x + W / 2, xc1 = pb.x + W / 2;
      if (pa.x < pb.x + W - 2 && pb.x < pa.x + W - 2 && Math.abs(pa.y - pb.y) > 8) {
        const xLo = Math.min(xc0, xc1) - 6, xHi = Math.max(xc0, xc1) + 6;
        const yLo = Math.min(pa.y, pb.y) + H + 1, yHi = Math.max(pa.y, pb.y) - 1;
        let hit = false;
        for (const p of pos.values()) {
          if (p.x < xHi && xLo < p.x + W && p.y < yHi && yLo < p.y + H) { hit = true; break; }
        }
        if (!hit && yHi > yLo) {
          const down = pb.y > pa.y;
          const a2 = down ? pa.y + H + O : pa.y - O;
          const b2 = down ? pb.y - E : pb.y + H + E;
          vert = Math.abs(xc0 - xc1) < 1.5
            ? `M ${xc0} ${a2} V ${b2}`
            : `M ${xc0} ${a2} C ${xc0} ${a2 + (down ? 16 : -16)}, ${xc1} ${b2 + (down ? -16 : 16)}, ${xc1} ${b2}`;
        }
      }
      if (vert) {
        d = vert;
      } else if (cb > ca || (ca === cb && pa.x < pb.x)) {
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
      const black = roleCol[a] === ROLE_RANK.educate && (roleCol[b] === PRODUK_COL || nodes[b].colOverride === PRODUK_COL);
      edges.push({ d, ...(black ? { black: true } : {}) });
      pairs.push({ src: nodes[a].id, dst: nodes[b].id, ...(black ? { black: true } : {}) });
    }
  }

  return { pos, edges, width, height, colHeaders, pairs };
}

// ===== gerakkan node: terapkan geseran manual (dx,dy) di atas layout dasar =====
// panah dihitung ulang dari posisi AKHIR tiap kotak — jalur sederhana (bezier maju,
// lewat jalur atas utk arah mundur) supaya tak brenta dengan komputasi grid bawaan.
function withFix(base: Graph, fix: Record<string, { dx: number; dy: number }>): Graph {
  const pos = new Map<string, Box>();
  let maxR = 0, maxB = 0;
  for (const [id, p] of base.pos) {
    const f = fix?.[id];
    const x = p.x + (f?.dx || 0);
    const y = p.y + (f?.dy || 0);
    pos.set(id, { x, y });
    maxR = Math.max(maxR, x + W + PAD_X);
    maxB = Math.max(maxB, y + H + PAD_BOT);
  }
  const edges: { d: string; black?: boolean }[] = [];
  for (const pr of base.pairs || []) {
    const pa = pos.get(pr.src), pb = pos.get(pr.dst);
    if (!pa || !pb) continue;
    const x0 = pa.x + W + 6, y0 = pa.y + H / 2;
    const x1 = pb.x - 6,     y1 = pb.y + H / 2;
    let d: string;
    // kartu sejajar hasil drag -> port ATAS/BAWAH lurus (hindari muter jalur atas)
    const xc0 = pa.x + W / 2, xc1 = pb.x + W / 2;
    let vert: string | null = null;
    if (pa.x < pb.x + W - 2 && pb.x < pa.x + W - 2 && Math.abs(pa.y - pb.y) > 8) {
      const xLo = Math.min(xc0, xc1) - 6, xHi = Math.max(xc0, xc1) + 6;
      const yLo = Math.min(pa.y, pb.y) + H + 1, yHi = Math.max(pa.y, pb.y) - 1;
      let hit = false;
      for (const p of pos.values()) {
        if (p.x < xHi && xLo < p.x + W && p.y < yHi && yLo < p.y + H) { hit = true; break; }
      }
      if (!hit && yHi > yLo) {
        const down = pb.y > pa.y;
        const a2 = down ? pa.y + H + 6 : pa.y - 6;
        const b2 = down ? pb.y - 6 : pb.y + H + 6;
        vert = Math.abs(xc0 - xc1) < 1.5
          ? `M ${xc0} ${a2} V ${b2}`
          : `M ${xc0} ${a2} C ${xc0} ${a2 + (down ? 16 : -16)}, ${xc1} ${b2 + (down ? -16 : 16)}, ${xc1} ${b2}`;
      }
    }
    if (vert) {
      d = vert;
    } else if (x1 > x0 + 24) {
      const m = (x1 - x0) * 0.45;
      d = `M ${x0} ${y0} C ${x0 + m} ${y0}, ${x1 - m} ${y1}, ${x1} ${y1}`;
    } else {
      // maju tak jalan (mundur / overlap) → lewat jalur atas dua kotak
      const lane = Math.max(6, Math.min(y0, y1) - 26);
      const xup = Math.max(x0 + 18, x1 + W + 18);
      d =
        `M ${x0} ${y0} H ${xup - 10} Q ${xup} ${y0}, ${xup} ${y0 - 12} ` +
        `V ${lane + 12} Q ${xup} ${lane}, ${xup - 12} ${lane} ` +
        `H ${x1 + 12} Q ${x1} ${lane}, ${x1} ${lane + 12} ` +
        `V ${y1 - 12} Q ${x1} ${y1}, ${x1 - 10} ${y1} H ${x1}`;
    }
    edges.push(pr.black ? { d, black: true } : { d });
  }
  return { ...base, pos, edges, width: Math.max(base.width, maxR), height: Math.max(base.height, maxB) };
}

type Group = { name: string; all: GNode[] };

// READ-ONLY: tab ini HANYA menampilkan ringkasan visual dari tab Konten.
// Kontrak: jangan menambahkan tombol tambah/ubah/hapus, form, atau callback tulis (onAdd/onUpdate/onDelete).
// Sumber data = contentItems tab Konten (di App), disaring tampilan oleh state lokal (cari/buka-tutup) saja.
export default function VisualisasiTab({ loading, items, prodItems, authHeaders }: Props) {
  const [q, setQ] = useState('');
  const kwMap = useMemo(() => keywordMap(items), [items]);
  // map URL (normUrl) -> nama produk ASLI dari tabel products — hanya ini boleh jd kotak PRODUK
  // DUA mode pencocokan utk link relatif: URL penuh (host) & path (/produk/x) — internal link sering tanpa domain
  const prodMaps = useMemo(() => {
    const full = new Map<string, string>();
    const path = new Map<string, string>();
    for (const p of prodItems || []) {
      const nama = (p.nama_produk || '').trim();
      if (!nama) continue;
      for (const u of [p.link_shopee, p.link_artikel]) {
        const f = normUrl(u), pp = normPath(u);
        if (f) full.set(f, nama);
        if (pp) path.set(pp, nama);
      }
    }
    return { full, path };
  }, [prodItems]);
  // path tiap link_artikel artikel -> keyword — utk resolusi internal link relatif menuju artikel
  const artPathMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) {
      const pp = normPath(it.link_artikel);
      if (pp) m.set(pp, (it.target_keyword || it.judul || '').trim());
    }
    return m;
  }, [items]);

  // ===== EDIT POSISI (geser kotak bebas, tersimpan per project) =====
  // edit per KATEGORI: tiap grup punya tombol Edit Sendiri — tak lagi global
  const [editMap, setEditMap] = useState<Record<string, boolean>>({});
  const editRef = useRef(editMap); editRef.current = editMap;
  const nEdit = Object.keys(editMap).filter((k) => editMap[k]).length;
  const toggleEdit = (cat: string) => setEditMap((p) => ({ ...p, [cat]: !p[cat] }));
  const finishAllEdit = () => setEditMap({});
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  // fix = { kategori: { nodeId: {dx,dy} } } — offset dari posisi dasar layout
  const [fixes, setFixes] = useState<Record<string, Record<string, { dx: number; dy: number }>>>({});
  const projKey = (() => { try { return localStorage.getItem('razeo_project') || 'none'; } catch { return 'none'; } })();

  const loadFixes = async () => {
    try {
      const headers: Record<string, string> = authHeaders ? await authHeaders() : {};
      if (!('Authorization' in headers)) return;
      const res = await fetch('/api/projects', { method: 'POST', headers, body: JSON.stringify({ action: 'flow-get' }) });
      if (!res.ok) return;
      const d = await res.json().catch(() => ({}));
      if (d?.positions && typeof d.positions === 'object') {
        // simpan Milik perubahan lokal (mis. belum sempat save) — lokal menang
        setFixes((prev) => (Object.keys(prev).length ? { ...d.positions, ...prev } : d.positions));
      }
    } catch { /* server/down — tetap pakai posisi dasar */ }
  };
  useEffect(() => { loadFixes(); /* eslint-disable-next-line */ }, [projKey]);
  const fixRef = useRef(fixes);
  fixRef.current = fixes;
  const saveTimer = useRef<number | null>(null);
  const scheduleSave = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    // auto-save 800ms setelah gerakan terakhir (tab lama / crash tetap aman)
    saveTimer.current = window.setTimeout(() => { void saveFixes(fixRef.current); }, 800);
  };

  const saveFixes = async (next: Record<string, Record<string, { dx: number; dy: number }>>) => {
    if (!authHeaders) return true;
    try {
      setSaving(true);
      const headers = await authHeaders();
      if (!('Authorization' in headers)) return true; // sesi hilang sementara — perubahan tetap lokal
      const res = await fetch('/api/projects', { method: 'POST', headers, body: JSON.stringify({ action: 'flow-save', positions: next }) });
      const ok = res.ok;
      if (!ok) {
        const d = await res.json().catch(() => ({}));
        // migrasi belum jalan → tetap di UI, cuma info singkat
        if (d?.needsMigration) console.info('[razeo]', d.needsMigration);
      }
      return ok;
    } catch { return false; } finally { setSaving(false); }
  };

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
        const pathKey = normPath(u);
        const prodName = prodMaps.full.get(normUrl(u)) || (pathKey ? prodMaps.path.get(pathKey) : undefined);
        let kwText = urlToKeyword(u, kwMap); // URL penuh -> keyword (pola tab Konten)
        // URL relatif /produk/x & /artikel-x: cari lewat path — sebelumnya tak pernah match krn beda format
        if (prodName) kwText = prodName;
        else if (pathKey && artPathMap.has(pathKey)) {
          const mk = artPathMap.get(pathKey)!;
          if (mk) kwText = mk;
        }
        const lowered = kwText.toLowerCase();
        const targetId = lowerToId.get(lowered); // keyword resolusi -> id artikel (data sama dgn tab Konten)
        let tid: string;
        if (prodName) {
          // tercatat di tabel products -> kolom PRODUK oranye, label nama produk asli
          tid = phantom(lowered, prodName).id;
          const p = probePhantom.get('x:' + lowered);
          if (p) { p.colOverride = PRODUK_COL; p.kw = prodName; }
        } else if (targetId && targetId !== src.id) {
          tid = targetId; // asli — ghost lokal dibuat saat penggabungan grup bila beda kategori
        } else {
          // TIDAK tercatat sbg produk (maupun artikel) -> ghost pgtn internal biasa (kolom LAINNYA)
          tid = phantom(lowered, kwText).id;
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
  const onBoxDown = (e: React.PointerEvent, cat: string, id: string) => {
    if (!editRef.current[cat]) return; // kategori ini belum mode edit → abaikan
    e.preventDefault(); // jangan mulai select teks
    e.stopPropagation(); // jangan ikut pancing marquee/pan kanvas
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);

    if (selectMode) {
      // MODE SELECT: klik diam = toggle pilih; seret (kotak sudah terpilih) = geser seluruh blok
      const already = (sel[cat] || []).includes(id);
      pending.current = { cat, id, moved: false };
      const picks: string[] = already ? sel[cat]! : [id];
      const mv: Record<string, { dx: number; dy: number }> = {};
      for (const i of picks) mv[i] = getFix(cat, i);
      dragData.current = { ids: picks, moves: mv, cat, sx: e.clientX, sy: e.clientY };
      setDragId(id);
      return;
    }

    let ids: string[];
    if (e.shiftKey) {
      // Shift+klik = blok: akumulasi pilihan tanpa drag
      toggleSel(cat, id);
      const cur = sel[cat] || [];
      ids = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return; // jangan mulai drag — biarkan Shift+klik murni seleksi
    } else if (nSel(cat) > 0 && sel[cat]?.includes(id)) {
      ids = sel[cat]!; // seret salah satu kotak terpilih → selector semua ikut
    } else {
      ids = [id]; // klik biasa: cuma kotak ini
    }

    // rekam offset DASAR tiap id agar kumpulan pindah serempak (geser identik)
    const moves: Record<string, { dx: number; dy: number }> = {};
    for (const i of ids) moves[i] = getFix(cat, i);
    dragData.current = { ids, moves, cat, sx: e.clientX, sy: e.clientY };
    setDragId(id);
  };
  const onBoxMove = (e: React.PointerEvent) => {
    const d = dragData.current;
    if (!d) return;
    const z = zoomRef.current || 1;
    const dx = Math.round((e.clientX - d.sx) / z);
    const dy = Math.round((e.clientY - d.sy) / z);
    if (!dx && !dy) return;
    if (pending.current) pending.current.moved = true;
    // terapkan delta YG SAMA ke seluruh id terpilih → posisi relatif antar kotak tetap
    for (const id of d.ids) {
      const b = d.moves[id];
      setFix(d.cat, id, b.dx + dx, b.dy + dy);
    }
  };
  const onBoxUp = () => {
    const p = pending.current;
    if (p) {
      pending.current = null;
      if (!p.moved) toggleSel(p.cat, p.id); // klik diam = pilih / batal pilih
    }
    if (dragData.current) {
      dragData.current = null;
      setDragId(null);
      scheduleSave(); // jadwal simpan (bila gerakan terakhir, timer akan jalan)
    }
  };

  const allOpen = shown.length > 0 && shown.every((g) => openMap[g.name] !== false);
  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    shown.forEach((g) => { next[g.name] = !allOpen; });
    setOpenMap({ ...openMap, ...next });
  };

  const layouts = useMemo(() => {
    const m: Record<string, Graph> = {};
    for (const g of shown) {
      const base = runLayout(g.all);
      m[g.name] = withFix(base, fixes[g.name] || {});
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, openMap, fixes]);

  // offset geser kanvas per grup (drag area abu-abu kosong)
  const [pans, setPans] = useState<Record<string, { x: number; y: number }>>({});
  const panStart = useRef<{ x: number; y: number; px: number; py: number; name: string } | null>(null);

  // alur drag per KOTAK: geser bebas di seluruh kanvas = ubah offset (dx,dy)
  // dragData skrg MENAMPUNG beberapa id (blok) → seret satu kotak terpilih = semua ikut
  const dragData = useRef<{ ids: string[]; moves: Record<string, { dx: number; dy: number }>; cat: string; sx: number; sy: number } | null>(null);

  // ===== BLOK & SERET: pilihan multi per kategori =====
  // sel = { kategori: [idKotak] } — diisi lewat Shift+klik / blok area (Shift+seret di area kosong)
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const nSel = (cat: string): number => (sel[cat] || []).length;
  const nSelAll = (): number => Object.keys(sel).reduce((t: number, k) => t + (sel[k] || []).length, 0);
  const selOf = (cat: string): string[] => sel[cat] || [];
  const toggleSel = (cat: string, id: string): void => {
    setSel((prev) => {
      const cur = prev[cat] || [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      const out = { ...prev };
      if (next.length) out[cat] = next; else delete out[cat];
      return out;
    });
  };
  const setSelCat = (cat: string, ids: string[]) => {
    setSel((prev) => {
      const out = { ...prev };
      if (ids.length) out[cat] = ids; else delete out[cat];
      return out;
    });
  };
  // Shift+di area kosong = blok persegi (rubber band), ukuran dlm koordinat LAYAR
  const marquee = useRef<{ cat: string; sx: number; sy: number } | null>(null);
  const [marqBox, setMarqBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // ===== MODE SELECT =====
  // ON  → klik kotak = pilih/batal pilih (bukan lgsg geser), seret kotak terpilih = pindahkan blok,
  //       seret area kosong = blok persegi (tanpa Shift). Kanvas hanya bisa digeser saat mode OFF.
  const [selectMode, setSelectMode] = useState(false);
  // ===== ZOOM CANVAS (utk semua kategori) =====
  const [zoom, setZoom] = useState<number>(() => {
    try { const v = Number(localStorage.getItem('vhviz.zoom')); if (v && v >= 0.35 && v <= 3) return v; } catch { /* abaikan */ }
    return 1;
  });
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const applyZoom = (v: number) => {
    const z = Math.min(3, Math.max(0.35, Math.round(v * 100) / 100));
    setZoom(z);
    try { localStorage.setItem('vhviz.zoom', String(z)); } catch { /* abaikan */ }
  };
  // penanda klik TANPA geser (utk toggle pilih saat mode select)
  const pending = useRef<{ cat: string; id: string; moved: boolean } | null>(null);
  // Esc = lepas semua blok; keluar mode edit juga bersih
  useEffect(() => {
    // kategori yg keluar mode edit → lepas pilihannya
    setSel((prev) => {
      const out: Record<string, string[]> = {}; let ch = false;
      for (const k of Object.keys(prev)) { if (editMap[k]) out[k] = prev[k]; else ch = true; }
      return ch ? out : prev;
    });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSel({}); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editMap]);

  const getFix = (cat: string, id: string) => fixes[cat]?.[id] || { dx: 0, dy: 0 };
  const setFix = (cat: string, id: string, dx: number, dy: number) => {
    setFixes((prev) => {
      const next: typeof fixes = { ...prev };
      const catMap = { ...(next[cat] || {}) };
      // nol dihapus (balik ke posisi dasar layout)
      if (!dx && !dy) delete catMap[id];
      else catMap[id] = { dx, dy };
      if (Object.keys(catMap).length) next[cat] = catMap; else delete next[cat];
      return next;
    });
    scheduleSave();
  };

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
        {nEdit > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border bg-emerald-50 border-emerald-200 text-emerald-700" title="Edit posisi hanya aktif per kategori">
            ✏️ {nEdit} kategori sedang diedit
            <button onClick={finishAllEdit} className="underline hover:text-emerald-900" title="Tutup semua mode edit sekaligus">
              selesai semua
            </button>
          </span>
        )}
        <div className="inline-flex items-center bg-white border border-gray-200 rounded-xl shadow-sm shrink-0" title={`Zoom kanvas ${Math.round(zoom * 100)}%`}>
          <button
            onClick={() => applyZoom(zoom - 0.1)}
            disabled={zoom <= 0.35}
            className="p-2 rounded-l-xl text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => applyZoom(1)}
            className="px-2 py-1.5 text-[11px] font-black text-gray-700 hover:bg-gray-50 min-w-[46px] text-center"
            title="Kembali ke 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => applyZoom(zoom + 0.1)}
            disabled={zoom >= 3}
            className="p-2 rounded-r-xl text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
        {nEdit > 0 && (
          <button
            onClick={() => setSelectMode((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors',
              selectMode
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                : 'bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-600'
            )}
            title={selectMode
              ? 'Mode Select aktif: klik kotak utk pilih, seret utk pindahkan blok terpilih. Matikan utk geser bebas per kotak.'
              : 'Mode Select mati: seret langsung geser kotak utk kategori ini.'}
          >
            <MousePointerClick className="w-3.5 h-3.5" />
            {selectMode ? 'Mode Select: ON' : 'Mode Select: OFF'}
          </button>
        )}
        {nEdit > 0 && nSelAll() > 0 && (
          <button
            onClick={() => setSel({})}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
            title="Lepas semua blok yang dipilih"
          >
            🧱 {nSelAll()} terpilih — lepas
          </button>
        )}
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
          const ed = editMap[g.name] === true; // mode edit KATEGORI INI
          return (
            <div key={g.name} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setOpenMap({ ...openMap, [g.name]: !open })}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenMap({ ...openMap, [g.name]: !open }); } }}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-gray-50/60 transition-colors cursor-pointer"
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
                {/* tombol Edit POSISI per kategori — tiap grup punya mode edit sendiri */}
                <span
                  className="ml-auto flex items-center gap-2.5 text-[11px] text-gray-400 whitespace-nowrap"
                  onClick={(e) => e.stopPropagation()} /* jangan ikut buka/tutup kategori */
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleEdit(g.name); }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors',
                      ed
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300 hover:text-emerald-700'
                    )}
                    title={ed ? 'Selesai edit posisi kategori ini' : 'Masuk edit posisi — cuma kategori ini'}
                  >
                    {ed ? 'Selesai Edit' : 'Edit Posisi'}
                  </button>
                  <span className="hidden md:flex items-center gap-1.5">
                    Klik untuk tutup/buka
                    <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform', open ? '' : '-rotate-90')} />
                  </span>
                  <ChevronDown className={cn('md:hidden w-4 h-4 text-gray-500 transition-transform', open ? '' : '-rotate-90')} />
                </span>
              </div>

              {open && (
                <div className="border-t border-gray-100 bg-[#f6f7f9] overflow-auto px-3 py-3">
                  {/* mode edit: kanvas LUAS (ruang kosong utk geser bebas) + offset geser kanvas */}
                  {ed && (
                    <div className="flex items-center gap-2 mb-2.5 text-[11px] font-bold text-emerald-700">
                      <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-md border', selectMode ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-emerald-50 border-emerald-200')}>
                        {selectMode ? '⬚ Mode Select: klik kotak utk pilih, lalu seret utk pindahkan blok' : '✋ Klik & tarik kotak untuk memindahkannya'}
                      </span>
                      <span className="hidden sm:inline text-gray-400 font-medium">geser area abu-abu = geser seluruh tampilan</span>
                      <span className="hidden md:inline text-gray-400 font-medium">
                        {selectMode
                          ? 'klik / blok area = pilih banyak · lepas pilihan dgn tombol lepas atau Esc'
                          : 'Shift+klik / Shift+blok area = pilih banyak, lalu seret'}
                      </span>
                      {nSel(g.name) > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700">
                          🧱 {nSel(g.name)} kotak terpilih
                          <button
                            onClick={() => setSelCat(g.name, [])}
                            className="underline hover:text-amber-900"
                            title="Lepas semua blok (Esc)"
                          >
                            lepas
                          </button>
                        </span>
                      )}
                      <button
                        onClick={() => {
                          const next = { ...fixRef.current };
                          delete next[g.name];
                          setFixes(next);
                          if (saveTimer.current) { window.clearTimeout(saveTimer.current); saveTimer.current = null; }
                          void saveFixes(next);
                        }}
                        className="ml-auto px-2 py-1 rounded-md bg-white border border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200"
                        title="Balikkan posisi kategori ini ke susunan otomatis"
                      >
                        Reset kategori ini
                      </button>
                    </div>
                  )}
                  <div
                    className="relative"
                    onPointerDown={(e) => {
                      if (!ed) return;
                      // cuma kalau klik di area kosong (bukan kotak)
                      if ((e.target as HTMLElement).closest('[data-node]')) return;
                      const r0 = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      if (e.shiftKey || selectMode) {
                        // Shift+seret (atau seret saat Mode Select) = BLOK persegi (rubber band)
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                        marquee.current = { cat: g.name, sx: e.clientX - r0.left, sy: e.clientY - r0.top };
                        setMarqBox({ x: marquee.current.sx, y: marquee.current.sy, w: 0, h: 0 });
                        panStart.current = null;
                        return;
                      }
                      panStart.current = { x: e.clientX, y: e.clientY, px: (pans[g.name]?.x || 0), py: (pans[g.name]?.y || 0), name: g.name };
                    }}
                    onPointerMove={(e) => {
                      const s2 = marquee.current;
                      if (s2 && ed) {
                        const r0 = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        const x = e.clientX - r0.left, yy = e.clientY - r0.top;
                        setMarqBox({ x: Math.min(x, s2.sx), y: Math.min(yy, s2.sy), w: Math.abs(x - s2.sx), h: Math.abs(yy - s2.sy) });
                        return;
                      }
                      const p = panStart.current;
                      if (!p || !ed) return;
                      setPans((prev) => ({ ...prev, [p.name]: { x: p.px + (e.clientX - p.x), y: p.py + (e.clientY - p.y) } }));
                    }}
                    onPointerUp={() => {
                      const m = marquee.current;
                      if (m) {
                        const box = marqBox;
                        marquee.current = null;
                        setMarqBox(null);
                        // klik tanpa geser = lepas semua blok kategori ini
                        if (box && box.w > 6 && box.h > 6) {
                          // transform: koordinat inner layar = kotak layar ditambah offset kanvas
                          const ox = (ed ? 300 : 0) + (pans[g.name]?.x || 0);
                          const oy = (ed ? 200 : 0) + (pans[g.name]?.y || 0);
                          const z2 = zoomRef.current || 1;
                          const hit = g.all.filter((k) => {
                            const pt = lay!.pos.get(k.id);
                            if (!pt) return false;
                            const x = pt.x * z2 + ox, y = pt.y * z2 + oy; // ke ruang kanvas luar (skala zoom)
                            return x < box.x + box.w && x + W > box.x && y < box.y + box.h && y + H > box.y;
                          }).map((k) => k.id);
                          setSelCat(g.name, hit);
                        } else {
                          setSelCat(g.name, []);
                        }
                        panStart.current = null;
                        return;
                      }
                      panStart.current = null;
                    }}
                    onPointerLeave={() => { panStart.current = null; }}
                    style={{
                      width: Math.max(lay!.width, 520) * zoom + (ed ? 600 : 0),
                      height: Math.max(lay!.height, 140) * zoom + (ed ? 400 : 0),
                      paddingTop: ed ? 200 : 0,
                      paddingLeft: ed ? 300 : 0,
                      paddingRight: ed ? 300 : 0,
                      paddingBottom: ed ? 200 : 0,
                      cursor: ed ? 'grab' : undefined,
                      touchAction: ed ? 'none' : undefined,
                    }}
                  >
                    <div
                      className="absolute"
                      style={{
                        left: (ed ? 300 : 0) + (pans[g.name]?.x || 0),
                        top: (ed ? 200 : 0) + (pans[g.name]?.y || 0),
                        width: Math.max(lay!.width, 520),
                        height: Math.max(lay!.height, 140),
                        transform: zoom === 1 ? undefined : `scale(${zoom})`,
                        transformOrigin: 'top left',
                      }}
                    >

                    <svg className="absolute inset-0 pointer-events-none overflow-visible" width={Math.max(lay!.width, 520)} height={Math.max(lay!.height, 140)} aria-hidden>
                      <defs>
                        <marker id={`rah-${g.name.replace(/\W/g, '')}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                          <path d="M0,0 L10,5 L0,10 z" fill="#6366f1" />
                        </marker>
                        <marker id={`rahb-${g.name.replace(/\W/g, '')}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                          <path d="M0,0 L10,5 L0,10 z" fill="#111111" />
                        </marker>
                      </defs>
                      {lay!.edges.map((e, i) => (
                        <path key={i} d={e.d} fill="none" stroke={e.black ? '#111111' : '#6366f1'} strokeWidth={e.black ? 1.4 : 1.1} strokeLinecap="round" markerEnd={`url(#${e.black ? 'rahb' : 'rah'}-${g.name.replace(/\W/g, '')})`} />
                      ))}
                    </svg>
                    {g.all.map((k) => {
                      const p = lay!.pos.get(k.id);
                      if (!p) return null;
                      const cls = fillOf(k);
                      const picking = ed && dragId === k.id;
                      const isSel = ed && selOf(g.name).includes(k.id);
                      return (
                        <div
                          key={k.id}
                          data-node={k.id}
                          title={ed ? (isSel ? 'Kotak terpilih — seret utk memindah semua (Esc lepas)' : 'Tarik utk memindahkan · Shift+klik utk blok') : (k.member ? k.kw : `BAHAN dari kolom Internal Link: ${k.kw}`)}
                          onPointerDown={(e) => onBoxDown(e, g.name, k.id)}
                          onPointerMove={onBoxMove}
                          onPointerUp={onBoxUp}
                          onPointerCancel={onBoxUp}
                          className={cn(
                            'absolute rounded-[10px] px-2.5 flex items-center text-[12px] font-semibold text-center justify-center leading-tight shadow-[0_1px_3px_rgba(15,23,42,0.10)] hover:shadow-[0_2px_6px_rgba(15,23,42,0.16)] transition',
                            ed && 'ring-2 ring-white cursor-grab active:cursor-grabbing shadow-[0_4px_12px_rgba(15,23,42,0.20)] z-10',
                            picking && 'scale-[1.03] ring-emerald-400',
                            isSel && !picking && 'ring-2 ring-amber-400 ring-offset-1 z-10 shadow-[0_4px_12px_rgba(15,23,42,0.18)]',
                            cls
                          )}
                          style={{ left: p.x, top: p.y, width: W, height: H, touchAction: ed ? 'none' : undefined }}
                        >
                          <span className="line-clamp-2 break-words text-center">{k.kw}</span>
                        </div>
                      );
                    })}
                    </div>
                    {marqBox && (
                      <div
                        aria-hidden
                        className="absolute border-2 border-dashed border-emerald-500 bg-emerald-400/15 rounded-md pointer-events-none z-20"
                        style={{ left: marqBox.x, top: marqBox.y, width: marqBox.w, height: marqBox.h }}
                      />
                    )}
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
          READ-ONLY (data)
        </span>
        <span className="text-gray-300 hidden md:inline">|</span>
        <span><Link2 className="w-3 h-3 inline" /> isi & tampilan mengikuti <b>tab Konten</b>; hanya POSISI kotak bisa diatur lewat <b>Edit Posisi</b> (tersimpan per project)</span>
      </p>
    </motion.div>
  );
}
