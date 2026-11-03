import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Globe, RefreshCw, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';

type Props = {
  error: string | null;
  setError: (v: string | null) => void;
  projects: Array<{ id: string; name: string; role: string }>;
  activeProjectId: string | null;
  projectRole: string | null;
  projectConnection: { gsc_site: string | null; ga4_property: string | null; connected_at: string | null } | null;
  sites: any[];
  ga4Properties: any[];
  selectedSite: string | null;
  setSelectedSite: (v: string | null) => void;
  selectedGa4Property: string | null;
  setSelectedGa4Property: (v: string | null) => void;
  isConnected: boolean;
  projectWorking: boolean;
  isFetchingData: boolean;
  handleConnect: () => void;
  isConnecting: boolean;
  handleSaveConnection: () => void;
  fetchData: (siteUrl: string) => void;
  handleLogout: () => void;
};

export default function PropertyScreen(props: Props) {
  const { error, setError, projects, activeProjectId, projectRole, projectConnection, sites, ga4Properties, selectedSite, setSelectedSite, selectedGa4Property, setSelectedGa4Property, isConnected, projectWorking, isFetchingData, handleConnect, isConnecting, handleSaveConnection, fetchData, handleLogout } = props;
  return (
    <div className="relative min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center p-6">
      {/* Switch Account — pojok kanan atas */}
      <button
        onClick={handleLogout}
        className="absolute top-5 right-5 z-10 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-semibold text-gray-500 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm"
      >
        Switch Account
      </button>
      {error && (
        <div className="max-w-md w-full mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-600 text-sm shadow-sm">
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
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full p-8 rounded-3xl bg-white border border-gray-200 shadow-2xl space-y-6"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold">Property {projects.find(p => p.id === activeProjectId)?.name ? '\u2014 ' + (projects.find(p => p.id === activeProjectId)?.name) : ''}</h2>
          {projectRole !== 'owner' && (
            <p className="text-gray-500 text-sm mt-2">
              Project ini sudah diatur oleh pemiliknya. Kamu hanya bisa melihat datanya.
            </p>
          )}
          {projectRole === 'owner' && (
            <p className="text-[10px] uppercase tracking-widest font-black text-emerald-600 mt-2">
              ● Kamu pemilik project
            </p>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 px-1">Search Console Property</label>
            {sites.length > 0 ? (
              sites.map((site) => (
                <button
                  key={site.siteUrl}
                  onClick={() => setSelectedSite(site.siteUrl)}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between group",
                    selectedSite === site.siteUrl 
                      ? "bg-emerald-50 border-emerald-600 text-emerald-700" 
                      : "bg-white border-gray-200 hover:border-gray-300 text-gray-600"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-medium truncate max-w-[240px]">{site.siteUrl}</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-50">{site.permissionLevel}</span>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                    selectedSite === site.siteUrl ? "border-emerald-600 bg-emerald-600" : "border-gray-300"
                  )}>
                    {selectedSite === site.siteUrl && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400 text-sm space-y-1">
                {isConnected
                  ? <p>Properti Search Console tidak ada. Pastikan websitemu sudah terdaftar di <a className="text-emerald-600 underline" href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Search Console</a>.</p>
                  : <p>Daftar akan muncul setelah kamu klik <b>"Hubungkan Akun Google Dulu"</b> di bawah.</p>}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-wider font-bold text-gray-400 px-1 flex items-center justify-between">
              <span>Google Analytics 4 (Optional)</span>
              {ga4Properties.length > 0 && <span className="text-emerald-600 text-[8px] bg-emerald-50 px-1.5 py-0.5 rounded">Connected</span>}
            </label>
            {ga4Properties.length > 0 ? (
              <div className="max-h-48 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {ga4Properties.map((prop) => (
                  <button
                    key={prop.name}
                    onClick={() => setSelectedGa4Property(selectedGa4Property === prop.name ? null : prop.name)}
                    className={cn(
                      "w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between group text-xs",
                      selectedGa4Property === prop.name 
                        ? "bg-emerald-50 border-emerald-600 text-emerald-700" 
                        : "bg-white border-gray-200 hover:border-gray-300 text-gray-600"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium truncate max-w-[200px]">{prop.displayName}</span>
                      <span className="text-[8px] uppercase tracking-wider opacity-50">{prop.name.split('/').pop()}</span>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                      selectedGa4Property === prop.name ? "border-emerald-600 bg-emerald-600" : "border-gray-300"
                    )}>
                      {selectedGa4Property === prop.name && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl">
                No GA4 properties found or scope not granted.
              </div>
            )}
          </div>
        </div>

        {projectRole === 'owner' && (!isConnected || !projectConnection?.gsc_site) && (
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full py-4 bg-white border-2 border-emerald-600 text-emerald-700 font-bold rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
          >
            {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            Hubungkan Akun Google Dulu
          </button>
        )}

        <button
          disabled={!selectedSite || projectWorking || isFetchingData}
          onClick={() => {
            if (projectRole === 'owner' && selectedSite) handleSaveConnection();
            else if (selectedSite) fetchData(selectedSite);
          }}
          className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
        >
          {isFetchingData || projectWorking
            ? <RefreshCw className="w-5 h-5 animate-spin" />
            : projectRole === 'owner' ? 'Simpan Koneksi & Mulai Audit' : 'Mulai Audit'}
        </button>
      </motion.div>
    </div>
  );
}
