import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, Download, ExternalLink, FileDown, Filter, Search, TrendingUp } from 'lucide-react'
import React from 'react'
import { cn } from '../lib/utils'

// ==== Tab Optimasi (dashboard/audit) — pindahan dari App.tsx, JSX identik ====

interface Props {
  AUDIT_TABS: any
  Ga4EventBreakdown: any
  auditRows: any
  auditTab: any
  ctaEvKeys: any
  ctaSort: any
  ctaSubTab: any
  ctaTotal: any
  ctrStats: any
  data: any
  downloadAiPDF: any
  downloadAllPositionsCsv: any
  downloadConsolidationPDF: any
  downloadCtaPDF: any
  downloadEnrichmentPDF: any
  downloadErPDF: any
  downloadLHFPDF: any
  downloadPositionPdf: any
  downloadScrollPDF: any
  downloadZeroPDF: any
  enrichmentSort: any
  erSort: any
  erSubTab: any
  error: any
  evKey: any
  auditRole: any
  expandedAiPage: any
  expandedConsolidationQuery: any
  expandedDecliningPage: any
  expandedEnrichmentPage: any
  expandedErPage: any
  expandedLhfPage: any
  expandedScrollPage: any
  expandedZeroPage: any
  getGa4StatsForPage: any
  getSlug: any
  lhfSort: any
  scrollSort: any
  selectedCtaPages: any
  selectedCtrPage: any
  selectedCtrPosition: any
  selectedErPages: any
  selectedScrollPages: any
  setAuditTab: any
  setCtaSort: any
  setCtaSubTab: any
  setEnrichmentSort: any
  setErSort: any
  setErSubTab: any
  setAuditRole: any
  AUDIT_ROLES: any
  setExpandedAiPage: any
  setExpandedConsolidationQuery: any
  setExpandedDecliningPage: any
  setExpandedEnrichmentPage: any
  setExpandedErPage: any
  setExpandedLhfPage: any
  setExpandedScrollPage: any
  setExpandedZeroPage: any
  setLhfSort: any
  setScrollSort: any
  setSelectedCtaPages: any
  setSelectedCtrPage: any
  setSelectedCtrPosition: any
  setSelectedErPages: any
  setSelectedScrollPages: any
}

export default function DashboardTab({
  AUDIT_TABS,
  Ga4EventBreakdown,
  auditRows,
  auditTab,
  ctaEvKeys,
  ctaSort,
  ctaSubTab,
  ctaTotal,
  ctrStats,
  data,
  downloadAiPDF,
  downloadAllPositionsCsv,
  downloadConsolidationPDF,
  downloadCtaPDF,
  downloadEnrichmentPDF,
  downloadErPDF,
  downloadLHFPDF,
  downloadPositionPdf,
  downloadScrollPDF,
  downloadZeroPDF,
  enrichmentSort,
  erSort,
  erSubTab,
  error,
  evKey,
  auditRole,
  AUDIT_ROLES,
  expandedAiPage,
  expandedConsolidationQuery,
  expandedDecliningPage,
  expandedEnrichmentPage,
  expandedErPage,
  expandedLhfPage,
  expandedScrollPage,
  expandedZeroPage,
  getGa4StatsForPage,
  getSlug,
  lhfSort,
  scrollSort,
  selectedCtaPages,
  selectedCtrPage,
  selectedCtrPosition,
  selectedErPages,
  selectedScrollPages,
  setAuditTab,
  setCtaSort,
  setCtaSubTab,
  setEnrichmentSort,
  setErSort,
  setErSubTab,
  setAuditRole,
  setExpandedAiPage,
  setExpandedConsolidationQuery,
  setExpandedDecliningPage,
  setExpandedEnrichmentPage,
  setExpandedErPage,
  setExpandedLhfPage,
  setExpandedScrollPage,
  setExpandedZeroPage,
  setLhfSort,
  setScrollSort,
  setSelectedCtaPages,
  setSelectedCtrPage,
  setSelectedCtrPosition,
  setSelectedErPages,
  setSelectedScrollPages,
}: Props) {
  // aturan role (sama dgn App): inspire/educate hanya non-produk, convert hanya /produk/, inspect semua
  const inRole = (page: string): boolean => {
    const isProduk = page.includes('/produk/');
    if (auditRole === 'inspire' || auditRole === 'educate') return !isProduk;
    if (auditRole === 'convert') return isProduk;
    return true;
  };
  // badge NEW pada label sub tab — ringkas saja
  const stripNew = (label: string) => label.replace(/\s*NEW\b/i, '');
  return (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}


              {/* ===== FILTER ROLE: kategori audit per peran (inspire/educate/convert) ===== */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-gray-400">
                  <Filter className="w-3.5 h-3.5" /> Role:
                </span>
                {AUDIT_ROLES.map((r: any) => {
                  const on = auditRole === r.id;
                return (
                    <button
                      key={r.id}
                      onClick={() => setAuditRole(r.id)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border",
                        on
                          ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/25"
                          : "bg-white border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700"
                      )}
                    >
                      {r.label}
                    </button>
                  );
                })}
                <span className={cn(
                  "ml-auto text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full",
                  auditRole === 'inspect' ? "bg-gray-100 text-gray-400" : "bg-emerald-50 text-emerald-600"
                )}>
                  {auditRole === 'convert'
                    ? "Hanya halaman produk"
                    : auditRole === 'inspect' ? "Semua halaman" : "Tanpa halaman produk"}
                </span>
              </div>

              {/* ===== PEMILIH MODUL: horizontal di atas (bukan sidebar lagi) ===== */}
              <div className="flex gap-1.5 flex-wrap mb-6 p-1.5 bg-white border border-gray-200 rounded-2xl overflow-x-auto">
                {AUDIT_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setAuditTab(tab.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                      auditTab === tab.id
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <tab.icon className={cn("w-3.5 h-3.5 shrink-0", auditTab === tab.id ? "text-white" : "text-gray-400")} />
                    {stripNew(tab.label)}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-6 items-start">

                <div className="flex-1 min-w-0 w-full">
        {/* Audit Table */}
        <div className="rounded-3xl bg-white border border-gray-200 shadow-sm overflow-hidden">

          <div className="flex flex-col lg:flex-row">
            {/* Content Area */}
            <div className="flex-1 min-w-0">
              {auditTab === 'ctr' ? (
            <div className="space-y-8">
              <div className="px-8 pt-6 flex items-center justify-between bg-gray-50/30 border-b border-gray-100 pb-6">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Filters:</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
                    {auditRole === 'inspect' ? "All Pages" : "Role Filter"}
                  </div>
                  <button
                    onClick={downloadAllPositionsCsv}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    Download All URLs (Pos 1-10)
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Position</th>
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Avg. CTR</th>
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Avg. Clicks</th>
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Avg. Impressions</th>
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Total Queries</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ctrStats.map((stat) => (
                      <React.Fragment key={stat.position}>
                        <tr 
                          onClick={() => setSelectedCtrPosition(selectedCtrPosition === stat.position ? null : stat.position)}
                          className={cn(
                            "hover:bg-gray-50 transition-colors group cursor-pointer",
                            selectedCtrPosition === stat.position && "bg-emerald-50 border-l-4 border-emerald-600"
                          )}
                        >
                          <td className="px-8 py-4">
                            <span className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors",
                              selectedCtrPosition === stat.position ? "bg-emerald-600 text-white" : "bg-gray-100 text-emerald-600"
                            )}>
                              {stat.position}
                            </span>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-gray-700">{stat.avgCtr.toFixed(2)}%</span>
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500" 
                                  style={{ width: `${Math.min(stat.avgCtr * 2, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-sm font-medium text-gray-600">{stat.avgClicks.toFixed(1)}</td>
                          <td className="px-8 py-4 text-sm font-medium text-gray-600">{stat.avgImpressions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="px-8 py-4 text-sm font-medium text-gray-600">{stat.totalQueries}</td>
                        </tr>
                        <AnimatePresence>
                          {selectedCtrPosition === stat.position && (
                            <tr>
                              <td colSpan={5} className="p-0 border-b border-gray-100 bg-gray-50/30">
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.3, ease: "easeInOut" }}
                                  className="overflow-hidden"
                                >
                                  <div className="p-8">
                                    <div className="mb-6 flex items-center justify-between">
                                      <div>
                                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                                          <TrendingUp className="w-5 h-5 text-rose-500" />
                                          Underperforming Pages (Position {stat.position})
                                        </h3>
                                        <p className="text-sm text-gray-500 mt-1">
                                          Pages at position {stat.position} with CTR below the average of {stat.avgCtr.toFixed(2)}%
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => downloadPositionPdf(stat.position, stat.avgCtr)}
                                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                                      >
                                        <FileDown className="w-4 h-4" />
                                        Download PDF
                                      </button>
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                      <table className="w-full text-left border-collapse">
                                        <thead>
                                          <tr className="border-b border-gray-100 bg-gray-50/50">
                                            <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Query / Page</th>
                                            <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Queries</th>
                                            <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">CTR</th>
                                            <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Clicks</th>
                                            <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 text-right">Impressions</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                          {(() => {
                                            const avgCtr = stat.avgCtr;
                                            const pageGroups = new Map<string, { clicks: number, impressions: number, topQuery: string, maxQueryImpressions: number, queryCount: number }>();
                                            
                                            data.forEach(row => {
                                              const page = row.keys[1] || '';
                                              if (!inRole(page)) return;
                                              
                                              const pos = Math.round(row.position);
                                              if (pos !== stat.position) return;
                                              
                                              if (!pageGroups.has(page)) {
                                                pageGroups.set(page, { 
                                                  clicks: row.clicks, 
                                                  impressions: row.impressions, 
                                                  topQuery: row.keys[0], 
                                                  maxQueryImpressions: row.impressions,
                                                  queryCount: 1
                                                });
                                              } else {
                                                const group = pageGroups.get(page)!;
                                                group.clicks += row.clicks;
                                                group.impressions += row.impressions;
                                                group.queryCount += 1;
                                                if (row.impressions > group.maxQueryImpressions) {
                                                  group.topQuery = row.keys[0];
                                                  group.maxQueryImpressions = row.impressions;
                                                }
                                              }
                                            });

                                            const results = Array.from(pageGroups.entries())
                                              .map(([page, stats]) => ({
                                                page,
                                                ...stats,
                                                ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0
                                              }))
                                              .filter(p => p.ctr < avgCtr)
                                              .sort((a, b) => b.impressions - a.impressions)
                                              .slice(0, 50);

                                            if (results.length === 0) {
                                              return (
                                                <tr>
                                                  <td colSpan={5} className="px-8 py-12 text-center text-gray-400 italic">
                                                    No underperforming pages found for this position.
                                                  </td>
                                                </tr>
                                              );
                                            }

                                            return results.map((row, idx) => (
                                              <React.Fragment key={idx}>
                                                <tr 
                                                  onClick={() => setSelectedCtrPage(selectedCtrPage === row.page ? null : row.page)}
                                                  className={cn(
                                                    "hover:bg-gray-50 transition-colors group cursor-pointer",
                                                    selectedCtrPage === row.page && "bg-rose-50/50"
                                                  )}
                                                >
                                                  <td className="px-8 py-4 max-w-md">
                                                    <div className="flex flex-col gap-1">
                                                      <span className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors flex items-center gap-2">
                                                        <ExternalLink className="w-3 h-3 text-gray-400" />
                                                        {getSlug(row.page)}
                                                      </span>
                                                      <span className="text-[10px] text-gray-400 truncate">
                                                        Top Query: {row.topQuery}
                                                      </span>
                                                    </div>
                                                  </td>
                                                  <td className="px-8 py-4 text-right text-sm font-medium text-gray-600">
                                                    {row.queryCount}
                                                  </td>
                                                  <td className="px-8 py-4 text-right">
                                                    <span className="text-sm font-bold text-rose-500">
                                                      {row.ctr.toFixed(2)}%
                                                    </span>
                                                  </td>
                                                  <td className="px-8 py-4 text-sm font-medium text-gray-600 text-right">{row.clicks.toLocaleString()}</td>
                                                  <td className="px-8 py-4 text-sm font-medium text-gray-400 text-right">{row.impressions.toLocaleString()}</td>
                                                </tr>
                                                <AnimatePresence>
                                                  {selectedCtrPage === row.page && (
                                                    <tr>
                                                      <td colSpan={5} className="p-0 bg-gray-50/50 border-b border-gray-100">
                                                        <motion.div
                                                          initial={{ height: 0, opacity: 0 }}
                                                          animate={{ height: "auto", opacity: 1 }}
                                                          exit={{ height: 0, opacity: 0 }}
                                                          className="overflow-hidden"
                                                        >
                                                          <div className="p-6">
                                                            <div className="mb-4">
                                                              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                                                <Search className="w-4 h-4 text-emerald-500" />
                                                                Underperforming Queries for this Page (Position {stat.position})
                                                              </h4>
                                                              <p className="text-[10px] text-gray-500 mt-0.5">
                                                                Queries with CTR below {avgCtr.toFixed(2)}%
                                                              </p>
                                                            </div>
                                                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                                              <table className="w-full text-left border-collapse">
                                                                <thead>
                                                                  <tr className="border-b border-gray-100 bg-gray-50/50">
                                                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">Query</th>
                                                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">CTR</th>
                                                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Clicks</th>
                                                                    <th className="px-6 py-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right">Impressions</th>
                                                                  </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100">
                                                                  {data
                                                                    .filter(d => 
                                                                      d.keys[1] === row.page && 
                                                                      Math.round(d.position) === stat.position &&
                                                                      (d.clicks / d.impressions) * 100 < avgCtr
                                                                    )
                                                                    .sort((a, b) => b.impressions - a.impressions)
                                                                    .map((q, qIdx) => (
                                                                      <tr key={qIdx} className="hover:bg-gray-50 transition-colors">
                                                                        <td className="px-6 py-3 text-xs font-medium text-gray-700">{q.keys[0]}</td>
                                                                        <td className="px-6 py-3 text-right">
                                                                          <span className="text-xs font-bold text-rose-500">
                                                                            {((q.clicks / q.impressions) * 100).toFixed(2)}%
                                                                          </span>
                                                                        </td>
                                                                        <td className="px-6 py-3 text-right text-xs text-gray-600">{q.clicks.toLocaleString()}</td>
                                                                        <td className="px-6 py-3 text-right text-xs text-gray-400">{q.impressions.toLocaleString()}</td>
                                                                      </tr>
                                                                    ))
                                                                  }
                                                                </tbody>
                                                              </table>
                                                            </div>
                                                          </div>
                                                        </motion.div>
                                                      </td>
                                                    </tr>
                                                  )}
                                                </AnimatePresence>
                                              </React.Fragment>
                                            ));
                                          })()}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {(auditTab === 'lhf' || auditTab === 'declining' || auditTab === 'zero' || auditTab === 'enrichment' || auditTab === 'ai' || auditTab === 'consolidation' || auditTab === 'scroll' || auditTab === 'er' || auditTab === 'cta') && (
                <div className="px-8 pt-6 flex items-center justify-between bg-gray-50/30 border-b border-gray-100 pb-6">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                      <Filter className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Filters:</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">
                      {auditRole === 'inspect' ? "All Pages" : "Role Filter"}
                    </div>
                    {auditTab === 'enrichment' && (
                      <button
                        onClick={() => downloadEnrichmentPDF(auditRows)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                      >
                        <FileDown className="w-4 h-4" />
                        Download PDF
                      </button>
                    )}
                    {auditTab === 'lhf' && (
                      <button
                        onClick={() => downloadLHFPDF(auditRows)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                      >
                        <FileDown className="w-4 h-4" />
                        Download PDF
                      </button>
                    )}
                    {auditTab === 'ai' && (
                      <button
                        onClick={() => downloadAiPDF(auditRows)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                      >
                        <FileDown className="w-4 h-4" />
                        Download PDF
                      </button>
                    )}
                    {auditTab === 'zero' && (
                      <button
                        onClick={() => downloadZeroPDF(auditRows)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                      >
                        <FileDown className="w-4 h-4" />
                        Download PDF
                      </button>
                    )}
                    {auditTab === 'consolidation' && (
                      <button
                        onClick={() => downloadConsolidationPDF(auditRows)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                      >
                        <FileDown className="w-4 h-4" />
                        Download PDF
                      </button>
                    )}
                    {auditTab === 'scroll' && (
                      <button
                        onClick={() => downloadScrollPDF(auditRows)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                      >
                        <FileDown className="w-4 h-4" />
                        {selectedScrollPages.size > 0 ? `Export Selected (${selectedScrollPages.size})` : 'Download PDF'}
                      </button>
                    )}
                    {auditTab === 'er' && (
                      <button
                        onClick={() => downloadErPDF(auditRows)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                      >
                        <FileDown className="w-4 h-4" />
                        {selectedErPages.size > 0 ? `Export Selected (${selectedErPages.size})` : 'Download PDF'}
                      </button>
                    )}
                    {auditTab === 'cta' && (
                      <button
                        onClick={() => downloadCtaPDF(auditRows)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md active:scale-95"
                      >
                        <FileDown className="w-4 h-4" />
                        {selectedCtaPages.size > 0 ? `Export Selected (${selectedCtaPages.size})` : 'Download PDF'}
                      </button>
                    )}
                  </div>
                  {auditTab === 'er' && (
                    <div className="px-8 py-4 bg-gray-50/30 border-b border-gray-100 flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-xl w-fit">
                        <button
                          onClick={() => setErSubTab('article')}
                          className={cn(
                            "px-6 py-2 rounded-lg text-xs font-bold transition-all",
                            erSubTab === 'article' 
                              ? "bg-white text-emerald-600 shadow-sm" 
                              : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          Artikel Biasa (&lt; 50% ER)
                        </button>
                        <button
                          onClick={() => setErSubTab('product')}
                          className={cn(
                            "px-6 py-2 rounded-lg text-xs font-bold transition-all",
                            erSubTab === 'product' 
                              ? "bg-white text-emerald-600 shadow-sm" 
                              : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          Halaman Produk (&lt; 40% ER)
                        </button>
                      </div>
                    </div>
                  )}
                  {auditTab === 'cta' && (
                    <div className="px-8 py-4 bg-gray-50/30 border-b border-gray-100 flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-gray-100/50 p-1 rounded-xl w-fit">
                        <button
                          onClick={() => setCtaSubTab('article')}
                          className={cn(
                            "px-6 py-2 rounded-lg text-xs font-bold transition-all",
                            ctaSubTab === 'article' 
                              ? "bg-white text-emerald-600 shadow-sm" 
                              : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          Artikel Biasa
                        </button>
                        <button
                          onClick={() => setCtaSubTab('product')}
                          className={cn(
                            "px-6 py-2 rounded-lg text-xs font-bold transition-all",
                            ctaSubTab === 'product' 
                              ? "bg-white text-emerald-600 shadow-sm" 
                              : "text-gray-500 hover:text-gray-700"
                          )}
                        >
                          Halaman Artikel Produk
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {(auditTab === 'cta' || auditTab === 'scroll' || auditTab === 'er') && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400 w-10">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          checked={
                            auditRows.length > 0 && 
                            (auditTab === 'cta' ? selectedCtaPages.size === auditRows.length :
                             auditTab === 'scroll' ? selectedScrollPages.size === auditRows.length :
                             selectedErPages.size === auditRows.length)
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              const allIds = auditRows.map(r => r.keys[0]);
                              if (auditTab === 'cta') setSelectedCtaPages(new Set(allIds));
                              else if (auditTab === 'scroll') setSelectedScrollPages(new Set(allIds));
                              else setSelectedErPages(new Set(allIds));
                            } else {
                              if (auditTab === 'cta') setSelectedCtaPages(new Set());
                              else if (auditTab === 'scroll') setSelectedScrollPages(new Set());
                              else setSelectedErPages(new Set());
                            }
                          }}
                        />
                      </th>
                    )}
                    <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                      {auditTab === 'consolidation' ? 'Query' : (auditTab === 'lhf' || auditTab === 'declining' || auditTab === 'zero' || auditTab === 'enrichment' || auditTab === 'ai' || auditTab === 'scroll' || auditTab === 'er' || auditTab === 'cta') ? 'Page URL' : 'Query / Page'}
                    </th>
                    {(auditTab === 'scroll' || auditTab === 'er' || auditTab === 'cta') && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <div className="flex items-center gap-2">
                          Sessions
                          <button 
                            onClick={() => {
                              if (auditTab === 'scroll') {
                                setScrollSort({ col: 'sessions', order: scrollSort.col === 'sessions' && scrollSort.order === 'desc' ? 'asc' : 'desc' });
                              } else if (auditTab === 'er') {
                                setErSort({ col: 'sessions', order: erSort.col === 'sessions' && erSort.order === 'desc' ? 'asc' : 'desc' });
                              } else {
                                setCtaSort({ col: 'sessions', order: ctaSort.col === 'sessions' && ctaSort.order === 'desc' ? 'asc' : 'desc' });
                              }
                            }}
                            className={cn("p-1 rounded hover:bg-gray-200 transition-colors", (auditTab === 'scroll' ? scrollSort.col === 'sessions' : auditTab === 'er' ? erSort.col === 'sessions' : ctaSort.col === 'sessions') && "text-emerald-600 bg-emerald-50")}
                          >
                            <TrendingUp className={cn("w-3 h-3", (auditTab === 'scroll' ? (scrollSort.col === 'sessions' && scrollSort.order === 'asc') : auditTab === 'er' ? (erSort.col === 'sessions' && erSort.order === 'asc') : (ctaSort.col === 'sessions' && ctaSort.order === 'asc')) && "rotate-180")} />
                          </button>
                        </div>
                      </th>
                    )}
                    {auditTab === 'er' && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <div className="flex items-center gap-2">
                          Engagement Rate
                          <button 
                            onClick={() => setErSort({ col: 'er', order: erSort.col === 'er' && erSort.order === 'desc' ? 'asc' : 'desc' })}
                            className={cn("p-1 rounded hover:bg-gray-200 transition-colors", erSort.col === 'er' && "text-emerald-600 bg-emerald-50")}
                          >
                            <TrendingUp className={cn("w-3 h-3", erSort.col === 'er' && erSort.order === 'asc' && "rotate-180")} />
                          </button>
                        </div>
                      </th>
                    )}
                    {auditTab === 'cta' && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <div className="flex items-center gap-2">
                          CTA %
                          <button 
                            onClick={() => setCtaSort({ col: 'cta_total', order: ctaSort.col === 'cta_total' && ctaSort.order === 'desc' ? 'asc' : 'desc' })}
                            className={cn("p-1 rounded hover:bg-gray-300 transition-colors", ctaSort.col === 'cta_total' && "text-emerald-600 bg-emerald-50")}
                          >
                            <TrendingUp className={cn("w-3 h-3", ctaSort.col === 'cta_total' && ctaSort.order === 'asc' && "rotate-180")} />
                          </button>
                        </div>
                      </th>
                    )}
                    {auditTab !== 'er' && auditTab !== 'cta' && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <div className="flex items-center gap-2">
                          {auditTab === 'scroll' ? 'Scroll 25%' : (auditTab === 'lhf' || auditTab === 'declining' || auditTab === 'zero' || auditTab === 'enrichment' || auditTab === 'ai' || auditTab === 'consolidation') ? 'Avg. Clicks' : 'Clicks'}
                          {auditTab === 'scroll' && (
                            <button 
                              onClick={() => setScrollSort({ col: 'scroll_25', order: scrollSort.col === 'scroll_25' && scrollSort.order === 'desc' ? 'asc' : 'desc' })}
                              className={cn("p-1 rounded hover:bg-gray-200 transition-colors", scrollSort.col === 'scroll_25' && "text-emerald-600 bg-emerald-50")}
                            >
                              <TrendingUp className={cn("w-3 h-3", scrollSort.col === 'scroll_25' && scrollSort.order === 'asc' && "rotate-180")} />
                            </button>
                          )}
                          {auditTab === 'enrichment' && (
                            <button 
                              onClick={() => setEnrichmentSort({ col: 'clicks', order: enrichmentSort.col === 'clicks' && enrichmentSort.order === 'desc' ? 'asc' : 'desc' })}
                              className={cn("p-1 rounded hover:bg-gray-200 transition-colors", enrichmentSort.col === 'clicks' && "text-emerald-600 bg-emerald-50")}
                            >
                              <TrendingUp className={cn("w-3 h-3", enrichmentSort.col === 'clicks' && enrichmentSort.order === 'asc' && "rotate-180")} />
                            </button>
                          )}
                          {auditTab === 'lhf' && (
                            <button 
                              onClick={() => setLhfSort({ col: 'clicks', order: lhfSort.col === 'clicks' && lhfSort.order === 'desc' ? 'asc' : 'desc' })}
                              className={cn("p-1 rounded hover:bg-gray-200 transition-colors", lhfSort.col === 'clicks' && "text-emerald-600 bg-emerald-50")}
                            >
                              <TrendingUp className={cn("w-3 h-3", lhfSort.col === 'clicks' && lhfSort.order === 'asc' && "rotate-180")} />
                            </button>
                          )}
                        </div>
                      </th>
                    )}
                    {auditTab !== 'er' && auditTab !== 'cta' && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <div className="flex items-center gap-2">
                          {auditTab === 'scroll' ? 'Scroll 50%' : (auditTab === 'lhf' || auditTab === 'declining' || auditTab === 'zero' || auditTab === 'enrichment' || auditTab === 'ai' || auditTab === 'consolidation') ? 'Avg. Impressions' : 'Impressions'}
                          {auditTab === 'scroll' && (
                            <button 
                              onClick={() => setScrollSort({ col: 'scroll_50', order: scrollSort.col === 'scroll_50' && scrollSort.order === 'desc' ? 'asc' : 'desc' })}
                              className={cn("p-1 rounded hover:bg-gray-200 transition-colors", scrollSort.col === 'scroll_50' && "text-emerald-600 bg-emerald-50")}
                            >
                              <TrendingUp className={cn("w-3 h-3", scrollSort.col === 'scroll_50' && scrollSort.order === 'asc' && "rotate-180")} />
                            </button>
                          )}
                          {auditTab === 'enrichment' && (
                            <button 
                              onClick={() => setEnrichmentSort({ col: 'impressions', order: enrichmentSort.col === 'impressions' && enrichmentSort.order === 'desc' ? 'asc' : 'desc' })}
                              className={cn("p-1 rounded hover:bg-gray-200 transition-colors", enrichmentSort.col === 'impressions' && "text-emerald-600 bg-emerald-50")}
                            >
                              <TrendingUp className={cn("w-3 h-3", enrichmentSort.col === 'impressions' && enrichmentSort.order === 'asc' && "rotate-180")} />
                            </button>
                          )}
                          {auditTab === 'lhf' && (
                            <button 
                              onClick={() => setLhfSort({ col: 'impressions', order: lhfSort.col === 'impressions' && lhfSort.order === 'desc' ? 'asc' : 'desc' })}
                              className={cn("p-1 rounded hover:bg-gray-200 transition-colors", lhfSort.col === 'impressions' && "text-emerald-600 bg-emerald-50")}
                            >
                              <TrendingUp className={cn("w-3 h-3", lhfSort.col === 'impressions' && lhfSort.order === 'asc' && "rotate-180")} />
                            </button>
                          )}
                        </div>
                      </th>
                    )}

                    {auditTab !== 'lhf' && auditTab !== 'er' && auditTab !== 'cta' && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <div className="flex items-center gap-2">
                          {auditTab === 'scroll' ? 'Scroll 75%' : (auditTab === 'lhf' || auditTab === 'declining' || auditTab === 'zero' || auditTab === 'enrichment' || auditTab === 'ai' || auditTab === 'consolidation') ? 'Avg. CTR' : 'CTR'}
                          {auditTab === 'scroll' && (
                            <button 
                              onClick={() => setScrollSort({ col: 'scroll_75', order: scrollSort.col === 'scroll_75' && scrollSort.order === 'desc' ? 'asc' : 'desc' })}
                              className={cn("p-1 rounded hover:bg-gray-200 transition-colors", scrollSort.col === 'scroll_75' && "text-emerald-600 bg-emerald-50")}
                            >
                              <TrendingUp className={cn("w-3 h-3", scrollSort.col === 'scroll_75' && scrollSort.order === 'asc' && "rotate-180")} />
                            </button>
                          )}
                        </div>
                      </th>
                    )}
                    {auditTab !== 'scroll' && auditTab !== 'er' && auditTab !== 'cta' && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                        <div className="flex items-center gap-2">
                          {(auditTab === 'lhf' || auditTab === 'declining' || auditTab === 'zero' || auditTab === 'enrichment' || auditTab === 'ai' || auditTab === 'consolidation') ? 'Avg. Position' : 'Position'}
                          {auditTab === 'enrichment' && (
                            <button 
                              onClick={() => setEnrichmentSort({ col: 'position', order: enrichmentSort.col === 'position' && enrichmentSort.order === 'desc' ? 'asc' : 'desc' })}
                              className={cn("p-1 rounded hover:bg-gray-200 transition-colors", enrichmentSort.col === 'clicks' && "text-emerald-600 bg-emerald-50")}
                            >
                              <TrendingUp className={cn("w-3 h-3", enrichmentSort.col === 'position' && enrichmentSort.order === 'asc' && "rotate-180")} />
                            </button>
                          )}
                          {auditTab === 'lhf' && (
                            <button 
                              onClick={() => setLhfSort({ col: 'position', order: lhfSort.col === 'position' && lhfSort.order === 'desc' ? 'asc' : 'desc' })}
                              className={cn("p-1 rounded hover:bg-gray-200 transition-colors", lhfSort.col === 'position' && "text-emerald-600 bg-emerald-50")}
                            >
                              <TrendingUp className={cn("w-3 h-3", lhfSort.col === 'position' && lhfSort.order === 'asc' && "rotate-180")} />
                            </button>
                          )}
                        </div>
                      </th>
                    )}
                    {(auditTab === 'declining' || auditTab === 'zero' || auditTab === 'consolidation' || auditTab === 'lhf') && (
                      <th className="px-8 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                        {auditTab === 'consolidation' ? 'Pages' : 'Queries'}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditRows.map((row, idx) => (
                    <React.Fragment key={idx}>
                      <tr 
                        className={cn(
                          "hover:bg-gray-50 transition-colors group",
                          (auditTab === 'declining' || auditTab === 'enrichment' || auditTab === 'zero' || auditTab === 'lhf' || auditTab === 'ai' || auditTab === 'consolidation' || auditTab === 'scroll') && "cursor-pointer",
                          ((expandedDecliningPage === row.keys[0] && auditTab === 'declining') || (expandedEnrichmentPage === row.keys[0] && auditTab === 'enrichment') || (expandedZeroPage === row.keys[0] && auditTab === 'zero') || (expandedLhfPage === row.keys[0] && auditTab === 'lhf') || (expandedAiPage === row.keys[0] && auditTab === 'ai') || (expandedConsolidationQuery === row.keys[0] && auditTab === 'consolidation') || (expandedScrollPage === row.keys[0] && auditTab === 'scroll')) && "bg-emerald-50/30"
                        )}
                        onClick={() => {
                          if (auditTab === 'declining') {
                            setExpandedDecliningPage(expandedDecliningPage === row.keys[0] ? null : row.keys[0]);
                          } else if (auditTab === 'enrichment') {
                            setExpandedEnrichmentPage(expandedEnrichmentPage === row.keys[0] ? null : row.keys[0]);
                          } else if (auditTab === 'zero') {
                            setExpandedZeroPage(expandedZeroPage === row.keys[0] ? null : row.keys[0]);
                          } else if (auditTab === 'lhf') {
                            setExpandedLhfPage(expandedLhfPage === row.keys[0] ? null : row.keys[0]);
                          } else if (auditTab === 'ai') {
                            setExpandedAiPage(expandedAiPage === row.keys[0] ? null : row.keys[0]);
                          } else if (auditTab === 'consolidation') {
                            setExpandedConsolidationQuery(expandedConsolidationQuery === row.keys[0] ? null : row.keys[0]);
                          } else if (auditTab === 'scroll') {
                            setExpandedScrollPage(expandedScrollPage === row.keys[0] ? null : row.keys[0]);
                          } else if (auditTab === 'er') {
                            setExpandedErPage(expandedErPage === row.keys[0] ? null : row.keys[0]);
                          }
                        }}
                      >
                        {(auditTab === 'cta' || auditTab === 'scroll' || auditTab === 'er') && (
                          <td className="px-8 py-4 w-10">
                            <input 
                              type="checkbox" 
                              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              checked={
                                auditTab === 'cta' ? selectedCtaPages.has(row.keys[0]) :
                                auditTab === 'scroll' ? selectedScrollPages.has(row.keys[0]) :
                                selectedErPages.has(row.keys[0])
                              }
                              onChange={(e) => {
                                if (auditTab === 'cta') {
                                  const newSelected = new Set(selectedCtaPages);
                                  if (e.target.checked) newSelected.add(row.keys[0]);
                                  else newSelected.delete(row.keys[0]);
                                  setSelectedCtaPages(newSelected);
                                } else if (auditTab === 'scroll') {
                                  const newSelected = new Set(selectedScrollPages);
                                  if (e.target.checked) newSelected.add(row.keys[0]);
                                  else newSelected.delete(row.keys[0]);
                                  setSelectedScrollPages(newSelected);
                                } else {
                                  const newSelected = new Set(selectedErPages);
                                  if (e.target.checked) newSelected.add(row.keys[0]);
                                  else newSelected.delete(row.keys[0]);
                                  setSelectedErPages(newSelected);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </td>
                        )}
                        <td className="px-8 py-4 max-w-md">
                          <div className="flex flex-col gap-1">
                            {auditTab === 'consolidation' ? (
                              <span className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors flex items-center gap-2">
                                <Search className="w-3 h-3 text-gray-400" />
                                {row.keys[0]}
                              </span>
                            ) : (auditTab === 'lhf' || auditTab === 'declining' || auditTab === 'zero' || auditTab === 'enrichment' || auditTab === 'ai' || auditTab === 'scroll' || auditTab === 'er' || auditTab === 'cta') ? (
                              <span className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors flex items-center gap-2">
                                <ExternalLink className="w-3 h-3 text-gray-400" />
                                {getSlug(row.keys[0])}
                              </span>
                            ) : (
                              <>
                                <span className="text-sm font-bold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                                  {row.keys[0]}
                                </span>
                                <span className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                                  <ExternalLink className="w-2 h-2" />
                                  {row.keys[1]}
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        {(auditTab === 'scroll' || auditTab === 'er' || auditTab === 'cta') && (
                          <td className="px-8 py-4 text-sm font-bold text-gray-700">
                            {getGa4StatsForPage(row.keys[0])['sessions'] || 0}
                          </td>
                        )}
                        {auditTab === 'er' && (
                          <td className="px-8 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-700">
                                {((getGa4StatsForPage(row.keys[0])['engagement_rate'] || 0) * 100).toFixed(2)}%
                              </span>
                            </div>
                          </td>
                        )}
                        {auditTab === 'cta' && (
                          <td className="px-8 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-700">
                                {(() => {
                                  const stats = getGa4StatsForPage(row.keys[0]);
                                  const sessions = stats.sessions || 0;
                                  const val = ctaTotal(stats);
                                  return sessions > 0 ? `${((val / sessions) * 100).toFixed(2)}%` : '0.00%';
                                })()}
                              </span>
                              {(() => {
                                const n = ctaEvKeys().length;
                                return n > 1 ? <span className="text-[10px] text-gray-400 font-normal">{n} event</span> : null;
                              })()}
                            </div>
                          </td>
                        )}
                      {auditTab !== 'er' && auditTab !== 'cta' && (
                        <td className="px-8 py-4 text-sm font-bold text-gray-700">
                        <div className="flex flex-col">
                          {auditTab === 'scroll' ? (
                            (() => {
                              const stats = getGa4StatsForPage(row.keys[0]);
                              const sessions = stats['sessions'] || 0;
                              const scrollValue = stats[evKey(25)] || 0;
                              const percentage = sessions > 0 ? (scrollValue / sessions) * 100 : 0;
                              return (
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-gray-700">{percentage.toFixed(1)}%</span>
                                  <span className="text-[10px] text-gray-400 font-normal">{scrollValue.toLocaleString()} events</span>
                                </div>
                              );
                            })()
                          ) : (
                            <span>{(auditTab === 'lhf' || auditTab === 'declining' || auditTab === 'zero' || auditTab === 'enrichment' || auditTab === 'ai' || auditTab === 'consolidation') ? row.clicks.toFixed(1) : row.clicks.toLocaleString()}</span>
                          )}
                          {auditTab === 'declining' && row.clickChange !== undefined && (
                            <span className={cn("text-[10px] font-bold", row.clickChange < 0 ? "text-rose-600" : "text-emerald-600")}>
                              {row.clickChange < 0 ? '↓' : '↑'} {Math.abs(row.clickChange).toFixed(1)}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {auditTab !== 'er' && auditTab !== 'cta' && (
                        <td className="px-8 py-4 text-sm font-medium text-gray-500">
                        {auditTab === 'scroll' ? (
                          (() => {
                            const stats = getGa4StatsForPage(row.keys[0]);
                            const sessions = stats['sessions'] || 0;
                            const scrollValue = stats[evKey(50)] || 0;
                            const percentage = sessions > 0 ? (scrollValue / sessions) * 100 : 0;
                            return (
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-gray-700">{percentage.toFixed(1)}%</span>
                                <span className="text-[10px] text-gray-400 font-normal">{scrollValue.toLocaleString()} events</span>
                              </div>
                            );
                          })()
                        ) : (
                          (auditTab === 'lhf' || auditTab === 'declining' || auditTab === 'zero' || auditTab === 'enrichment' || auditTab === 'ai' || auditTab === 'consolidation') ? row.impressions.toLocaleString(undefined, { maximumFractionDigits: 0 }) : row.impressions.toLocaleString()
                        )}
                      </td>
                    )}

                      {auditTab !== 'er' && auditTab !== 'cta' && (auditTab !== 'lhf' || auditTab === 'scroll') && (
                        <td className="px-8 py-4">
                          {auditTab === 'scroll' ? (
                            (() => {
                              const stats = getGa4StatsForPage(row.keys[0]);
                              const sessions = stats['sessions'] || 0;
                              const scrollValue = stats[evKey(75)] || 0;
                              const percentage = sessions > 0 ? (scrollValue / sessions) * 100 : 0;
                              return (
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-gray-700">{percentage.toFixed(1)}%</span>
                                  <span className="text-[10px] text-gray-400 font-normal">{scrollValue.toLocaleString()} events</span>
                                </div>
                              );
                            })()
                          ) : (
                            <span className={cn(
                              "px-2 py-1 rounded text-[10px] font-bold",
                              row.ctr > 0.05 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                            )}>
                              {(row.ctr * 100).toFixed(2)}%
                            </span>
                          )}
                        </td>
                      )}
                        {auditTab !== 'scroll' && auditTab !== 'er' && auditTab !== 'cta' && (
                          <td className="px-8 py-4">
                            <div className="flex flex-col">
                              <span className={cn(
                                "text-sm font-bold",
                                row.position <= 3 ? "text-emerald-600" : row.position <= 10 ? "text-emerald-600" : "text-gray-400"
                              )}>
                                {row.position.toFixed(1)}
                              </span>
                              {auditTab === 'declining' && row.posChange !== undefined && (
                                <span className={cn("text-[10px] font-bold", row.posChange > 0 ? "text-rose-600" : "text-emerald-600")}>
                                  {row.posChange > 0 ? '↓' : '↑'} {Math.abs(row.posChange).toFixed(1)}
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                        {(auditTab === 'declining' || auditTab === 'zero' || auditTab === 'consolidation' || auditTab === 'lhf') && (
                          <td className="px-8 py-4">
                            <span className="text-sm font-bold text-gray-600">
                              {auditTab === 'consolidation' ? row.pages.length : (row.queryCount || 0)}
                            </span>
                          </td>
                        )}
                    </tr>
                    {expandedConsolidationQuery === row.keys[0] && auditTab === 'consolidation' && (
                      <tr className="bg-gray-50/30">
                        <td colSpan={6} className="px-8 py-4">
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Pages Ranking for this Query</h4>
                              <span className="text-[10px] text-gray-400 italic">Showing pages for "{row.keys[0]}"</span>
                            </div>
                            <table className="w-full text-left">
                              <thead className="bg-white border-b border-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400">Page URL</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Clicks</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Impressions</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">CTR</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Position</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {(() => {
                                  const pagesMap = new Map<string, { clicks: number, impressions: number, ctr: number[], position: number[] }>();
                                  data.filter(d => d.keys[0] === row.keys[0]).forEach(d => {
                                    const p = d.keys[1];
                                    if (!p) return;
                                    if (!pagesMap.has(p)) {
                                      pagesMap.set(p, { clicks: 0, impressions: 0, ctr: [], position: [] });
                                    }
                                    const group = pagesMap.get(p)!;
                                    group.clicks += d.clicks;
                                    group.impressions += d.impressions;
                                    group.ctr.push(d.ctr);
                                    group.position.push(d.position);
                                  });
                                  
                                  return Array.from(pagesMap.entries())
                                    .map(([url, vals]) => ({
                                      url,
                                      clicks: vals.clicks,
                                      impressions: vals.impressions,
                                      ctr: vals.impressions > 0 ? vals.clicks / vals.impressions : 0,
                                      position: vals.position.reduce((a, b) => a + b, 0) / vals.position.length
                                    }))
                                    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
                                    .map((p, pIdx) => (
                                      <tr key={pIdx} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-2 text-xs font-medium text-gray-700 flex items-center gap-2">
                                          <ExternalLink className="w-3 h-3 text-gray-400" />
                                          {getSlug(p.url)}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-right font-bold text-gray-700">{p.clicks.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-xs text-right text-gray-500">{p.impressions.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-xs text-right">
                                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">
                                            {(p.ctr * 100).toFixed(2)}%
                                          </span>
                                        </td>
                                        <td className="px-4 py-2 text-xs text-right font-medium text-gray-600">{p.position.toFixed(1)}</td>
                                      </tr>
                                    ));
                                })()}
                              </tbody>
                            </table>
                            <div className="px-4 py-4 border-t border-gray-100">
                              <Ga4EventBreakdown pageUrl={row.keys[0]} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expandedAiPage === row.keys[0] && auditTab === 'ai' && (
                      <tr className="bg-gray-50/30">
                        <td colSpan={6} className="px-8 py-4">
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Question-based Queries</h4>
                              <span className="text-[10px] text-gray-400 italic">Showing queries for {getSlug(row.keys[0])}</span>
                            </div>
                            <table className="w-full text-left">
                              <thead className="bg-white border-b border-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400">Query</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Avg. Clicks</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Avg. Impressions</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Avg. CTR</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Avg. Position</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {data
                                  .filter(d => d.keys[1] === row.keys[0] && d.position > 6 && ['apa', 'siapa', 'kapan', 'dimana', 'mengapa', 'bagaimana', 'apakah', 'bisakah', 'berapa', '?'].some(word => d.keys[0]?.toLowerCase().includes(word)))
                                  .sort((a, b) => b.impressions - a.impressions)
                                  .map((q, qIdx) => (
                                    <tr key={qIdx} className="hover:bg-gray-50/50">
                                      <td className="px-4 py-2 text-xs font-medium text-gray-700">{q.keys[0]}</td>
                                      <td className="px-4 py-2 text-xs text-right font-bold text-gray-700">{q.clicks.toFixed(1)}</td>
                                      <td className="px-4 py-2 text-xs text-right text-gray-500">{q.impressions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                      <td className="px-4 py-2 text-xs text-right">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">
                                          {(q.ctr * 100).toFixed(2)}%
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-xs text-right font-medium text-gray-600">{q.position.toFixed(1)}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                            <div className="px-4 py-4 border-t border-gray-100">
                              <Ga4EventBreakdown pageUrl={row.keys[0]} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expandedLhfPage === row.keys[0] && auditTab === 'lhf' && (
                      <tr className="bg-gray-50/30">
                        <td colSpan={6} className="px-8 py-4">
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Associated Queries (Position 10+)</h4>
                              <span className="text-[10px] text-gray-400 italic">Showing queries for {getSlug(row.keys[0])}</span>
                            </div>
                            <table className="w-full text-left">
                              <thead className="bg-white border-b border-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400">Query</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Avg. Clicks</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Avg. Impressions</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Avg. CTR</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Avg. Position</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {data
                                  .filter(d => d.keys[1] === row.keys[0] && d.position >= 10)
                                  .sort((a, b) => b.impressions - a.impressions)
                                  .map((q, qIdx) => (
                                    <tr key={qIdx} className="hover:bg-gray-50/50">
                                      <td className="px-4 py-2 text-xs font-medium text-gray-700">{q.keys[0]}</td>
                                      <td className="px-4 py-2 text-xs text-right font-bold text-gray-700">{q.clicks.toFixed(1)}</td>
                                      <td className="px-4 py-2 text-xs text-right text-gray-500">{q.impressions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                      <td className="px-4 py-2 text-xs text-right">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">
                                          {(q.ctr * 100).toFixed(2)}%
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-xs text-right font-medium text-gray-600">{q.position.toFixed(1)}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                            <div className="px-4 py-4 border-t border-gray-100">
                              <Ga4EventBreakdown pageUrl={row.keys[0]} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expandedDecliningPage === row.keys[0] && auditTab === 'declining' && row.decliningQueries && (
                      <tr className="bg-gray-50/30">
                        <td colSpan={6} className="px-8 py-4">
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <table className="w-full text-left">
                              <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400">Declining Query</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Clicks</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Position</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {row.decliningQueries.map((q: any, qIdx: number) => (
                                  <tr key={qIdx} className="hover:bg-gray-50/50">
                                    <td className="px-4 py-2 text-xs font-medium text-gray-700">{q.query}</td>
                                    <td className="px-4 py-2 text-xs text-right">
                                      <div className="flex flex-col items-end">
                                        <span className="font-bold">{q.clicks}</span>
                                        <span className={cn("text-[9px] font-bold", q.clickChange < 0 ? "text-rose-600" : "text-emerald-600")}>
                                          {q.clickChange < 0 ? '↓' : '↑'} {Math.abs(q.clickChange).toFixed(1)}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-xs text-right">
                                      <div className="flex flex-col items-end">
                                        <span className="font-bold">{q.position.toFixed(1)}</span>
                                        <span className={cn("text-[9px] font-bold", q.posChange > 0 ? "text-rose-600" : "text-emerald-600")}>
                                          {q.posChange > 0 ? '↓' : '↑'} {Math.abs(q.posChange).toFixed(1)}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="px-4 py-4 border-t border-gray-100">
                              <Ga4EventBreakdown pageUrl={row.keys[0]} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expandedZeroPage === row.keys[0] && auditTab === 'zero' && (
                      <tr className="bg-gray-50/30">
                        <td colSpan={6} className="px-8 py-4">
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Associated Queries for Zero Traffic Page</h4>
                              <span className="text-[10px] text-gray-400 italic">Showing queries for {getSlug(row.keys[0])}</span>
                            </div>
                            <table className="w-full text-left">
                              <thead className="bg-white border-b border-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400">Query</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Avg. Clicks</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Avg. Impressions</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Avg. CTR</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Avg. Position</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {data
                                  .filter(d => d.keys[1] === row.keys[0])
                                  .sort((a, b) => b.impressions - a.impressions)
                                  .map((q, qIdx) => (
                                    <tr key={qIdx} className="hover:bg-gray-50/50">
                                      <td className="px-4 py-2 text-xs font-medium text-gray-700">{q.keys[0]}</td>
                                      <td className="px-4 py-2 text-xs text-right font-bold text-gray-700">{q.clicks.toFixed(1)}</td>
                                      <td className="px-4 py-2 text-xs text-right text-gray-500">{q.impressions.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                      <td className="px-4 py-2 text-xs text-right">
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">
                                          {(q.ctr * 100).toFixed(2)}%
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-xs text-right font-medium text-gray-600">{q.position.toFixed(1)}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                            <div className="px-4 py-4 border-t border-gray-100">
                              <Ga4EventBreakdown pageUrl={row.keys[0]} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    {expandedEnrichmentPage === row.keys[0] && auditTab === 'enrichment' && (
                      <tr className="bg-gray-50/30">
                        <td colSpan={6} className="px-8 py-4">
                          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                              <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Potential Queries (Position 10+)</h4>
                              <span className="text-[10px] text-gray-400 italic">Showing queries with position ≥ 10 for {getSlug(row.keys[0])}</span>
                            </div>
                            <table className="w-full text-left">
                              <thead className="bg-white border-b border-gray-100">
                                <tr>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400">Query</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Clicks</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Impressions</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">CTR</th>
                                  <th className="px-4 py-2 text-[10px] font-bold uppercase text-gray-400 text-right">Position</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {data
                                  .filter(d => d.keys[1] === row.keys[0] && d.position >= 10)
                                  .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
                                  .map((q, qIdx) => (
                                    <tr key={qIdx} className="hover:bg-gray-50/50">
                                      <td className="px-4 py-2 text-xs font-medium text-gray-700">{q.keys[0]}</td>
                                      <td className="px-4 py-2 text-xs text-right font-bold text-gray-700">{q.clicks.toLocaleString()}</td>
                                      <td className="px-4 py-2 text-xs text-right text-gray-500">{q.impressions.toLocaleString()}</td>
                                      <td className="px-4 py-2 text-xs text-right">
                                        <span className={cn(
                                          "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                          q.ctr > 0.05 ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                                        )}>
                                          {(q.ctr * 100).toFixed(2)}%
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-xs text-right font-medium text-gray-600">{q.position.toFixed(1)}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              </table>
            </div>
            {auditRows.length === 0 && (
              <div className="p-12 text-center">
                <AlertCircle className="w-8 h-8 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-medium">No data found for this audit filter.</p>
              </div>
            )}
          </div>
        )}
          </div>
        </div>
      </div>
        </div>
      </div>
          </motion.div>
  )
}
