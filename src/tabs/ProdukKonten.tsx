import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, RefreshCw, Save, ShoppingBag, Trash2, X, Pencil, Folder, Search, ChevronDown, ChevronsDownUp, ChevronsUpDown, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import DateField from '../components/DateField';
import { fmtTanggal } from '../lib/dateFormat';

export type ProductItem = {
  id: string;
  kategori: string | null;
  nama_produk: string;
  judul_produk: string | null;
  link_artikel: string | null;
  link_shopee: string | null;
  harga: number | null;
  tanggal_publikasi: string | null;
  created_at?: string;
};

type Props = {
  loading: boolean;
  items: ProductItem[];
  onAdd: (row: any) => Promise<boolean>;
  onUpdate: (id: string, patch: any) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

const kosong = {
  kategori: '',
  nama_produk: '',
  judul_produk: '',
  link_artikel: '',
  link_shopee: '',
  harga: '',
  tanggal_publikasi: '',
};
type Draft = typeof kosong;
// mode popup: 'add' = produk baru, 'edit' = ubah produk lama
type Modal = { mode: 'add' } | { mode: 'edit'; id: string } | null;

const fmtHarga = (v: number | null) =>
  v == null ? '—' : `Rp ${Number(v).toLocaleString('id-ID')}`;

const COLS = ['Nama Produk', 'Judul Produk', 'Harga', 'Tgl. Publikasi', 'Link Artikel', 'Link Shopee', 'Aksi'];

export default function ProdukKonten({ loading, items, onAdd, onUpdate, onDelete }: Props) {
  const [modal, setModal] = useState<Modal>(null);
  const [draft, setDraft] = useState<Draft>({ ...kosong });
  const [busy, setBusy] = useState(false);
  // ===== toolbar (gaya sama dgn sub Artikel): cari, filter, urut, statistik, tutup semua =====
  const [q, setQ] = useState('');
  const [katFilter, setKatFilter] = useState(''); // '' = semua kategori
  const [sort, setSort] = useState<'terbaru' | 'terlama'>('terbaru');
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({}); // default: terbuka

  const keyOf = (d?: string | null) => d || '';
  const matches = (hay: string) => !q || hay.toLowerCase().includes(q.toLowerCase());
  const katName = (v: string | null) => (v || '').trim() || 'Tanpa Kategori';

  const katOptions = [...new Set(items.map((p) => katName(p.kategori)))].sort((a, b) => a.localeCompare(b));

  const vis = items
    .filter((p) => !katFilter || katName(p.kategori) === katFilter)
    .filter((p) => matches(`${p.nama_produk} ${p.judul_produk || ''} ${p.kategori || ''}`))
    .sort((a, b) => {
      const ka = keyOf(a.tanggal_publikasi || a.created_at), kb = keyOf(b.tanggal_publikasi || b.created_at);
      return sort === 'terbaru' ? kb.localeCompare(ka) : ka.localeCompare(kb);
    });

  // kelompok per Kategori (kepala grup — persis pola sub Artikel)
  const groups: { name: string; rows: ProductItem[] }[] = [];
  for (const p of vis) {
    const key = katName(p.kategori);
    const g = groups.find((x) => x.name === key);
    if (g) g.rows.push(p); else groups.push({ name: key, rows: [p] });
  }
  const allOpen = groups.length > 0 && groups.every((g) => openMap[g.name] !== false);
  const toggleAll = () => {
    const next: Record<string, boolean> = {};
    groups.forEach((g) => { next[g.name] = !allOpen ? false : true; });
    setOpenMap({ ...openMap, ...next });
  };

  const openAdd = () => { setDraft({ ...kosong }); setModal({ mode: 'add' }); };
  const openEdit = (it: ProductItem) => {
    setDraft({
      kategori: it.kategori ?? '',
      nama_produk: it.nama_produk,
      judul_produk: it.judul_produk ?? '',
      link_artikel: it.link_artikel ?? '',
      link_shopee: it.link_shopee ?? '',
      harga: it.harga == null ? '' : String(it.harga),
      tanggal_publikasi: it.tanggal_publikasi ?? '',
    });
    setModal({ mode: 'edit', id: it.id });
  };
  const closeModal = () => { if (!busy) setModal(null); };

  const submit = async () => {
    if (!draft.nama_produk.trim() || busy || !modal) return;
    setBusy(true);
    const row = {
      kategori: draft.kategori.trim() || null,
      nama_produk: draft.nama_produk.trim(),
      judul_produk: draft.judul_produk.trim() || null,
      link_artikel: draft.link_artikel.trim() || null,
      link_shopee: draft.link_shopee.trim() || null,
      harga: draft.harga.trim() === '' || !Number.isFinite(Number(draft.harga)) ? null : Number(draft.harga),
      tanggal_publikasi: draft.tanggal_publikasi || null,
    };
    const ok = modal.mode === 'add' ? await onAdd(row) : await onUpdate(modal.id, row);
    setBusy(false);
    if (ok) setModal(null);
  };

  const cellInput = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500';
  const iconBtn = 'p-1.5 rounded-lg transition-colors';

  // tombol link: ikon panah keluar kotak (gaya sama kolom Link artikel), warna membedakan tujuan
  const linkCell = (href: string | null, type: 'artikel' | 'shopee') =>
    href ? (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        title={type === 'artikel' ? 'Buka artikel' : 'Buka di Shopee'}
        aria-label={type === 'artikel' ? 'Buka artikel' : 'Buka di Shopee'}
        className={cn(
          'inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors',
          type === 'artikel'
            ? 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50'
            : 'text-orange-500 hover:text-orange-600 hover:bg-orange-50'
        )}
      >
        {type === 'artikel' ? <ExternalLink className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
      </a>
    ) : (
      <span className="text-gray-400">—</span>
    );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      {/* Tombol Tambah Produk — ikon mengambang kanan bawah */}
      <button
        onClick={openAdd}
        title="Tambah Produk"
        aria-label="Tambah Produk"
        className="fixed bottom-10 right-10 z-30 w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition-all"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* ===== Toolbar (gaya sub Artikel): cari, filter, urut, statistik, tutup semua ===== */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama produk, judul, atau kategori..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={katFilter}
          onChange={(e) => setKatFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:border-emerald-500"
        >
          <option value="">Semua Kategori</option>
          {katOptions.map((n) => <option key={n} value={n}>{n}</option>)}
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
          Total Grup: <b className="text-emerald-600">{groups.length} Kategori</b>
          <span className="mx-1.5 text-gray-300">&bull;</span>
          Total Konten: <b className="text-emerald-600">{vis.length} Produk</b>
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

      {/* ===== Produk terkelompok per Kategori (kartu accordion — gaya sama artikel) ===== */}
      <div className="space-y-3">
        {loading && items.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-8 text-center text-gray-400 text-sm">Memuat...</div>
        )}
        {!loading && vis.length === 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-10 text-center text-gray-400 text-sm">
            {items.length === 0
              ? <>Belum ada produk. Klik tombol <b>+</b> di kanan bawah untuk menambah produk.</>
              : <>Tidak ada produk yang cocok dengan pencarian/filter.</>}
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
                {g.rows.length} Produk
              </span>
              <span className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400 whitespace-nowrap">
                Klik untuk tutup/buka
                <ChevronDown className={cn('w-4 h-4 text-gray-500 transition-transform', open ? '' : '-rotate-90')} />
              </span>
            </button>

            {/* tabel dalam grup */}
            {open && (
              <div className="overflow-x-auto border-t border-gray-100">
                <table className="w-full table-fixed text-left align-top" style={{ minWidth: 680 }}>
                    <colgroup>
                      {COLS.map((h) => (
                        <col key={h} style={{ width: `${100 / COLS.length}%` }} />
                      ))}
                    </colgroup>
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      {COLS.map((h) => (
                        <th key={h} className="px-4 py-2.5 text-[11px] uppercase tracking-wide font-medium text-gray-400 leading-tight align-bottom">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {g.rows.map((it) => (
                      <tr key={it.id} className="hover:bg-gray-50/60 align-top">
                        <td className="px-4 py-2.5">
                          <span className="text-sm text-gray-900 block leading-snug break-all whitespace-normal" title={it.nama_produk}>{it.nama_produk}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-gray-500 block whitespace-normal break-all" title={it.judul_produk || ''}>{it.judul_produk || '—'}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs tabular-nums">{fmtHarga(it.harga)}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-xs text-gray-600 whitespace-nowrap">{fmtTanggal(it.tanggal_publikasi)}</span>
                        </td>
                        <td className="px-4 py-2.5">{linkCell(it.link_artikel, 'artikel')}</td>
                        <td className="px-4 py-2.5">{linkCell(it.link_shopee, 'shopee')}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => openEdit(it)} className={cn(iconBtn, 'border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700')} title="Ubah" aria-label="Ubah">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => window.confirm(`Hapus produk "${it.nama_produk}"?`) && onDelete(it.id)} className={cn(iconBtn, 'text-gray-400 hover:text-red-600 hover:bg-red-50')} title="Hapus" aria-label="Hapus">
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

      {/* ===== POPUP FORM: tambah / edit produk ===== */}
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
                  {modal.mode === 'add' ? 'Tambah Produk' : 'Ubah Produk'}
                </h3>
                <button onClick={closeModal} title="Tutup" aria-label="Tutup" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-500">Kategori
                  <input value={draft.kategori} onChange={(e) => setDraft({ ...draft, kategori: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="Kategori produk (mis. Elektronik)" />
                </label>
                <label className="text-xs font-medium text-gray-500">Nama Produk *
                  <input value={draft.nama_produk} onChange={(e) => setDraft({ ...draft, nama_produk: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="Nama produk" autoFocus />
                </label>
                <label className="text-xs font-medium text-gray-500 sm:col-span-2">Judul Produk
                  <input value={draft.judul_produk} onChange={(e) => setDraft({ ...draft, judul_produk: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="Judul untuk halaman produk / artikel" />
                </label>
                <label className="text-xs font-medium text-gray-500">Link Artikel
                  <input value={draft.link_artikel} onChange={(e) => setDraft({ ...draft, link_artikel: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="https://..." />
                </label>
                <label className="text-xs font-medium text-gray-500">Link Shopee
                  <input value={draft.link_shopee} onChange={(e) => setDraft({ ...draft, link_shopee: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="https://shopee...." />
                </label>
                <label className="text-xs font-medium text-gray-500">Harga (Rp)
                  <input inputMode="numeric" value={draft.harga} onChange={(e) => setDraft({ ...draft, harga: e.target.value.replace(/[^\d]/g, '') })} className={cn(cellInput, 'mt-1')} placeholder="Contoh: 150000" />
                </label>
                <label className="text-xs font-medium text-gray-500">Tanggal Publikasi
                  <DateField value={draft.tanggal_publikasi} onChange={(v) => setDraft({ ...draft, tanggal_publikasi: v })} className={cellInput + ' mt-1'} />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-5">
                <button onClick={closeModal} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50">Batal</button>
                <button
                  onClick={submit}
                  disabled={busy || !draft.nama_produk.trim()}
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