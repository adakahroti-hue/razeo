import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, BarChart3, ChevronRight, RefreshCw, Search, X } from 'lucide-react';
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
  enterProject: (pid: string, name: string, role: string) => void;
  handleLogout: () => void;
};

export default function ProjectGate(props: Props) {
  const { error, setError, projects, activeProjectId, projectNameInput, setProjectNameInput, createConfirm, setCreateConfirm, projectWorking, handleCreateProject, enterProject, handleLogout } = props;
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
            <button
              key={p.id}
              onClick={() => enterProject(p.id, p.name, p.role)}
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
                <div className="min-w-0">
                  <span className="font-semibold truncate block">{p.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-gray-400">
                    {p.role === 'owner' ? 'Pemilik' : 'Anggota'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            </button>
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
