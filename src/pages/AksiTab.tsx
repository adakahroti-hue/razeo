import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Trash2, Globe, History } from 'lucide-react'
import { cn } from '../lib/utils'

// ==== Tab Aksi (tracker log SEO) + modal tambah log — pindahan dari App.tsx, JSX identik ====

interface PropsLog {
  filteredLogs: any
  logFilterMonth: any
  handleDeleteLog: any
  setIsAddingLog: any
  setSelectedAspects: any
  exportLogsToCSV: any
  exportLogsToPDF: any
}

interface PropsModal {
  isAddingLog: any
  selectedAspects: any
  setIsAddingLog: any
  setSelectedAspects: any
  handleAddLog: any
  data: any
}

export default function AksiTab({
  filteredLogs, logFilterMonth, handleDeleteLog, setIsAddingLog, setSelectedAspects,
  exportLogsToCSV, exportLogsToPDF,
}: PropsLog) {
  return (
    <motion.div
            key="tracker"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Input Baru - tombol melayang kanan bawah */}
            <button
              onClick={() => {
                setSelectedAspects([]);
                setIsAddingLog(true);
              }}
              className="fixed bottom-10 right-10 z-[70] bg-emerald-600 text-white w-14 h-14 rounded-full flex items-center justify-center hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/30"
              title="Input Baru"
              aria-label="Input Baru"
            >
              <Plus className="w-6 h-6" />
            </button>


            {/* Logs Table */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Tanggal</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">URL Target</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Aspek</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Query</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Detail</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLogs.length > 0 ? (
                      filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900">{new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                              <span className="text-[10px] text-gray-400 font-medium">{new Date(log.date).getFullYear()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 max-w-[200px]">
                              <Globe className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="text-xs font-medium text-gray-700 truncate" title={log.url}>{log.url}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {log.aspect.map((a: string, idx: number) => (
                                <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-100">
                                  {a}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-gray-600 line-clamp-2">{log.queries}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-gray-300 uppercase w-10">Sebelum</span>
                                <span className="text-[11px] text-gray-500 line-clamp-2 whitespace-pre-line leading-relaxed">{log.before}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-emerald-400 uppercase w-10">Sesudah</span>
                                <span className="text-[11px] text-gray-700 font-medium line-clamp-2 whitespace-pre-line leading-relaxed">{log.after}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => handleDeleteLog(log.id)}
                              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                              <History className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-400 font-medium">Tidak ada log ditemukan untuk periode ini.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
    </motion.div>
  )
}

export function AksiAddLogModal({
  isAddingLog, selectedAspects, setIsAddingLog, setSelectedAspects, handleAddLog, data,
}: PropsModal) {
  return (
      <AnimatePresence>
        {isAddingLog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingLog(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Plus className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Input Aksi SEO</h3>
                    <p className="text-xs text-gray-500">Dokumentasikan detail optimasi Anda.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddingLog(false)}
                  className="p-2 hover:bg-gray-200 rounded-xl transition-colors text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddLog} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">URL Target</label>
                    <input 
                      name="url"
                      required
                      list="gsc-urls"
                      placeholder="https://example.com/page"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <datalist id="gsc-urls">
                      {Array.from(new Set(data.map(d => d.keys[1]).filter(Boolean))).map((url, idx) => (
                        <option key={idx} value={url} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Tanggal Perubahan</label>
                    <input 
                      name="date"
                      type="date"
                      required
                      defaultValue={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Aspek yang Diubah</label>
                  <div className="flex flex-wrap gap-3">
                    {['Judul (Title)', 'Deskripsi (Meta)', 'H1-H6', 'Content Body', 'Internal Link', 'Penambahan Query', 'Technical', 'Lainnya'].map(aspect => (
                      <label key={aspect} className="flex items-center gap-2 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          name="aspect" 
                          value={aspect} 
                          className="hidden peer"
                          checked={selectedAspects.includes(aspect)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAspects([...selectedAspects, aspect]);
                            } else {
                              setSelectedAspects(selectedAspects.filter(a => a !== aspect));
                            }
                          }}
                        />
                        <div className="px-3 py-1.5 rounded-lg border border-gray-100 bg-gray-50 text-xs font-bold text-gray-500 peer-checked:bg-emerald-600 peer-checked:text-white peer-checked:border-emerald-600 transition-all group-hover:border-emerald-200">
                          {aspect}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedAspects.includes('Penambahan Query') && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Target Query</label>
                    <textarea 
                      name="queries"
                      placeholder="Daftar query yang ditargetkan oleh perubahan ini..."
                      rows={2}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                    />
                  </div>
                )}

                {selectedAspects.length > 0 ? (
                  <div className="space-y-6 border-t border-gray-100 pt-6">
                    {selectedAspects.map(aspect => (
                      <div key={aspect} className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                          <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">{aspect}</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Sebelum</label>
                            <textarea 
                              name={`before_${aspect}`}
                              required
                              placeholder={`Kondisi ${aspect} sebelumnya...`}
                              rows={3}
                              className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Sesudah</label>
                            <textarea 
                              name={`after_${aspect}`}
                              required
                              placeholder={`Kondisi ${aspect} sesudah...`}
                              rows={3}
                              className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400 font-medium">Pilih aspek yang diubah untuk mengisi detail kondisi.</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Catatan Kontekstual (Opsional)</label>
                  <textarea 
                    name="note"
                    placeholder="Mengapa perubahan ini dilakukan? Ada konteks khusus?"
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                  />
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <button 
                    type="submit"
                    className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                  >
                    Simpan Log SEO
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsAddingLog(false)}
                    className="px-8 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
  )
}
