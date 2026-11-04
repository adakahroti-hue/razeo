import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FolderOpen, Link2, Plus, RefreshCw, Save, Tag, Trash2, X, CalendarDays, User } from 'lucide-react';
import { cn } from '../lib/utils';

export type ContentItem = {
  id: string;
  kategori: string | null;
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

const PRIORITAS = ['rendah', 'sedang', 'tinggi'] as const;
const prioritasStyle: Record<string, string> = {
  rendah: 'bg-gray-100 text-gray-600',
  sedang: 'bg-amber-50 text-amber-700',
  tinggi: 'bg-red-50 text-red-600',
};

const kosong = {
  kategori: '',
  target_keyword: '',
  judul: '',
  tanggal_publikasi: '',
  link_artikel: '',
  peran: '',
  prioritas: 'sedang',
};

export default function KontenTab({ loading, items, onAdd, onUpdate, onDelete }: Props) {
  // baris form tambah (ditampilkan sebagai baris teratas saat terbuka)
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ ...kosong });
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<ContentItem>>({});

  const submitNew = async () => {
    if (!draft.judul.trim() || busy) return;
    setBusy(true);
    const ok = await onAdd({
      kategori: draft.kategori.trim() || null,
      target_keyword: draft.target_keyword.trim() || null,
      judul: draft.judul.trim(),
      tanggal_publikasi: draft.tanggal_publikasi || null,
      link_artikel: draft.link_artikel.trim() || null,
      peran: draft.peran.trim() || null,
      prioritas: draft.prioritas,
    });
    setBusy(false);
    if (ok) { setDraft({ ...kosong }); setShowForm(false); }
  };

  const startEdit = (it: ContentItem) => {
    setEditingId(it.id);
    setEdit({ kategori: it.kategori, target_keyword: it.target_keyword, judul: it.judul, tanggal_publikasi: it.tanggal_publikasi, link_artikel: it.link_artikel, peran: it.peran, prioritas: it.prioritas });
  };

  const saveEdit = async (id: string) => {
    if (busy) return;
    setBusy(true);
    const ok = await onUpdate(id, edit);
    setBusy(false);
    if (ok) setEditingId(null);
  };

  const cellInput = 'w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      {/* header + tombol tambah */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-bold text-gray-800">
            <FolderOpen className="w-4 h-4 text-emerald-600" />
            Pendataan Konten
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-md font-black text-emerald-700 bg-emerald-50">{items.length} Data</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Tutup Form' : 'Tambah Konten'}
          </button>
        </div>
      </div>

      {/* form tambah */}
      {showForm && (
        <div className="bg-white border border-emerald-200 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <label className="text-xs font-bold text-gray-500">Judul *
              <input value={draft.judul} onChange={(e) => setDraft({ ...draft, judul: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="Judul artikel" />
            </label>
            <label className="text-xs font-bold text-gray-500">Kategori
              <input value={draft.kategori} onChange={(e) => setDraft({ ...draft, kategori: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="Blog / Landing…" />
            </label>
            <label className="text-xs font-bold text-gray-500">Target Keyword
              <input value={draft.target_keyword} onChange={(e) => setDraft({ ...draft, target_keyword: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="keyword utama" />
            </label>
            <label className="text-xs font-bold text-gray-500">Tanggal Publikasi
              <input type="date" value={draft.tanggal_publikasi} onChange={(e) => setDraft({ ...draft, tanggal_publikasi: e.target.value })} className={cn(cellInput, 'mt-1')} />
            </label>
            <label className="text-xs font-bold text-gray-500 sm:col-span-2">Link Artikel
              <input value={draft.link_artikel} onChange={(e) => setDraft({ ...draft, link_artikel: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="https://…" />
            </label>
            <label className="text-xs font-bold text-gray-500">Role
              <input value={draft.peran} onChange={(e) => setDraft({ ...draft, peran: e.target.value })} className={cn(cellInput, 'mt-1')} placeholder="Penulis / Editor…" />
            </label>
            <label className="text-xs font-bold text-gray-500">Prioritas
              <select value={draft.prioritas} onChange={(e) => setDraft({ ...draft, prioritas: e.target.value })} className={cn(cellInput, 'mt-1 h-[34px]')}>
                {PRIORITAS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50">Batal</button>
            <button
              onClick={submitNew}
              disabled={busy || !draft.judul.trim()}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {busy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan
            </button>
          </div>
        </div>
      )}

      {/* tabel data */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[960px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/60">
              {['Judul', 'Kategori', 'Target Keyword', 'Tgl. Publikasi', 'Link', 'Role', 'Prioritas', 'Aksi'].map((h) => (
                <th key={h} className="px-4 py-3 text-[11px] uppercase font-black text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {/* baris form menempel di atas kalau terbuka */}
            <tr className="hidden">
              <td colSpan={8} />
            </tr>
            {loading && items.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">Memuat…</td></tr>
            )}
            {!loading && items.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400 text-sm">Belum ada data konten. Klik <b>"Tambah Konten"</b> untuk mulai pendataan.</td></tr>
            )}
            {items.map((it) => {
              const editing = editingId === it.id;
              return (
                <tr key={it.id} className={cn('hover:bg-gray-50/60', editing && 'bg-emerald-50/40')}>
                  <td className="px-4 py-2.5 max-w-[240px]">
                    {editing ? (
                      <input value={String(edit.judul ?? '')} onChange={(e) => setEdit({ ...edit, judul: e.target.value })} className={cellInput} />
                    ) : (
                      <span className="font-semibold text-gray-800 block truncate" title={it.judul}>{it.judul}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {editing ? (
                      <input value={String(edit.kategori ?? '')} onChange={(e) => setEdit({ ...edit, kategori: e.target.value })} className={cellInput} />
                    ) : (
                      <span className="text-xs text-gray-600">{it.kategori || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 max-w-[200px]">
                    {editing ? (
                      <input value={String(edit.target_keyword ?? '')} onChange={(e) => setEdit({ ...edit, target_keyword: e.target.value })} className={cellInput} />
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-600 truncate"><Tag className="w-3 h-3 text-gray-300" />{it.target_keyword || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {editing ? (
                      <input type="date" value={String(edit.tanggal_publikasi ?? '')} onChange={(e) => setEdit({ ...edit, tanggal_publikasi: e.target.value })} className={cellInput} />
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-600 text-xs"><CalendarDays className="w-3 h-3 text-gray-300" />{it.tanggal_publikasi || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 max-w-[220px]">
                    {editing ? (
                      <input value={String(edit.link_artikel ?? '')} onChange={(e) => setEdit({ ...edit, link_artikel: e.target.value })} className={cellInput} placeholder="https://…" />
                    ) : it.link_artikel ? (
                      <a href={it.link_artikel} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-emerald-700 hover:underline truncate">
                        <Link2 className="w-3 h-3 flex-shrink-0" />Buka artikel
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {editing ? (
                      <input value={String(edit.peran ?? '')} onChange={(e) => setEdit({ ...edit, peran: e.target.value })} className={cellInput} />
                    ) : (
                      <span className="flex items-center gap-1.5 text-gray-600 text-xs"><User className="w-3 h-3 text-gray-300" />{it.peran || '—'}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {editing ? (
                      <select value={String(edit.prioritas ?? 'sedang')} onChange={(e) => setEdit({ ...edit, prioritas: e.target.value })} className={cn(cellInput, 'h-[34px]')}>
                        {PRIORITAS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    ) : (
                      <span className={cn('px-2 py-0.5 rounded-md text-xs font-bold capitalize', prioritasStyle[it.prioritas] || prioritasStyle.sedang)}>{it.prioritas}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {editing ? (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => saveEdit(it.id)} disabled={busy} className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50" title="Simpan">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50" title="Batal">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => startEdit(it)} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors">Ubah</button>
                        <button onClick={() => window.confirm(`Hapus konten "${it.judul}"?`) && onDelete(it.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}