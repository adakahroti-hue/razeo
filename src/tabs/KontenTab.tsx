import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link2, Plus, RefreshCw, Save, Tag, Trash2, X, CalendarDays, User, Pencil, Folder, Search, ChevronDown, ChevronsDownUp, ChevronsUpDown, ExternalLink, FileCode } from 'lucide-react';
import { cn } from '../lib/utils';
import ProdukKonten, { type ProductItem } from './ProdukKonten';
import BundleKonten, { type BundleItem } from './BundleKonten';
import DateField from '../components/DateField';
import { fmtTanggal } from '../lib/dateFormat';
import { keywordMap, urlToKeyword } from '../lib/resolveKeyword';

export type ContentItem = {
  id: string;
  kategori: string | null;
  meta_deskripsi: string | null;
  target_keyword: string | null;
  judul: string;
  tanggal_publikasi: string | null;
  link_artikel: string | null;
  internal_link: string | null;
  peran: string | null;
  isi_artikel: string | null;   // isi HTML (mode HTML WordPress)
  created_at?: string;
};

type Props = {
  loading: boolean;
  items: ContentItem[];
  onAdd: (row: Omit<ContentItem, 'id' | 'created_at'>) => Promise<boolean>;
  onUpdate: (id: string, patch: Partial<ContentItem>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  // sub-tab Produk (tabel terpisah: products)
  prodLoading: boolean;
  prodItems: ProductItem[];
  onProdAdd: (row: any) => Promise<boolean>;
  onProdUpdate: (id: string, patch: any) => Promise<boolean>;
  onProdDelete: (id: string) => Promise<boolean>;
  // sub-tab Bundle (tabel terpisah: bundles)
  bundleLoading: boolean;
  bundleItems: BundleItem[];
  onBundleAdd: (row: any) => Promise<boolean>;
  onBundleUpdate: (id: string, patch: any) => Promise<boolean>;
  onBundleDelete: (id: string) => Promise<boolean>;
  // kontrol sub-bab (mengalir dari header App)
  sub: 'artikel' | 'produk' | 'bundle';
  setSub: (v: 'artikel' | 'produk' | 'bundle') => void;
};

const ROLES = ['inspire', 'educate', 'convert'] as const;
// highlight warna Role: inspire=biru, educate=ungu, convert=hijau
const roleStyle: Record<string, string> = {
  inspire: 'bg-blue-50 text-blue-700',
  educate: 'bg-purple-50 text-purple-700',
  convert: 'bg-emerald-50 text-emerald-700',
};

const kosong = {
  kategori: '',
  meta_deskripsi: '',
  target_keyword: '',
  judul: '',
  tanggal_publikasi: '',
  link_artikel: '',
  internal_link: '',
  peran: '',
  isi_artikel: '',
};

type Draft = typeof kosong;
// mode popup: 'add' = konten baru, 'edit' = ubah konten lama
type Modal = { mode: 'add' } | { mode: 'edit'; id: string } | null;

// sanitasi ringan isi HTML tempelan: buang tag eksekusi & handler sebelum render
const sanitizeHtml = (html: string): string =>
  html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/(href|src)\s*=\s*("|')?\s*javascript:[^"'>\s]*/gi, '$1="#"');

// internal_link: teks satu URL per baris (atau dipisah koma) -> daftar
const splitLinks = (v: string | null): string[] =>
  (v || '').split(/[\r\n,]+/).map((s) => s.trim()).filter(Boolean);

export default function KontenTab({ loading, items, onAdd, onUpdate, onDelete, prodLoading, prodItems, onProdAdd, onProdUpdate, onProdDelete, bundleLoading, bundleItems, onBundleAdd, onBundleUpdate, onBundleDelete, sub, setSub }: Props) {
  const [modal, setModal] = useState<Modal>(null);
  const [draft, setDraft] = useState<Draft>({ ...kosong });
  const [busy, setBusy] = useState(false);
  // popup preview isi artikel (render HTML)
  const [preview, setPreview] = useState<ContentItem | null>(null);
  // URL internal -> kata kunci tujuan (tampilan kolom & diagram)
  const kwMap = keywordMap(items);
  // ===== toolbar: cari, filter, urut, statistik, tutup semua =====
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState(''); // '' = semua role (Artikel saja)
  const [sort, setSort] = useState<'terbaru' | 'terlama'>('terbaru');
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({}); // default: terbuka

  const keyOf = (d?: string | null) => d || '';
  // urutan role default: inspire -> educate -> convert -> (kosong)
  const ROLE_ORDER: Record<string, number> = { inspire: 0, educate: 1, convert: 2 };
  const roleRank = (p?: string | null) => (p && p.toLowerCase() in ROLE_ORDER ? ROLE_ORDER[p.toLowerCase()] : 3);
  const matches = (hay: string) => !q || hay.toLowerCase().includes(q.toLowerCase());

  // tampilan terurut (sub Produk)
  const prodVis = prodItems
    .filter((p) => matches(`${p.nama_produk} ${p.judul_produk || ''} ${p.kategori || ''}`))
    .sort((a, b) => {
      const ka = keyOf(a.tanggal_publikasi || a.created_at), kb = keyOf(b.tanggal_publikasi || b.created_at);
      return sort === 'terbaru' ? kb.localeCompare(ka) : ka.localeCompare(kb);
    });
  const prodGrup = new Set(prodVis.map((p) => (p.kategori || '').trim() || 'Tanpa Kategori')).size;

  // tampilan terfilter + kelompok per Kategori (sub Artikel, gaya mockup)
  const artVis = items
    .filter((it) => (!roleFilter || (it.peran || '') === roleFilter))
    .filter((it) => matches(`${it.judul} ${it.target_keyword || ''} ${it.kategori || ''} ${it.meta_deskripsi || ''}`))
    .sort((a, b) => {
      const ra = roleRank(a.peran), rb = roleRank(b.peran);
      if (ra !== rb) return ra - rb; // urutan utama: role
      const ka = keyOf(a.tanggal_publikasi || a.created_at), kb = keyOf(b.tanggal_publikasi || b.created_at);
      return sort === 'terbaru' ? kb.localeCompare(ka) : ka.localeCompare(kb); // pemecah: tanggal
    });
  const groups: { name: string; rows: ContentItem[] }[] = [];
  for (const it of artVis) {
    const key = (it.kategori || '').trim() || 'Tanpa Kategori';
    const g = groups.find((x) => x.name === key);
    if (g) g.rows.push(it); else groups.push({ name: key, rows: [it] });
  }
  const allOpen = groups.length > 0 && groups.every((g) => openMap[g.name] !== false);
  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    groups.forEach((g) => { next[g.name] = !allOpen ? false : true; });
    setOpenMap({ ...openMap, ...next });
  };

  const openAdd = () => { setDraft({ ...kosong }); setModal({ mode: 'add' }); };
  const openEdit = (it: ContentItem) => {
    setDraft({
      kategori: it.kategori ?? '',
      meta_deskripsi: it.meta_deskripsi ?? '',
      target_keyword: it.target_keyword ?? '',
      judul: it.judul,
      tanggal_publikasi: it.tanggal_publikasi ?? '',
      link_artikel: it.link_artikel ?? '',
      internal_link: it.internal_link ?? '',
      peran: it.peran ?? '',
      isi_artikel: it.isi_artikel ?? '',
    });
    setModal({ mode: 'edit', id: it.id });
  };
  const closeModal = () => { if (!busy) setModal(null); };

  const submit = async () => {
    if (!draft.judul.trim() || busy || !modal) return;
    setBusy(true);
    const row = {
      kategori: draft.kategori.trim() || null,
      meta_deskripsi: draft.meta_deskripsi.trim() || null,
      target_keyword: draft.target_keyword.trim() || null,
      judul: draft.judul.trim(),
      tanggal_publikasi: draft.tanggal_publikasi || null,
      link_artikel: draft.link_artikel.trim() || null,
      internal_link: draft.internal_link.trim() || null,
      peran: draft.peran.trim() || null,
      isi_artikel: draft.isi_artikel || null,
    };
    const ok = modal.mode === 'add' ? await onAdd(row) : await onUpdate(modal.id, row);
    setBusy(false);
    if (ok) setModal(null);
  };

  const cellInput = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500';
  const iconBtn = 'p-1.5 rounded-lg transition-colors';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      <React.Fragment>
      {/* Tombol Tambah Konten — ikon mengambang kanan bawah (sub Artikel); tombol Produk milik ProdukKonten */}
      {sub === 'artikel' && (
      <button
        onClick={openAdd}
        title={sub === 'artikel' ? 'Tambah Konten' : 'Tambah Produk'}
        aria-label={sub === 'artikel' ? 'Tambah Konten' : 'Tambah Produk'}
        className="fixed bottom-10 right-10 z-30 w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition-all"
      >
        <Plus className="w-7 h-7" />
      </button>
      )}

      {/* ===== Toolbar Artikel: cari, filter, urut, statistik, tutup semua ===== */}
      {sub === 'artikel' && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari target keyword, judul, atau kategori..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-emerald-500"
          >
            <option value="">Semua Role</option>
            {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
          </select>
          <button
            onClick={() => setSort(sort === 'terbaru' ? 'terlama' : 'terbaru')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-emerald-300"
            title="Balik urutkan"
          >
            {sort === 'terbaru' ? 'Tanggal Terbaru' : 'Tanggal Terlama'}
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          <div className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-500 whitespace-nowrap">
            Total Grup: <b className="text-emerald-600">{groups.length} Produk</b>
            <span className="mx-1.5 text-gray-300">&bull;</span>
            Total Konten: <b className="text-emerald-600">{artVis.length} Artikel</b>
          </div>
          <button
            onClick={toggleAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-emerald-300 whitespace-nowrap"
            title={allOpen ? 'Tutup semua grup' : 'Buka semua grup'}
          >
            {allOpen ? <ChevronsDownUp className="w-4 h-4 text-gray-400" /> : <ChevronsUpDown className="w-4 h-4 text-gray-400" />}
            {allOpen ? 'Collapse Semua' : 'Buka Semua'}
          </button>
        </div>
      )}

      {/* ===== Artikel terkelompok per Kategori (kartu accordion) ===== */}
      {sub === 'artikel' && (
      <div className="space-y-3">
        {loading && items.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-8 text-center text-gray-400 text-sm">Memuat...</div>
        )}
        {!loading && artVis.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-10 text-center text-gray-400 text-sm">
            {items.length === 0
              ? <>Belum ada data konten. Klik tombol <b>+</b> di kanan bawah untuk mulai pendataan.</>
              : <>Tidak ada konten yang cocok dengan pencarian/filter.</>}
          </div>
        )}
        {groups.map((g) => {
          const open = openMap[g.name] !== false;
          return (
          <div key={g.name} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* kepala grup */}
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
                {g.rows.length} Artikel
              </span>
              <span className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400 whitespace-nowrap">
                Klik untuk tutup/buka
                <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform', open ? '' : '-rotate-90')} />
              </span>
            </button>

            {/* tabel dalam grup */}
            {open && (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full text-left align-top" style={{ minWidth: 940 }}>
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      {['Role', 'Target Keyword', 'Judul', 'Meta Deskripsi', 'Isi Artikel', 'Internal Link', 'Tgl. Publikasi', 'Link', 'Aksi'].map((h) => (
                        <th key={h} className="px-4 py-2.5 text-[11px] uppercase tracking-wide font-medium text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {g.rows.map((it) => (
                      <tr key={it.id} className="hover:bg-gray-50/60 align-top">
                        <td className="px-4 py-2.5">
                          {it.peran ? (
                            <span className={cn('inline-block px-2 py-0.5 rounded-md text-xs font-bold capitalize', roleStyle[it.peran] || 'bg-gray-100 text-gray-600')}>
                              {it.peran}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 max-w-[220px]">
                          {it.target_keyword ? (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs break-words whitespace-normal" title={it.target_keyword}>
                              {it.target_keyword}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 max-w-[300px]">
                          <span className="text-sm font-normal text-gray-900 block leading-snug" title={it.judul}>{it.judul}</span>
                        </td>
                        <td className="px-4 py-2.5 max-w-[240px]">
                          <span className="text-xs text-gray-500 whitespace-normal break-words" title={it.meta_deskripsi || ''}>{it.meta_deskripsi || '—'}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <button onClick={() => setPreview(it)} title="Lihat isi artikel (HTML)" aria-label="Lihat isi artikel"
                                  className={cn(iconBtn, 'border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700', !it.isi_artikel && 'opacity-40')}>
                            <FileCode className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-4 py-2.5 max-w-[260px]">
                          {(() => {
                            const ls = splitLinks(it.internal_link);
                            if (!ls.length) return <span className="text-gray-400">—</span>;
                            return (
                              <div className="flex flex-col gap-1 min-w-0">
                                {ls.map((u, i) => {
                                  const kw = urlToKeyword(u, kwMap);
                                  return (
                                    <span key={i} title={u}
                                       className="inline-block self-start px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs break-words whitespace-normal">
                                      {kw} <span className="text-indigo-400">&rarr;</span>
                                    </span>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-gray-600 whitespace-nowrap">{fmtTanggal(it.tanggal_publikasi)}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {it.link_artikel ? (
                            <a href={it.link_artikel} target="_blank" rel="noreferrer" title="Buka artikel" aria-label="Buka artikel" className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => openEdit(it)} className={cn(iconBtn, 'border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700')} title="Ubah" aria-label="Ubah">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => window.confirm(`Hapus konten "${it.judul}"?`) && onDelete(it.id)} className={cn(iconBtn, 'text-gray-400 hover:text-red-600 hover:bg-red-50')} title="Hapus" aria-label="Hapus">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          );
        })}
      </div>
      )}

      {/* tabel data — sub Produk */}
      {sub === 'produk' && (
        <ProdukKonten
          loading={prodLoading}
          items={prodItems}
          onAdd={onProdAdd}
          onUpdate={onProdUpdate}
          onDelete={onProdDelete}
        />
      )}

      {/* tabel data — sub Bundle */}
      {sub === 'bundle' && (
        <BundleKonten
          loading={bundleLoading}
          items={bundleItems}
          onAdd={onBundleAdd}
          onUpdate={onBundleUpdate}
          onDelete={onBundleDelete}
        />
      )}
      </React.Fragment>

      {/* ===== POPUP PREVIEW isi artikel (render HTML mode WordPress) ===== */}
      <AnimatePresence>
        {preview && (
          <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40 p-4" onClick={() => setPreview(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-5 max-h-[92vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-gray-400">
                    <FileCode className="w-3.5 h-3.5" /> Isi Artikel (HTML)
                  </div>
                  <h3 className="font-bold text-base text-gray-900 mt-1 leading-snug">{preview.judul}</h3>
                </div>
                <button onClick={() => setPreview(null)} title="Tutup" aria-label="Tutup" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* area baca Artikel: lebar nyaman + tipografi panjang (nyaris mirip halaman post WordPress) */}
              <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-gray-100 bg-white">
                {preview.isi_artikel ? (
                  <article
                    className="wp-article mx-auto w-full max-w-3xl px-6 py-7 text-gray-800"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(preview.isi_artikel) }}
                  />
                ) : (
                  <p className="p-6 text-sm text-gray-400">Belum ada isi artikel untuk konten ini. Klik ✏️ Ubah lalu tempel HTML-nya.</p>
                )}
              </div>
              <div className="mt-3 text-[11px] text-gray-400 shrink-0 flex items-center justify-between">
                <span>Viewer HTML — heading bawaan kode tetap tampil seperti aslinya</span>
                <span>{(preview.isi_artikel || '').length.toLocaleString('id-ID')} karakter</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== POPUP FORM: tambah / edit ===== */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={closeModal}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl p-8 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-extrabold text-lg text-gray-900">
                  {modal.mode === 'add' ? 'Tambah Konten' : 'Ubah Konten'}
                </h3>
                <button onClick={closeModal} title="Tutup" aria-label="Tutup" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-500">Kategori
                  <input value={draft.kategori} onChange={(e) => setDraft({ ...draft, kategori: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="Blog / Landing..." />
                </label>
                <label className="text-xs font-medium text-gray-500">Role
                  <select value={draft.peran} onChange={(e) => setDraft({ ...draft, peran: e.target.value })} className={cn(cellInput, 'mt-1 h-[38px]', 'capitalize')}>
                    <option value="">— pilih role —</option>
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    {draft.peran && !ROLES.includes(draft.peran as any) && (
                      <option value={draft.peran}>{draft.peran} (lama)</option>
                    )}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-500 sm:col-span-2">Target Keyword
                  <input value={draft.target_keyword} onChange={(e) => setDraft({ ...draft, target_keyword: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="keyword utama" />
                </label>
                <label className="text-xs font-medium text-gray-500 sm:col-span-2">Judul *
                  <input value={draft.judul} onChange={(e) => setDraft({ ...draft, judul: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="Judul artikel" />
                </label>
                <label className="text-xs font-medium text-gray-500 sm:col-span-2">Meta Deskripsi
                  <textarea value={draft.meta_deskripsi} onChange={(e) => setDraft({ ...draft, meta_deskripsi: e.target.value })} className={cn(cellInput, 'mt-1 h-24 resize-y leading-relaxed')} placeholder="Deskripsi untuk mesin pencari (opsional)" />
                </label>
                <label className="text-xs font-medium text-gray-500">Tanggal Publikasi
                  <DateField value={draft.tanggal_publikasi} onChange={(v) => setDraft({ ...draft, tanggal_publikasi: v })} className={cellInput + ' mt-1'} />
                </label>
                <label className="text-xs font-medium text-gray-500 sm:col-span-2">Link Artikel
                  <input value={draft.link_artikel} onChange={(e) => setDraft({ ...draft, link_artikel: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="https://..." />
                </label>
                <label className="text-xs font-medium text-gray-500 sm:col-span-2">Internal Link
                  <textarea value={draft.internal_link} onChange={(e) => setDraft({ ...draft, internal_link: e.target.value })} className={cn(cellInput, 'mt-1 h-24 resize-y leading-relaxed')} placeholder="Satu URL tujuan per baris — di tabel tampil sebagai kata kunci tujuannya" />
                </label>
                <label className="text-xs font-medium text-gray-500 sm:col-span-2">Isi Artikel (mode HTML WordPress)
                  <textarea
                    value={draft.isi_artikel}
                    onChange={(e) => setDraft({ ...draft, isi_artikel: e.target.value })}
                    className={cn(cellInput, 'mt-1 h-40 resize-y leading-relaxed font-mono text-[13px]')}
                    placeholder="Tempel isi artikel dalam mode HTML WordPress (contoh: <p>Paragraf...</p>)"
                    spellCheck={false}
                  />
                </label>
                
              </div>

              <div className="flex justify-end gap-2 pt-5">
                <button onClick={closeModal} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50">Batal</button>
                <button
                  onClick={submit}
                  disabled={busy || !draft.judul.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Simpan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}