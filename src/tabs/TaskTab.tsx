import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Save, Trash2, X, Pencil, ListTodo } from 'lucide-react';
import { cn } from '../lib/utils';

export type TaskItem = {
  id: string;
  nama_tugas: string;
  prioritas: string;   // rendah | sedang | tinggi
  status: string;      // rencana | proses | selesai
  created_at?: string;
};

type Props = {
  loading: boolean;
  items: TaskItem[];
  onAdd: (row: Omit<TaskItem, 'id' | 'created_at'>) => Promise<boolean>;
  onUpdate: (id: string, patch: Partial<TaskItem>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
};

const PRIORITAS = ['rendah', 'sedang', 'tinggi'] as const;
const STATUSES = ['rencana', 'proses', 'selesai'] as const;

const prioritasStyle: Record<string, string> = {
  rendah: 'bg-gray-100 text-gray-600',
  sedang: 'bg-amber-50 text-amber-700',
  tinggi: 'bg-red-50 text-red-600',
};
const statusStyle: Record<string, string> = {
  rencana: 'bg-gray-100 text-gray-600',
  proses: 'bg-blue-50 text-blue-700',
  selesai: 'bg-emerald-50 text-emerald-700',
};

const kosong = { nama_tugas: '', prioritas: 'sedang', status: 'rencana' };
type Draft = typeof kosong;
// mode popup: 'add' = tugas baru, 'edit' = ubah tugas lama
type Modal = { mode: 'add' } | { mode: 'edit'; id: string } | null;

export default function TaskTab({ loading, items, onAdd, onUpdate, onDelete }: Props) {
  const [modal, setModal] = useState<Modal>(null);
  const [draft, setDraft] = useState<Draft>({ ...kosong });
  const [busy, setBusy] = useState(false);

  const openAdd = () => { setDraft({ ...kosong }); setModal({ mode: 'add' }); };
  const openEdit = (it: TaskItem) => {
    setDraft({ nama_tugas: it.nama_tugas, prioritas: it.prioritas, status: it.status });
    setModal({ mode: 'edit', id: it.id });
  };
  const closeModal = () => { if (!busy) setModal(null); };

  const submit = async () => {
    if (!draft.nama_tugas.trim() || busy || !modal) return;
    setBusy(true);
    const row = {
      nama_tugas: draft.nama_tugas.trim(),
      prioritas: draft.prioritas,
      status: draft.status,
    };
    const ok = modal.mode === 'add' ? await onAdd(row) : await onUpdate(modal.id, row);
    setBusy(false);
    if (ok) setModal(null);
  };

  // perubahan cepat langsung dari tabel (tanpa popup)
  const quickPatch = (it: TaskItem, patch: Partial<TaskItem>) => onUpdate(it.id, patch);

  const cellInput = 'w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500';
  const iconBtn = 'p-1.5 rounded-lg transition-colors';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      {/* Tombol Tambah Tugas — ikon mengambang kanan bawah (sama seperti tab Konten) */}
      <button
        onClick={openAdd}
        title="Tambah Tugas"
        aria-label="Tambah Tugas"
        className="fixed bottom-10 right-10 z-30 w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30 hover:brightness-110 hover:shadow-emerald-600/40 transition-all"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* tabel data */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-left align-top" style={{ minWidth: 720 }}>
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {['Nama Tugas', 'Prioritas', 'Status', 'Aksi'].map((h) => (
                <th key={h} className="px-4 py-3 text-[11px] uppercase font-black text-gray-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && items.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">Memuat...</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-400 text-sm">
                  Belum ada tugas. Klik tombol <b>+</b> di kanan bawah untuk menambah rencana kerja.
                </td>
              </tr>
            )}
            {items.map((it) => (
              <tr key={it.id} className="hover:bg-gray-50/60 align-top">
                <td className="px-4 py-2.5 max-w-[420px]">
                  <span className={cn(
                    'text-xs font-semibold text-gray-800 block break-words whitespace-normal',
                    it.status === 'selesai' && 'line-through text-gray-400'
                  )} title={it.nama_tugas}>
                    {it.nama_tugas}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={it.prioritas}
                    onChange={(e) => quickPatch(it, { prioritas: e.target.value })}
                    title="Ubah prioritas"
                    className={cn(
                      'text-xs font-bold rounded-md px-2 py-1 border border-transparent cursor-pointer focus:outline-none',
                      prioritasStyle[it.prioritas] || prioritasStyle.sedang
                    )}
                  >
                    {PRIORITAS.map((p) => <option key={p} value={p} className="bg-white text-gray-800 capitalize">{p}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <select
                    value={it.status}
                    onChange={(e) => quickPatch(it, { status: e.target.value })}
                    title="Ubah status"
                    className={cn(
                      'text-xs font-bold rounded-md px-2 py-1 border border-transparent cursor-pointer focus:outline-none',
                      statusStyle[it.status] || statusStyle.rencana
                    )}
                  >
                    {STATUSES.map((s) => <option key={s} value={s} className="bg-white text-gray-800 capitalize">{s}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(it)} title="Ubah tugas" className={cn(iconBtn, 'border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600')}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => window.confirm(`Hapus tugas "${it.nama_tugas}"?`) && onDelete(it.id)} title="Hapus" className={cn(iconBtn, 'text-gray-400 hover:text-red-600 hover:bg-red-50')}>
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-extrabold text-lg text-gray-900 flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-emerald-600" />
                  {modal.mode === 'add' ? 'Tambah Tugas' : 'Ubah Tugas'}
                </h3>
                <button onClick={closeModal} title="Tutup" aria-label="Tutup" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <label className="block text-xs font-medium text-gray-500">Nama Tugas
                  <textarea
                    value={draft.nama_tugas}
                    onChange={(e) => setDraft({ ...draft, nama_tugas: e.target.value })}
                    className={cn(cellInput, 'mt-1 h-20 resize-y leading-relaxed')}
                    placeholder="Contoh: Susun rencana konten kuartal depan"
                    autoFocus
                  />
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="block text-xs font-medium text-gray-500">Prioritas
                    <select value={draft.prioritas} onChange={(e) => setDraft({ ...draft, prioritas: e.target.value })} className={cn(cellInput, 'mt-1 capitalize')}>
                      {PRIORITAS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-gray-500">Status
                    <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} className={cn(cellInput, 'mt-1 capitalize')}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button onClick={closeModal} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50">
                    Batal
                  </button>
                  <button
                    onClick={submit}
                    disabled={busy || !draft.nama_tugas.trim()}
                    className="px-5 py-2 rounded-lg text-sm font-bold bg-emerald-600 text-white hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    {busy ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}