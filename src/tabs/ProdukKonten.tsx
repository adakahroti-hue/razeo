import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link2, Plus, RefreshCw, Save, ShoppingBag, Trash2, X, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';

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

const COLS = [
  'Kategori',
  'Nama Produk',
  'Judul Produk',
  'Link Artikel',
  'Link Shopee',
  'Harga',
  'Tgl. Publikasi',
  'Aksi',
];

export default function ProdukKonten({ loading, items, onAdd, onUpdate, onDelete }: Props) {
  const [modal, setModal] = useState<Modal>(null);
  const [draft, setDraft] = useState<Draft>({ ...kosong });
  const [busy, setBusy] = useState(false);

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

  // tombol link: ikon, bukan teks
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
            ? 'text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700'
            : 'text-orange-600 hover:bg-orange-50 hover:text-orange-700'
        )}
      >
        {type === 'artikel' ? <Link2 className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
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

      {/* tabel data */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-left align-top" style={{ minWidth: 980 }}>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {COLS.map((h) => (
                <th key={h} className="px-4 py-3 text-[11px] uppercase font-black text-gray-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && items.length === 0 && (
              <tr><td colSpan={COLS.length} className="px-4 py-8 text-center text-gray-400 text-sm">Memuat...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="px-4 py-10 text-center text-gray-400 text-sm">
                  Belum ada produk. Klik tombol <b>+</b> di kanan bawah untuk menambah produk.
                </td>
              </tr>
            )}
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-gray-50/60 align-top">
                <td className="px-4 py-2.5"><span className="text-xs text-gray-600 break-words whitespace-normal">{it.kategori || '—'}</span></td>
                <td className="px-4 py-2.5 max-w-[220px]">
                  <span className="text-xs font-semibold text-gray-800 block break-words whitespace-normal" title={it.nama_produk}>{it.nama_produk}</span>
                </td>
                <td className="px-4 py-2.5 max-w-[260px]">
                  <span className="text-xs text-gray-800 block break-words whitespace-normal" title={it.judul_produk || ''}>{it.judul_produk || '—'}</span>
                </td>
                <td className="px-4 py-2.5">{linkCell(it.link_artikel, 'artikel')}</td>
                <td className="px-4 py-2.5">{linkCell(it.link_shopee, 'shopee')}</td>
                <td className="px-4 py-2.5">
                  <span className="text-xs font-semibold text-gray-800 whitespace-nowrap tabular-nums">{fmtHarga(it.harga)}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs text-gray-600 break-words whitespace-normal">{it.tanggal_publikasi || '—'}</span>
                </td>
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
                  <input type="date" value={draft.tanggal_publikasi} onChange={(e) => setDraft({ ...draft, tanggal_publikasi: e.target.value })} className={cn(cellInput, 'mt-1')} />
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