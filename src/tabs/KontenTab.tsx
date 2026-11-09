import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link2, Plus, RefreshCw, Save, Tag, Trash2, X, CalendarDays, User, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';

export type ContentItem = {
  id: string;
  kategori: string | null;
  meta_deskripsi: string | null;
  target_keyword: string | null;
  judul: string;
  tanggal_publikasi: string | null;
  link_artikel: string | null;
  peran: string | null;
  prioritas: string;
  created_at?: string;
};

type Props = {
  loading: boolean;
  items: ContentItem[];
  onAdd: (row: Omit<ContentItem, 'id' | 'created_at'>) => Promise<boolean>;
  onUpdate: (id: string, patch: Partial<ContentItem>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

const ROLES = ['inspire', 'educate', 'convert'] as const;
const PRIORITAS = ['rendah', 'sedang', 'tinggi'] as const;
const prioritasStyle: Record<string, string> = {
  rendah: 'bg-gray-100 text-gray-600',
  sedang: 'bg-amber-50 text-amber-700',
  tinggi: 'bg-red-50 text-red-600',
};

const kosong = {
  kategori: '',
  meta_deskripsi: '',
  target_keyword: '',
  judul: '',
  tanggal_publikasi: '',
  link_artikel: '',
  peran: '',
  prioritas: 'sedang',
};

type Draft = typeof kosong;
// mode popup: 'add' = konten baru, 'edit' = ubah konten lama
type Modal = { mode: 'add' } | { mode: 'edit'; id: string } | null;

export default function KontenTab({ loading, items, onAdd, onUpdate, onDelete }: Props) {
  const [modal, setModal] = useState<Modal>(null);
  const [draft, setDraft] = useState<Draft>({ ...kosong });
  const [busy, setBusy] = useState(false);

  const openAdd = () => { setDraft({ ...kosong }); setModal({ mode: 'add' }); };
  const openEdit = (it: ContentItem) => {
    setDraft({
      kategori: it.kategori ?? '',
      meta_deskripsi: it.meta_deskripsi ?? '',
      target_keyword: it.target_keyword ?? '',
      judul: it.judul,
      tanggal_publikasi: it.tanggal_publikasi ?? '',
      link_artikel: it.link_artikel ?? '',
      peran: it.peran ?? '',
      prioritas: it.prioritas,
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
      peran: draft.peran.trim() || null,
      prioritas: draft.prioritas,
    };
    const ok = modal.mode === 'add' ? await onAdd(row) : await onUpdate(modal.id, row);
    setBusy(false);
    if (ok) setModal(null);
  };

  const cellInput = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500';
  const iconBtn = 'p-1.5 rounded-lg transition-colors';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      {/* Tombol Tambah Konten — ikon mengambang kanan bawah */}
      <button
        onClick={openAdd}
        title="Tambah Konten"
        aria-label="Tambah Konten"
        className="fixed bottom-10 right-10 z-30 w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition-all"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* tabel data */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-left align-top" style={{ minWidth: 980 }}>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {['Produk', 'Role', 'Target Keyword', 'Judul', 'Meta Deskripsi', 'Tgl. Publikasi', 'Link', 'Prioritas', 'Aksi'].map((h) => (
                <th key={h} className="px-4 py-3 text-[11px] uppercase font-black text-gray-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && items.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">Memuat...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400 text-sm">Belum ada data konten. Klik tombol <b>+</b> di kanan bawah untuk mulai pendataan.</td></tr>
            )}
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-gray-50/60 align-top">
                <td className="px-4 py-2.5"><span className="text-xs text-gray-600 break-words whitespace-normal">{it.kategori || '—'}</span></td>
                <td className="px-4 py-2.5">
                  <span className="text-xs text-gray-600 break-words whitespace-normal">{it.peran || '—'}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs text-gray-600 break-words whitespace-normal">{it.target_keyword || '—'}</span>
                </td>
                <td className="px-4 py-2.5 max-w-[260px]">
                  <span className="text-xs font-semibold text-gray-800 block break-words whitespace-normal" title={it.judul}>{it.judul}</span>
                </td>
                <td className="px-4 py-2.5 max-w-[260px]">
                  <span className="text-xs text-gray-500 block break-words whitespace-normal" title={it.meta_deskripsi || ''}>{it.meta_deskripsi || '—'}</span>
                </td>
                <td className="px-4 py-2.5">
                  <span className="text-xs text-gray-600 break-words whitespace-normal">{it.tanggal_publikasi || '—'}</span>
                </td>
                <td className="px-4 py-2.5">
                  {it.link_artikel ? (
                    <a href={it.link_artikel} target="_blank" rel="noreferrer" title="Buka artikel" aria-label="Buka artikel" className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                      <Link2 className="w-4 h-4" />
                    </a>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <span className={cn('inline-block px-2 py-0.5 rounded-md text-xs font-bold capitalize', prioritasStyle[it.prioritas] || prioritasStyle.sedang)}>{it.prioritas}</span>
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
                  <select value={draft.peran} onChange={(e) => setDraft({ ...draft, peran: e.target.value })} className={cn(cellInput, 'mt-1 h-[38px]')}>
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
                  <input type="date" value={draft.tanggal_publikasi} onChange={(e) => setDraft({ ...draft, tanggal_publikasi: e.target.value })} className={cn(cellInput, 'mt-1')} />
                </label>
                <label className="text-xs font-medium text-gray-500">Prioritas
                  <select value={draft.prioritas} onChange={(e) => setDraft({ ...draft, prioritas: e.target.value })} className={cn(cellInput, 'mt-1 h-[38px]')}>
                    {PRIORITAS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-500 sm:col-span-2">Link Artikel
                  <input value={draft.link_artikel} onChange={(e) => setDraft({ ...draft, link_artikel: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="https://..." />
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