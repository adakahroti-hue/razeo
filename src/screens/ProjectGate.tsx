import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, ArrowRight, BarChart3, LogOut, Pencil, Plus, Search, Trash2, X, RefreshCw, Check } from 'lucide-react';
import { cn } from '../lib/utils';

type Project = {
  id: string;
  name: string;
  role: string;
  gsc_site?: string | null;
  ga4_property?: string | null;
};

type Props = {
  error: string | null;
  setError: (v: string | null) => void;
  projects: Project[];
  activeProjectId: string | null;
  handleCreateProjectWith: (name: string) => Promise<boolean>;
  handleRenameProject: (pid: string, newName: string) => Promise<boolean>;
  handleDeleteProject: (pid: string) => Promise<boolean>;
  enterProject: (pid: string, name: string, role: string) => void;
  handleLogout: () => void;
  user: any;
};

export default function ProjectGate(props: Props) {
  const {
    error, setError, projects, activeProjectId,
    handleRenameProject, handleDeleteProject,
    enterProject, handleLogout, user, handleCreateProjectWith,
  } = props;

  // --- edit nama inline ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editWorking, setEditWorking] = useState(false);

  // --- modal buat project ---
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [createWorking, setCreateWorking] = useState(false);

  // --- modal konfirmasi hapus ---
  const [delTarget, setDelTarget] = useState<Project | null>(null);
  const [delWorking, setDelWorking] = useState(false);

  const startEdit = (p: Project) => { setEditingId(p.id); setEditValue(p.name); setError(null); };

  const submitEdit = async () => {
    if (!editingId || editWorking || !editValue.trim()) return;
    setEditWorking(true);
    const ok = await handleRenameProject(editingId, editValue);
    setEditWorking(false);
    if (ok) setEditingId(null);
  };

  const openCreate = () => {
    setNewName('');
    setShowCreate(true);
    setError(null);
  };

  const submitCreate = async () => {
    const name = newName.trim();
    if (!name || createWorking) return;
    setCreateWorking(true);
    const ok = await handleCreateProjectWith(name); // handler App: buat + langsung masuk
    setCreateWorking(false);
    if (ok) setShowCreate(false);
  };

  const submitDelete = async () => {
    if (!delTarget || delWorking) return;
    setDelWorking(true);
    const ok = await handleDeleteProject(delTarget.id);
    setDelWorking(false);
    setDelTarget(null);
    return ok;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/70 via-mint-50/40 to-white text-gray-900 flex flex-col relative">
      {/* grid halus */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(16,185,129,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(16,185,129,0.07) 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      {/* === NAVBAR === */}
      <header className="relative z-10 w-full border-b border-gray-200/70 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-5xl px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="font-bold text-gray-700 text-[15px] tracking-tight">SEO & Analytics Suite</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 pl-1.5 pr-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-gray-300 transition-colors"
            title="Keluar"
          >
            <span className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold">
              {(user?.email || 'U').charAt(0).toUpperCase()}
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <span className="text-[13px] text-gray-600 max-w-[170px] truncate">{user?.email || 'Akun'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </span>
            <span className="w-px h-6 bg-gray-200" />
            <span className="flex items-center gap-1.5 text-[13px] text-gray-600 pr-0.5">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </span>
          </button>
        </div>
      </header>

      {error && (
        <div className="relative z-10 max-w-2xl w-full mx-auto mt-5 px-5">
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-600 text-sm shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Error</p>
              <p className="opacity-90">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* === KARTU PUSAT === */}
      <main className="relative z-10 flex-1 flex items-start justify-center p-5">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-[720px] mt-10 bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-400/40 p-7 sm:px-8"
        >
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-emerald-500" />
            </div>
            <h2 className="mt-4 text-2xl font-bold">Pilih Project</h2>
            <p className="mt-1.5 text-sm text-gray-500">
              Setiap project punya data Search Console (GSC) & Google Analytics (GA4) sendiri-sendiri. Pilih untuk melanjutkan.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-4 px-3 py-1 rounded-full bg-gray-50 border border-gray-100 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {projects.length} Project Tersedia
            </span>
          </div>

          {/* daftar project */}
          <div className="mt-6 space-y-3">
            {projects.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                Belum ada project. Buat yang pertama lewat tombol <b>"Project Baru"</b> ↓
              </div>
            )}
            {projects.map((p) => {
              const active = activeProjectId === p.id;
              const editing = editingId === p.id;
              const isOwner = p.role === 'owner';
              return (
                <div
                  key={p.id}
                  onClick={() => { if (!editing) enterProject(p.id, p.name, p.role); }}
                  className={cn(
                    'group w-full rounded-xl px-4 py-3.5 flex items-center gap-3.5 cursor-pointer transition-all',
                    active
                      ? 'bg-emerald-500/[0.06] border-2 border-emerald-400/70'
                      : 'bg-white border border-gray-200 hover:border-gray-300'
                  )}
                >
                  <div className="w-10 h-10 rounded-[10px] bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Search className="w-5 h-5 text-gray-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {editing ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); submitEdit(); }
                            if (e.key === 'Escape') { e.preventDefault(); setEditingId(null); }
                          }}
                          className="w-full max-w-[260px] px-2 py-1 rounded-lg bg-white border-2 border-emerald-500 text-sm font-bold focus:outline-none"
                        />
                      ) : (
                        <span className="font-bold text-[15px] text-gray-800 truncate">{p.name}</span>
                      )}
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                          isOwner ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                        )}
                      >
                        {isOwner ? 'Pemilik' : 'Anggota'}
                      </span>
                    </div>

                    {/* pill status connection */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {p.gsc_site ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px] text-gray-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          GSC Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px] text-gray-400">
                          <span className="w-2 h-2 rounded-full bg-gray-300" />
                          GSC Belum
                        </span>
                      )}
                      {p.ga4_property ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px] text-gray-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          GA4 Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-gray-200 text-[11px] text-gray-400">
                          <span className="w-2 h-2 rounded-full bg-gray-300" />
                          GA4 —
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ikon aksi */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {editing ? (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); submitEdit(); }}
                          disabled={editWorking || !editValue.trim()}
                          title="Simpan"
                          className="p-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                          {editWorking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                          title="Batal"
                          className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (isOwner) startEdit(p); }}
                          title={isOwner ? 'Ubah nama' : 'Hanya pemilik project yang bisa mengubah nama'}
                          className={cn('p-2 rounded-lg transition-colors', isOwner ? 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50' : 'text-gray-200 cursor-not-allowed')}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); if (isOwner) { setError(null); setDelTarget(p); } }}
                          title={isOwner ? 'Hapus project' : 'Hanya pemilik project yang bisa menghapus'}
                          className={cn('p-2 rounded-lg transition-colors', isOwner ? 'text-gray-400 hover:text-red-600 hover:bg-red-50' : 'text-gray-200 cursor-not-allowed')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ArrowRight className={cn('w-4 h-4 ml-1', active ? 'text-emerald-600' : 'text-gray-300 group-hover:text-gray-400')} />
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </main>

      {/* footer teks */}
      <p className="relative z-10 text-center text-[11px] text-gray-400 pb-6 px-5">
        Data dilindungi koneksi (OAuth) resmi Google Search Console & Google Analytics 4 — hanya akses baca.
      </p>

      {/* FAB project baru */}
      <button
        onClick={openCreate}
        className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-600 text-white text-sm font-bold shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 active:scale-95 transition-all"
      >
        <Plus className="w-5 h-5" />
        Project Baru
      </button>

      {/* === MODAL BUAT PROJECT === */}
      {showCreate && (
        <div className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-5" onClick={() => setShowCreate(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Project Baru</h3>
              <button onClick={() => setShowCreate(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-1">Beri nama project — misalnya nama websitemu.</p>

            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitCreate(); } }}
              placeholder="Nama project, misal: Toko Budi"
              className="w-full mt-4 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />

            <div className="flex gap-2.5 mt-4">
              <button
                onClick={submitCreate}
                disabled={createWorking || !newName.trim()}
                className="flex-1 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createWorking ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Buat Project'}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-3 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* === MODAL KONFIRMASI HAPUS === */}
      {delTarget && (
        <div className="fixed inset-0 z-40 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-5" onClick={() => setDelTarget(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold">Hapus project?</h3>
                <p className="text-sm text-gray-500">
                  <b>“{delTarget.name}”</b> beserta data koneksi & log di dalamnya ikut terhapus. Tidak bisa dibatalkan.
                </p>
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={submitDelete}
                disabled={delWorking}
                className="flex-1 py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {delWorking ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Ya, Hapus'}
              </button>
              <button
                onClick={() => setDelTarget(null)}
                className="px-5 py-3 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}