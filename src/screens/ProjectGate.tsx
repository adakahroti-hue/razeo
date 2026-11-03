import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, BarChart3, Check, ChevronRight, Pencil, RefreshCw, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';

type Props = {
  error: string | null;
  setError: (v: string | null) => void;
  projects: Array<{ id: string; name: string; role: string }>;
  activeProjectId: string | null;
  projectNameInput: string;
  setProjectNameInput: (v: string) => void;
  createConfirm: boolean;
  setCreateConfirm: (v: boolean) => void;
  projectWorking: boolean;
  handleCreateProject: () => void;
  handleRenameProject: (pid: string, newName: string) => Promise<boolean>;
  enterProject: (pid: string, name: string, role: string) => void;
  handleLogout: () => void;
};

export default function ProjectGate(props: Props) {
  const { error, setError, projects, activeProjectId, projectNameInput, setProjectNameInput, createConfirm, setCreateConfirm, projectWorking, handleCreateProject, handleRenameProject, enterProject, handleLogout } = props;

  // Edit nama project inline: editingId = id project yang sedang diedit null = tiada
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editWorking, setEditWorking] = useState(false);

  const startEdit = (p: { id: string; name: string }) => {
    setEditingId(p.id);
    setEditValue(p.name);
    setError(null);
  };

  const submitEdit = async () => {
    if (!editingId || editWorking || !editValue.trim()) return;
    setEditWorking(true);
    const ok = await handleRenameProject(editingId, editValue);
    setEditWorking(false);
    if (ok) setEditingId(null);
  };
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center p-6">
      {error && (
        <div className="max-w-md w-full mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-600 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Error</p>
            <p className="opacity-90">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full p-8 rounded-3xl bg-white border border-gray-200 shadow-2xl space-y-6"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold">Pilih Project</h2>
          <p className="text-gray-500 text-sm mt-2">
            Setiap project punya data GSC/GA4 sendiri. Mau masuk yang mana?
          </p>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
          {projects.length > 0 ? projects.map((p) => (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              onClick={() => { if (editingId !== p.id) enterProject(p.id, p.name, p.role); }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && editingId !== p.id) { e.preventDefault(); enterProject(p.id, p.name, p.role); }
              }}
              className={cn(
                "w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between group",
                activeProjectId === p.id
                  ? "bg-emerald-50 border-emerald-600 text-emerald-700"
                  : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-emerald-600/10 flex items-center justify-center flex-shrink-0">
                  <Search className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0 flex-1">
                  {editingId === p.id ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); submitEdit(); }
                        if (e.key === 'Escape') { e.preventDefault(); setEditingId(null); }
                      }}
                      className="w-full px-2 py-1 -mx-2 rounded-lg bg-white border-2 border-emerald-500 text-sm font-semibold focus:outline-none"
                    />
                  ) : (
                    <span className="font-semibold truncate block">{p.name}</span>
                  )}
                  <span className="text-[10px] uppercase tracking-wider text-gray-400">
                    {p.role === 'owner' ? 'Pemilik' : 'Anggota'}
                  </span>
                </div>
              </div>
              {editingId === p.id ? (
                <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={submitEdit}
                    disabled={editWorking || !editValue.trim()}
                    title="Simpan nama"
                    className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {editWorking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    title="Batal"
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); if (p.role === 'owner') startEdit(p); }}
                  title={p.role === 'owner' ? 'Ubah nama project' : 'Hanya pemilik yang boleh mengubah nama'}
                  className={cn(
                    "p-1.5 rounded-lg transition-all flex-shrink-0",
                    p.role === 'owner'
                      ? "text-gray-300 group-hover:text-emerald-600 hover:bg-emerald-50"
                      : "text-gray-200 cursor-not-allowed"
                  )}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          )) : (
            <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
              Belum ada project. Buat yang pertama ↓
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-5 space-y-3">
          <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 px-1">
            Buat Project Baru
          </label>
          <div className="flex gap-2">
            <input
              value={projectNameInput}
              onChange={(e) => { setProjectNameInput(e.target.value); setCreateConfirm(false); }}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                if (!projectNameInput.trim() || projectWorking) return;
                if (!createConfirm) { setCreateConfirm(true); return; }
                handleCreateProject();
              }}
              placeholder="Nama project, misal: Toko Budi"
              className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={handleCreateProject}
              disabled={projectWorking || !projectNameInput.trim()}
              className={cn(
                "px-5 py-3 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                createConfirm ? "bg-emerald-700 ring-2 ring-emerald-300" : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {projectWorking ? <RefreshCw className="w-4 h-4 animate-spin" /> : createConfirm ? 'Konfirmasi ✓' : 'Buat'}
            </button>
          </div>
          <p className={cn("text-[11px] pt-1 transition-colors", createConfirm ? "text-emerald-600 font-semibold" : "text-gray-400")}>
            {createConfirm
              ? "Tekan Enter lagi / klik 'Konfirmasi' untuk membuat project ini."
              : "Tekan Enter sekali untuk konfirmasi, baru Enter lagi untuk membuat."}
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-2 text-gray-400 text-sm hover:text-gray-600 transition-colors"
        >
          Keluar / Ganti Akun
        </button>
      </motion.div>
    </div>
  );
}
