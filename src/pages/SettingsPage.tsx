import { motion } from 'framer-motion'
import { Settings, Globe, UserPlus, X, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'

interface Props {
  activeProjectId: any
  enterProject: any
  evCfg: any
  handleOpenInvite: any
  panel_title: any
  projects: any
  saveEv: any
  selectedSite: any
  setActiveProjectId: any
  setViewState: any
}

export default function SettingsPage({ activeProjectId, enterProject, evCfg, handleOpenInvite, panel_title, projects, saveEv, selectedSite, setActiveProjectId, setViewState }: Props) {
  return (
    <motion.div
      key="pengaturan"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="max-w-2xl mx-auto space-y-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-gray-500" />
            Pengaturan
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">Project, properti, anggota, dan nama event</p>
        </div>
      </div>

      {/* kartu anggota project */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <span className={panel_title}>Anggota</span>
        <p className="text-xs text-gray-400 mb-3 mt-1">Bagikan tautan undangan untuk mengajak orang lain masuk ke project ini.</p>
        <button
          onClick={handleOpenInvite}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-bold text-emerald-700 hover:bg-emerald-100 transition-colors text-left"
          title="Undang anggota ke project"
        >
          <UserPlus className="w-4 h-4" />
          Undang Anggota
        </button>
      </div>

      {/* kartu: project, properti, event (pindahan dari sidebar) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <span className={panel_title}>Project & Properti</span>
        <div className="space-y-3 pt-1">
        {/* Pengaturan nama event (scroll/CTA) — tampil langsung, tanpa popup */}
        <div className="relative rounded-xl border border-gray-200 p-4 space-y-3 pt-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-gray-500" />
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">Pengaturan Event</span>
          </div>
          <span className="block text-[11px] font-black uppercase tracking-wider text-gray-400 pt-1">Nama Event Scroll</span>
          {(['scroll25', 'scroll50', 'scroll75'] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 text-xs font-bold text-gray-500">
              {k.replace('scroll', 'Scroll ')}%
              <input
                value={evCfg[k]}
                onChange={(e) => saveEv({ ...evCfg, [k]: e.target.value.trim() })}
                className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </label>
          ))}
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <span className="block text-[11px] font-black uppercase tracking-wider text-gray-400">Event CTA (boleh lebih dari satu)</span>
            {evCfg.ctas.map((ev: string, i: number) => (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  value={ev}
                  onChange={(e) => saveEv({ ...evCfg, ctas: evCfg.ctas.map((x: string, j: number) => (j === i ? e.target.value.trim() : x)) })}
                  className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => saveEv({ ...evCfg, ctas: evCfg.ctas.filter((_: string, j: number) => j !== i) })}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  title="Hapus event"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => saveEv({ ...evCfg, ctas: [...evCfg.ctas, ''] })}
              className="w-full py-2 border border-dashed border-emerald-300 text-emerald-700 text-xs font-bold rounded-lg hover:bg-emerald-50 transition-colors"
            >
              + Tambah Event CTA
            </button>
          </div>
          <p className="text-[10px] text-gray-400">Simpan otomatis — tab Optimasi & Cek langsung memakainya.</p>
        </div>

          {/* Anggota project — pindahan dari sidebar proyek (tab Optimasi) */}
          <button
            onClick={handleOpenInvite}
            className="mt-2 w-full flex items-center gap-2.5 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors text-left"
            title="Undang anggota ke project"
          >
            Anggota
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      </div>


    </motion.div>
  )
}
