import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, BarChart3, ChevronRight, Globe, RefreshCw, Search, Target, X, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

type Props = {
  error: string | null;
  setError: (v: string | null) => void;
  user: any;
  handleLogin: () => void;
  isLoggingIn: boolean;
  handleConnect: () => void;
  isConnecting: boolean;
};

// Ikon Google 'G' gaya resmi — varian tunggal (solid putih) agar terbaca di atas tombol
function GoogleGIconWhite({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFFFFF" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z" />
    </svg>
  );
}

const FEATURES = [
  { icon: BarChart3, title: 'Visual Analytics', desc: 'Grafik interaktif klik, impresi, dan CTR dalam sekali lihat.', color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: Target, title: 'Opportunity Finder', desc: 'Temukan halaman berimpresi tinggi tapi CTR rendah — potensi naik peringkat.', color: 'text-rose-500', bg: 'bg-rose-50' },
  { icon: Globe, title: 'Global Reach', desc: 'Analisa performa berdasarkan negara dan jenis perangkat.', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { icon: Zap, title: 'Audit Konten', desc: 'Audit isi halaman secara otomatis: apa yang kurang, apa yang perlu diperkuat.', color: 'text-amber-500', bg: 'bg-amber-50' },
  { icon: Search, title: 'Data Search Console', desc: 'Ambil data asli langsung dari Google Search Console milikmu.', color: 'text-violet-500', bg: 'bg-violet-50' },
  { icon: ChevronRight, title: 'Siap Pakai', desc: 'Login, hubungkan Google, pilih property — selesai. Tanpa setup rumit.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
];

export default function LoginScreen({ error, setError, user, handleLogin, isLoggingIn, handleConnect, isConnecting }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* ==== NAVBAR ==== */}
      <header className="w-full border-b border-gray-200/70 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center">
              <Search className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Razeo</span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-gray-500">
            <a href="#fitur" className="hover:text-emerald-600 transition-colors">Fitur</a>
            <a href="#cara" className="hover:text-emerald-600 transition-colors">Cara Kerja</a>
            <a href="#mulai" className="text-emerald-600 font-semibold">Mulai</a>
          </nav>
          <button
            onClick={!user ? handleLogin : handleConnect}
            disabled={isLoggingIn || isConnecting}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            {!user ? <GoogleGIconWhite className="w-4 h-4" /> : null}
            {isLoggingIn || isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            {!user ? 'Login' : 'Connect'}
          </button>
        </div>
      </header>

      {error && (
        <div className="max-w-2xl w-full mx-auto mt-6 px-6">
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

      {/* ==== HERO ==== */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* dekorasi gradien */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[42rem] h-[42rem] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute top-40 -right-24 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div className="mx-auto max-w-6xl px-6 pt-20 pb-24 text-center relative">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-emerald-200 text-emerald-700 text-xs font-semibold tracking-wide shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SEO Content Audit untuk Google Search Console & GA4
              </span>

              <h1 className="mt-6 text-5xl md:text-7xl font-extrabold tracking-tighter leading-[1.05] bg-gradient-to-b from-gray-900 to-gray-500 bg-clip-text text-transparent">
                Audit Konten SEO<br className="hidden md:block" /> dalam Hitungan Menit
              </h1>

              <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                Hubungkan Google Search Console-mu, lalu lihat performa, peluang, dan audit isi halaman
                dalam satu dashboard yang rapi. Tanpa spreadsheet, tanpa ribet.
              </p>

              {/* CTA utama */}
              <div id="mulai" className="mt-10 flex flex-col items-center gap-4">
                {!user ? (
                  <button
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className="group inline-flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white text-lg font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-600/25 disabled:opacity-60 disabled:scale-100"
                  >
                    {isLoggingIn ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <GoogleGIconWhite className="w-6 h-6" />
                        <span>Login dengan Google</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="group inline-flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white text-lg font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-600/25 disabled:opacity-60 disabled:scale-100"
                  >
                    {isConnecting ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Menghubungkan...</span>
                      </>
                    ) : (
                      <>
                        <GoogleGIconWhite className="w-6 h-6" />
                        <span>Hubungkan Search Console</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                )}
                <p className="text-xs text-gray-400">Gratis dipakai · Data hanya dibaca (read-only) · Bisa dicabut kapan saja</p>
              </div>

              {/* preview/dashboard mock */}
              <div className="mt-14 max-w-4xl mx-auto">
                <div className="rounded-2xl bg-white border border-gray-200 shadow-2xl shadow-gray-300/50 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-4 h-9 bg-gray-100 border-b border-gray-200">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="ml-3 text-[11px] text-gray-400 font-mono">razeo.vercel.app</span>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-gray-100">
                    {[
                      ['Klik 30 hari', '12.4rb', 'text-emerald-600'],
                      ['CTR rata-rata', '4,8%', 'text-blue-600'],
                      ['Posisi rata-rata', '8,2', 'text-amber-600'],
                    ].map(([label, val, cls], i) => (
                      <div key={i} className="p-5 text-left">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{label}</p>
                        <p className={cn('text-2xl font-extrabold mt-1', cls)}>{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="h-24 bg-gradient-to-r from-emerald-50 via-blue-50 to-emerald-50 border-t border-gray-100 flex items-end gap-1.5 px-5 pb-4">
                    {[38, 55, 42, 68, 60, 82, 74, 95, 70, 88, 99, 84].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t bg-emerald-500/70" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ==== FITUR ==== */}
        <section id="fitur" className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Semua yang Kamu Butuhkan</h2>
            <p className="mt-3 text-gray-500">Satu tempat untuk memantau dan memperbaiki SEO websitemu.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-4', f.bg)}>
                  <f.icon className={cn('w-6 h-6', f.color)} />
                </div>
                <h3 className="font-semibold text-gray-900">{f.title}</h3>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ==== CARA KERJA ==== */}
        <section id="cara" className="bg-white border-y border-gray-200">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tiga Langkah, Selesai</h2>
              <p className="mt-3 text-gray-500">Rata-rata kurang dari 2 menit untuk mulai melihat data.</p>
            </div>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                ['1', 'Login Google', 'Satu klik. Kami hanya meminta izin baca (read-only) — tidak pernah mengubah apa pun di akunmu.'],
                ['2', 'Hubungkan Website', 'Pilih website (Search Console) dan property GA4 (akun analisa Google Analytics) yang mau dipantau project ini.'],
                ['3', 'Mulai Audit', 'Halaman analisa (dashboard) langsung menampilkan tren, peluang, dan hasil audit konten halaman.'],
              ].map(([no, title, desc], i) => (
                <div key={i} className="relative">
                  <div className="w-11 h-11 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-lg shadow-lg shadow-emerald-600/25">
                    {no}
                  </div>
                  <h3 className="mt-4 font-semibold text-lg">{title}</h3>
                  <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==== PENUTUP ==== */}
        <section className="mx-auto max-w-6xl px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Siap Menaikkan Peringkatmu?</h2>
          <p className="mt-3 text-gray-500">Mulai gratis. Tidak perlu kartu kredit.</p>
          <button
            onClick={!user ? handleLogin : handleConnect}
            disabled={isLoggingIn || isConnecting}
            className="mt-8 inline-flex items-center gap-3 px-8 py-4 bg-emerald-600 text-white text-lg font-bold rounded-full transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-600/25 disabled:opacity-60 disabled:scale-100"
          >
            {isLoggingIn || isConnecting ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <GoogleGIconWhite className="w-6 h-6" />
            )}
            {!user ? 'Login dengan Google' : 'Lanjutkan ke Dashboard'}
          </button>
        </section>
      </main>

      {/* ==== FOOTER ==== */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Search className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-600">Razeo</span>
            <span>· SEO Content Audit</span>
          </div>
          <p>© {new Date().getFullYear()} Razeo · razeo.vercel.app</p>
        </div>
      </footer>
    </div>
  );
}