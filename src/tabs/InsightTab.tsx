import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Users, Search, RefreshCw, Tag, UserRoundCheck, UserPlus, UserRound, Link2 } from 'lucide-react';
import { cn } from '../lib/utils';

type Props = {
  loading: boolean;
  branded: { keywords: { query: string; impressions: number; clicks: number; ctr: number; position: number }[]; summary: { impressions: number; clicks: number; ctr: number } } | null;
  users: { totalUsers: number; newUsers: number; returningUsers: number; returningPct: number } | null;
  /** link masuk dari situs luar (GA4 pageReferrer) — { items: [{referrer, page, sessions}] } */
  backlinks?: { items: { referrer: string; page: string; sessions: number }[] } | null;
  error?: string | null;
  /** daftar keyword branded dari Pengaturan (Pengaturan Event) — dipakai tombol muat ulang */
  brandedKeywords?: string[];
  onRefresh?: () => void;
};

const fmt = (n: number) => Number(n || 0).toLocaleString('id-ID');
const pct = (n: number) => `${Number(n || 0).toFixed(1)}%`;
/** https://www.contoh.com/artikel/x -> contoh.com (untuk nama situs sumber) */
function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url.split('/')[0] || url; }
}


export default function InsightTab({ loading, branded, users, backlinks, error, brandedKeywords = [], onRefresh }: Props) {
  if (loading && !branded && !users) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-8 text-center text-gray-400 text-sm">Memuat insight...</div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">{error}</div>
      )}

      {/* ===== A. BRANDING — keyword branded: impresi / klik / CTR ===== */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <span className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-emerald-600" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-gray-900">Branding</h3>
            <p className="text-[11px] text-gray-400">
              Impresi, klik & CTR keyword branded — kelola daftarnya di <b className="text-gray-500">Pengaturan &rarr; Pengaturan Event</b>
            </p>
          </div>
          <span className="ml-auto inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-bold">
            {(branded?.keywords || []).length} Keyword
          </span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-300 transition-colors disabled:opacity-50"
              title="Muat ulang data insight"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          )}
        </div>

        {!branded || branded.keywords.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            <Tag className="w-6 h-6 mx-auto mb-2 text-gray-300" />
            {brandedKeywords.filter((k) => k.trim()).length === 0
              ? <>Belum ada keyword branded. Tambahkan di <b>Pengaturan &rarr; Pengaturan Event</b> lalu muat ulang.</>
              : <>Keyword sudah terdaftar ({brandedKeywords.filter((k) => k.trim()).length}) tapi belum ada datanya di rentang ini.</>}
          </div>
        ) : (
          <>
            {/* kartu ringkas branded */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 border-b border-gray-50">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">Impresi</div>
                <div className="text-2xl font-extrabold text-gray-900 mt-1">{fmt(branded.summary.impressions)}</div>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">Klik</div>
                <div className="text-2xl font-extrabold text-gray-900 mt-1">{fmt(branded.summary.clicks)}</div>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <div className="text-[11px] uppercase tracking-wide text-emerald-700 font-bold">CTR</div>
                <div className="text-2xl font-extrabold text-emerald-700 mt-1">{pct(branded.summary.ctr)}</div>
              </div>
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <div className="text-[11px] uppercase tracking-wide text-gray-400 font-bold">Rata posisi</div>
                <div className="text-2xl font-extrabold text-gray-900 mt-1">
                  {branded.keywords.length
                    ? (branded.keywords.reduce((s, k) => s + k.position, 0) / branded.keywords.length).toFixed(1)
                    : '—'}
                </div>
              </div>
            </div>

            {/* tabel per keyword */}
            <div className="overflow-x-auto">
              <table className="w-full text-left align-top" style={{ minWidth: 720 }}>
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {['Keyword Branded', 'Impresi', 'Klik', 'CTR', 'Posisi'].map((h) => (
                      <th key={h} className="px-5 py-2.5 text-[11px] uppercase tracking-wide font-medium text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {branded.keywords.map((k) => (
                    <tr key={k.query} className="hover:bg-gray-50/60">
                      <td className="px-5 py-2.5">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium break-words">{k.query}</span>
                      </td>
                      <td className="px-5 py-2.5 text-sm text-gray-700 tabular-nums">{fmt(k.impressions)}</td>
                      <td className="px-5 py-2.5 text-sm text-gray-700 tabular-nums">{fmt(k.clicks)}</td>
                      <td className="px-5 py-2.5 text-sm font-semibold tabular-nums">
                        <span className={cn(k.ctr >= 3 ? 'text-emerald-700' : k.ctr > 0 ? 'text-amber-600' : 'text-gray-400')}>
                          {pct(k.ctr)}
                        </span>
                      </td>
                      <td className="px-5 py-2.5 text-sm text-gray-600 tabular-nums">{k.position ? k.position.toFixed(1) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* ===== B. RETURNING USER ===== */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <span className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-blue-600" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-gray-900">Returning User</h3>
            <p className="text-[11px] text-gray-400">
              Rumus: <code className="bg-gray-100 px-1 rounded">Returning users / Total users × 100%</code>
            </p>
          </div>
        </div>

        {!users ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            <Users className="w-6 h-6 mx-auto mb-2 text-gray-300" />
            Data GA4 belum tersedia — pastikan property GA4 sudah dipilih & rentang tanggal sesuai.
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5">
            {/* gauge utama */}
            <div className="col-span-2 lg:col-span-1 rounded-xl border border-blue-100 bg-blue-50 p-4 flex flex-col justify-center">
              <div className="text-[11px] uppercase tracking-wide text-blue-700 font-bold">Returning</div>
              <div className="text-4xl font-black text-blue-700 mt-1">{pct(users.returningPct)}</div>
              <div className="mt-3 w-full h-2 rounded-full bg-blue-100 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, users.returningPct)}%` }} />
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gray-400 font-bold">
                <UserRoundCheck className="w-3.5 h-3.5" /> Returning
              </div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{fmt(users.returningUsers)}</div>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gray-400 font-bold">
                <UserPlus className="w-3.5 h-3.5" /> New
              </div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{fmt(users.newUsers)}</div>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
              <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-gray-400 font-bold">
                <UserRound className="w-3.5 h-3.5" /> Total
              </div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{fmt(users.totalUsers)}</div>
            </div>
          </div>
        )}
      </section>

      {/* ===== C. BACKLINK — link masuk dari situs luar ===== */}
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <span className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
            <Link2 className="w-4 h-4 text-violet-600" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-gray-900">Backlink</h3>
            <p className="text-[11px] text-gray-400">
              Halaman luar tempat link menuju web ini &rarr; halaman web yang di tuju
              <span className="text-gray-300"> (dihitung dari kunjungan nyata via GA4)</span>
            </p>
          </div>
          <span className="ml-auto inline-block px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-[11px] font-bold">
            {(backlinks?.items || []).length} Ditemukan
          </span>
        </div>

        {!backlinks || !backlinks.items || backlinks.items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">
            <Link2 className="w-6 h-6 mx-auto mb-2 text-gray-300" />
            {users === null
              ? <>Belum ada data — pastikan property GA4 sudah dipilih & rentang tanggal sesuai.</>
              : <>Belum ada link masuk yang tercatat di rentang tanggal ini.</>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left align-top" style={{ minWidth: 720 }}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  {['Situs Asal', 'URL Mention', 'Tujuan di Web', 'Kunjungan'].map((h) => (
                    <th key={h} className="px-5 py-2.5 text-[11px] uppercase tracking-wide font-medium text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {backlinks.items.map((b) => (
                  <tr key={b.referrer + '|' + b.page} className="hover:bg-gray-50/60">
                    <td className="px-5 py-2.5">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 text-xs font-semibold">{hostOf(b.referrer)}</span>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-gray-600 break-all max-w-[320px]">
                      <a href={b.referrer} target="_blank" rel="noreferrer nofollow" className="hover:text-violet-700 hover:underline">{b.referrer}</a>
                    </td>
                    <td className="px-5 py-2.5 text-xs text-gray-700 break-all max-w-[280px]">
                      {b.page.startsWith('http') ? (
                        <a href={b.page} target="_blank" rel="noreferrer" className="hover:text-violet-700 hover:underline">{b.page}</a>
                      ) : (
                        /* jalur relatif: arah tujuan jelas, tapi domain asli tak dikirim GA4 */
                        <span title="Halaman di web ini">{b.page}</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-sm text-gray-700 tabular-nums">{fmt(b.sessions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* sumber data */}
      <p className="text-[11px] text-gray-400 flex flex-wrap items-center gap-x-4">
        <span>Branding → Search Console, keyword dari Pengaturan &rarr; Pengaturan Event</span>
        <span className="text-gray-300">|</span>
        <span>Returning User &rarr; GA4 (returningUsers; fallback kalau ditolak: activeUsers - newUsers)</span>
        <span className="text-gray-300">|</span>
        <span>Backlink &rarr; GA4 pageReferrer (halaman luar &rarr; halaman web)</span>
      </p>
    </motion.div>
  );
}