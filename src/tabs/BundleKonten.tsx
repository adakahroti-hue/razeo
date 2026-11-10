import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, RefreshCw, Save, Trash2, X, Pencil, Link2, Search, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { fmtTanggal } from '../lib/dateFormat';

export type BundleItem = {
  id: string;
  url_bundle: string;
  nama_bundle: string;
  created_at?: string;
};

type Props = {
  loading: boolean;
  items: BundleItem[];
  onAdd: (row: any) => Promise<boolean>;
  onUpdate: (id: string, patch: any) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

const kosong = { url_bundle: '', nama_bundle: '' };
type Draft = typeof kosong;
// mode popup: 'add' = bundle baru, 'edit' = ubah bundle lama
type Modal = { mode: 'add' } | { mode: 'edit'; id: string } | null;

const COLS = ['Url Bundle', 'Nama Bundle', 'Aksi'];

export default function BundleKonten({ loading, items, onAdd, onUpdate, onDelete }: Props) {
  const [modal, setModal] = useState<Modal>(null);
  const [draft, setDraft] = useState<Draft>({ ...kosong });
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'terbaru' | 'terlama'>('terbaru');

  const vis = items
    .filter((it) => !q || `${it.nama_bundle} ${it.url_bundle}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const ka = a.created_at || '', kb = b.created_at || '';
      return sort === 'terbaru' ? kb.localeCompare(ka) : ka.localeCompare(kb);
    });

  const openAdd = () => { setDraft({ ...kosong }); setModal({ mode: 'add' }); };
  const openEdit = (it: BundleItem) => {
    setDraft({ url_bundle: it.url_bundle, nama_bundle: it.nama_bundle });
    setModal({ mode: 'edit', id: it.id });
  };
  const closeModal = () => { if (!busy) setModal(null); };

  const submit = async () => {
    if (!draft.url_bundle.trim() || !draft.nama_bundle.trim() || busy || !modal) return;
    setBusy(true);
    const row = {
      url_bundle: draft.url_bundle.trim(),
      nama_bundle: draft.nama_bundle.trim(),
    };
    const ok = modal.mode === 'add' ? await onAdd(row) : await onUpdate(modal.id, row);
    setBusy(false);
    if (ok) setModal(null);
  };

  const cellInput = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500';
  const iconBtn = 'p-1.5 rounded-lg transition-colors';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      {/* Tombol Tambah Bundle — ikon mengambang kanan bawah */}
      <button
        onClick={openAdd}
        title="Tambah Bundle"
        aria-label="Tambah Bundle"
        className="fixed bottom-10 right-10 z-30 w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition-all"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Toolbar ringan (konsisten dgn sub lain, tanpa grup) */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama bundle atau url bundle..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <button
          onClick={() => setSort(sort === 'terbaru' ? 'terlama' : 'terbaru')}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-emerald-300"
          title="Balik urutkan"
        >
          {sort === 'terbaru' ? 'Terbaru' : 'Terlama'}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
        <div className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-500 whitespace-nowrap">
          Total: <b className="text-emerald-600">{vis.length} Bundle</b>
        </div>
      </div>

      {/* tabel data */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-left align-top" style={{ minWidth: 720 }}>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {COLS.map((h) => (
                <th key={h} className="px-4 py-2.5 text-[11px] uppercase tracking-wide font-medium text-gray-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && items.length === 0 && (
              <tr><td colSpan={COLS.length} className="px-4 py-8 text-center text-gray-400 text-sm">Memuat...</td></tr>
            )}
            {!loading && vis.length === 0 && (
              <tr>
                <td colSpan={COLS.length} className="px-4 py-10 text-center text-gray-400 text-sm">
                  {items.length === 0
                    ? <>Belum ada bundle. Klik tombol <b>+</b> di kanan bawah untuk menambah bundle.</>
                    : <>Tidak ada bundle yang cocok dengan pencarian.</>}
                </td>
              </tr>
            )}
            {vis.map((it) => (
              <tr key={it.id} className="hover:bg-gray-50/60 align-top">
                <td className="px-4 py-2.5 max-w-[420px]">
                  <a
                    href={it.url_bundle}
                    target="_blank"
                    rel="noreferrer"
                    title={it.url_bundle}
                    className="inline-flex items-start gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs hover:bg-emerald-100 max-w-full"
                  >
                    <Link2 className="w-3 h-3 shrink-0 mt-0.5" />
                    <span className="whitespace-pre-wrap break-all">{it.url_bundle}</span>
                  </a>
                </td>
                <td className="px-4 py-2.5 max-w-[280px]">
                  <span className="text-sm text-gray-900 block leading-snug break-words whitespace-normal" title={it.nama_bundle}>{it.nama_bundle}</span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(it)} className={cn(iconBtn, 'border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700')} title="Ubah" aria-label="Ubah">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => window.confirm(`Hapus bundle "${it.nama_bundle}"?`) && onDelete(it.id)} className={cn(iconBtn, 'text-gray-400 hover:text-red-600 hover:bg-red-50')} title="Hapus" aria-label="Hapus">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== POPUP FORM: tambah / edit bundle ===== */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={closeModal}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-extrabold text-lg text-gray-900">
                  {modal.mode === 'add' ? 'Tambah Bundle' : 'Ubah Bundle'}
                </h3>
                <button onClick={closeModal} title="Tutup" aria-label="Tutup" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block text-xs font-medium text-gray-500">Url Bundle *
                  <input value={draft.url_bundle} onChange={(e) => setDraft({ ...draft, url_bundle: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="https://..." autoFocus />
                </label>
                <label className="block text-xs font-medium text-gray-500">Nama Bundle *
                  <input value={draft.nama_bundle} onChange={(e) => setDraft({ ...draft, nama_bundle: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="Nama bundle" />
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-5">
                <button onClick={closeModal} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50">Batal</button>
                <button
                  onClick={submit}
                  disabled={busy || !draft.url_bundle.trim() || !draft.nama_bundle.trim()}
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