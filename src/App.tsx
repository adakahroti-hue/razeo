import React, { useState, useRef, useEffect } from 'react';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  ExternalLink,
  Eye,
  FileDown,
  FileText,
  Filter,
  ListTodo,
  Globe,
  History,
  LogOut,
  Network,
  MousePointer2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UserPlus,
  X
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import LoginScreen from './screens/LoginScreen';
import ProjectGate from './screens/ProjectGate';
import PropertyScreen from './screens/PropertyScreen';
import type { ContentItem } from './tabs/KontenTab';
import type { ProductItem } from './tabs/ProdukKonten';
import type { BundleItem } from './tabs/BundleKonten';
import { KINDS, Kind } from './lib/kinds';
import { createClient, User } from '@supabase/supabase-js';
import type { TaskItem } from './tabs/TaskTab'

// Supabase: login Google + identitas. Token login dibawa ke API server saat request.
const supabase = createClient(
  ((import.meta as any).env?.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co',
  ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string) || 'placeholder'
);


// Types
interface GSCRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  queryCount?: number;
  posChange?: number;
}

interface Site {
  siteUrl: string;
  permissionLevel: string;
}

interface GA4Property {
  name: string;
  displayName: string;
  propertyType: string;
}

interface GA4Row {
  dimensionValues: { value: string }[];
  metricValues: { value: string }[];
}

// Muat pustaka PDF (jsPDF + autoTable) HANYA saat fitur ekspor dipakai.
// Ini ~160KB minified (html2canvas+purify ikut) — tak perlu saat aplikasi dibuka.
let pdfKitPromise: Promise<{ jsPDF: any; autoTable: any }> | null = null;
const loadPdfKit = () =>
  (pdfKitPromise ??= Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]).then(([j, a]) => ({ jsPDF: (j as any).jsPDF, autoTable: (a as any).default })));

// Daftar modul audit — dipakai sidebar kategori & badge judul kartu
type AuditRole = 'inspect' | 'inspire' | 'educate' | 'convert';
// pemilih kategori peran (sub tab atas tab Optimasi) — audit dibagi per role konten
const AUDIT_ROLES: Array<{ id: AuditRole; label: string }> = [
  { id: 'inspire', label: 'Inspire' },
  { id: 'educate', label: 'Educate' },
  { id: 'convert', label: 'Convert' },
  { id: 'inspect', label: 'Semua' },
];

const AUDIT_TABS: Array<{ id: string; label: string; icon: any }> = [
  { id: 'ctr', label: 'CTR Analysis', icon: MousePointer2 },
  { id: 'lhf', label: 'Low Hanging Fruit', icon: Target },
  { id: 'declining', label: 'Declining', icon: TrendingUp },
  { id: 'zero', label: 'Zero Traffic', icon: AlertCircle },
  { id: 'enrichment', label: 'Enrichment', icon: Target },
  { id: 'ai', label: 'AI Search', icon: Search },
  { id: 'consolidation', label: 'Consolidation', icon: Filter },
  { id: 'scroll', label: 'Scroll Optimization', icon: TrendingUp },
  { id: 'er', label: 'ER Optimization', icon: BarChart3 },
  { id: 'cta', label: 'CTA Optimization', icon: MousePointer2 },
];

// Navigasi utama — chip di header lama, pindah ke sidebar kiri
const TAB_LIST: Array<{ id: TabId; label: string; icon: any }> = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'insight', label: 'Insight', icon: Sparkles },
  { id: 'cek', label: 'Cek', icon: Eye },
  { id: 'dashboard', label: 'Optimasi', icon: Target },
  { id: 'konten', label: 'Konten', icon: FileText },
  { id: 'visualisasi', label: 'Visualisasi', icon: Network },
  { id: 'task', label: 'Task', icon: ListTodo },
  { id: 'tracker', label: 'Perubahan', icon: History },
];

// ===== URL halaman (sinkron dengan viewState, tanpa library routing) =====
const VIEW_PATHS: Record<string, string> = { login: '/', project: '/project', select: '/properti', dashboard: '/dashboard' };
const PATH_VIEWS: Record<string, 'login' | 'project' | 'select' | 'dashboard'> = {
  '/': 'login', '/project': 'project', '/properti': 'select', '/dashboard': 'dashboard',
};

// ===== slug URL per tab (sesuai nama tab, huruf kecil tanpa spasi) =====
type TabId = 'overview' | 'insight' | 'cek' | 'dashboard' | 'konten' | 'visualisasi' | 'task' | 'tracker' | 'pengaturan';
const TAB_PATHS: Record<TabId, string> = {
  overview: '/overview', insight: '/insight', cek: '/cek', dashboard: '/optimasi', konten: '/konten',
  visualisasi: '/visualisasi', task: '/task', tracker: '/perubahan', pengaturan: '/pengaturan',
};
const TAB_IDS = Object.keys(TAB_PATHS) as TabId[];
const segToTab = (pathname: string): TabId | null => {
  const seg = pathname.split('/')[1];
  return (TAB_IDS as string[]).includes(seg) ? (seg as TabId) : null;
};

// ===== Lazy per-tab — tiap tab dimuat jadi chunk sendiri sesuai tab yg dibuka =====
const LazyOverviewTab     = React.lazy(() => import('./tabs/OverviewTab'));
const LazyInsightTab      = React.lazy(() => import('./tabs/InsightTab'));
const LazyCekTab          = React.lazy(() => import('./tabs/CekTab'));
const LazyDashboardTab    = React.lazy(() => import('./pages/DashboardTab'));
const LazyKontenTab       = React.lazy(() => import('./tabs/KontenTab'));
const LazyTaskTab         = React.lazy(() => import('./tabs/TaskTab'));
const LazyAksiTab         = React.lazy(() => import('./pages/AksiTab'));
const LazySettingsPage    = React.lazy(() => import('./pages/SettingsPage'));
const LazyVisualisasiTab   = React.lazy(() => import('./tabs/VisualisasiTab'));
const LazyAksiAddLogModal = React.lazy(() => import('./pages/AksiTab').then((m) => ({ default: m.AksiAddLogModal })));

// Layar buka pertama kali / restore sesi: bar persegi panjang yang terisi berulang
function BootScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
        <BarChart3 className="w-5 h-5 text-white" />
      </div>
      <div className="w-56 h-2.5 rounded-full bg-gray-200 overflow-hidden shadow-inner">
        <div className="h-full w-1/3 rounded-full bg-emerald-600 bootbar" />
      </div>
    </div>
  );
}

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [ga4Properties, setGa4Properties] = useState<GA4Property[]>([]);
  const [selectedGa4Property, setSelectedGa4Property] = useState<string | null>(null);
  const [ga4Data, setGa4Data] = useState<GA4Row[]>([]);
  const [data, setData] = useState<GSCRow[]>([]);
  const [summary, setSummary] = useState<GSCRow | null>(null);
  const [timeSeries, setTimeSeries] = useState<GSCRow[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 'project' = gerbang PILIH/BUAT project setelah login Google
  const [viewState, setViewState] = useState<'login' | 'project' | 'select' | 'dashboard'>('login');
  // Ref view terkini — dibaca async/callback supaya tidak memakai nilai basi (closure)
  const viewStateRef = useRef<'login' | 'project' | 'select' | 'dashboard'>('login');
  viewStateRef.current = viewState;
  const [projectRole, setProjectRole] = useState<string | null>(null);
  const [projectConnection, setProjectConnection] = useState<{ gsc_site: string | null; ga4_property: string | null; connected_at: string | null } | null>(null);
  const [projectWorking, setProjectWorking] = useState(false);
  // pill rentang tanggal (header) + pengaturan nama event GA4 (scroll 25/50/75 & CTA)
  type EvCfg = { scroll25: string; scroll50: string; scroll75: string; ctas: string[]; branded: string[] };
  const DEFAULT_EV: EvCfg = {
    scroll25: 'scroll_25', scroll50: 'scroll_50', scroll75: 'scroll_75',
    ctas: ['click_cta_article', 'click_cta_ke_produk', 'purchase'],
    branded: [],
  };
  // dibaca CIAP KALI (localStorage) — lambat tapi bikin seluruh cetus (fetch, sort, render) memakai nama terbaru
  const [evCfg, setEvCfg] = useState<EvCfg>(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('razeo_events') || 'null') as Partial<EvCfg> | null;
      if (!raw) return DEFAULT_EV;
      return {
        scroll25: raw.scroll25 || DEFAULT_EV.scroll25,
        scroll50: raw.scroll50 || DEFAULT_EV.scroll50,
        scroll75: raw.scroll75 || DEFAULT_EV.scroll75,
        ctas: Array.isArray(raw.ctas) ? (raw.ctas.filter((x) => typeof x === 'string' && x.trim()) as string[]) : DEFAULT_EV.ctas,
        branded: Array.isArray(raw.branded) ? (raw.branded.filter((x) => typeof x === 'string' && x.trim()) as string[]) : [],
      };
    } catch { return DEFAULT_EV; }
  });
  const [showEvPop, setShowEvPop] = useState(false);
  const [showDatePop, setShowDatePop] = useState(false);
  // nama event scroll sesuai pengaturan (fallback ke default kalau kosong)
  const evKey = (pct: number): string =>
    (pct === 25 ? evCfg.scroll25 : pct === 50 ? evCfg.scroll50 : evCfg.scroll75).trim() || `scroll_${pct}`;
  // daftar nama event CTA (boleh banyak)
  const ctaEvKeys = (): string[] => evCfg.ctas.map((x) => (x || '').trim()).filter(Boolean);
  const ctaTotal = (stats: Record<string, number>): number =>
    ctaEvKeys().reduce((acc, ev) => acc + (stats[ev] || 0), 0);
  // timer simpan nama event ke database (debounce saat mengetik)
  const evSaveTimer = useRef<number | null>(null);
  const postEvToDb = (next: EvCfg) => {
    // kirim ke database; kalau bukan pemilik / migrasi belum jalan, senyap (localStorage tetap jalan)
    getAuthHeaders().then((headers) => {
      if (!('Authorization' in headers)) return;
      fetch('/api/projects', { method: 'POST', headers, body: JSON.stringify({ action: 'events-save', ...next }) }).catch(() => {});
    }).catch(() => {});
  };
  const saveEv = (next: EvCfg) => {
    setEvCfg(next);
    localStorage.setItem('razeo_events', JSON.stringify(next));
    if (evSaveTimer.current) window.clearTimeout(evSaveTimer.current);
    evSaveTimer.current = window.setTimeout(() => postEvToDb(next), 900);
    // hanya muat ulang yang benar-benar memakai nama event (tab Cek: scroll, Optimasi: daftar event)
    if (currentTab === 'cek') loadCek();
    if (currentTab === 'insight') loadInsight();
    if (currentTab === 'dashboard' && selectedSite) fetchData(selectedSite);
  };
  const [startDate, setStartDate] = useState<string>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [compareStartDate, setCompareStartDate] = useState<string>(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [compareEndDate, setCompareEndDate] = useState<string>(new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonData, setComparisonData] = useState<GSCRow[]>([]);
  const [comparisonSummary, setComparisonSummary] = useState<GSCRow | null>(null);
  const [comparisonTimeSeries, setComparisonTimeSeries] = useState<GSCRow[]>([]);
  const [auditTab, setAuditTab] = useState<'ctr' | 'lhf' | 'declining' | 'zero' | 'enrichment' | 'ai' | 'consolidation' | 'scroll' | 'er' | 'cta'>('ctr');
  const [erSubTab, setErSubTab] = useState<'article' | 'product'>('article');
  const [ctaSubTab, setCtaSubTab] = useState<'article' | 'product'>('article');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCtrPosition, setSelectedCtrPosition] = useState<number | null>(null);
  const [selectedCtrPage, setSelectedCtrPage] = useState<string | null>(null);
  const [auditRole, setAuditRole] = useState<AuditRole>('inspect'); // inspect = semua role
  // aturan: 'inspire'/'educate' hanya halaman non-produk; 'convert' hanya /produk/; 'inspect' semua
  const inRole = (page: string): boolean => {
    const isProduk = page.includes('/produk/');
    if (auditRole === 'inspire' || auditRole === 'educate') return !isProduk;
    if (auditRole === 'convert') return isProduk;
    return true;
  };
  // saat role berubah, subtab ER/CTA menyesuaikan isi role-nya
  // (convert = halaman produk → pakai subtab 'product'; lainnya → 'article')
  useEffect(() => {
    if (auditRole === 'convert') {
      setErSubTab('product'); setCtaSubTab('product');
    } else {
      setErSubTab('article'); setCtaSubTab('article');
    }
  }, [auditRole]);
  const [expandedDecliningPage, setExpandedDecliningPage] = useState<string | null>(null);
  const [expandedEnrichmentPage, setExpandedEnrichmentPage] = useState<string | null>(null);
  const [expandedZeroPage, setExpandedZeroPage] = useState<string | null>(null);
  const [expandedLhfPage, setExpandedLhfPage] = useState<string | null>(null);
  const [currentTab, setCurrentTabState] = useState<TabId>('overview');
  const currentTabRef = useRef<TabId>(currentTab);
  currentTabRef.current = currentTab;
  // ganti tab dari sidebar/strip — state saja; URL ditulis efek sinkron di bawah
  const setCurrentTab = (t: TabId) => setCurrentTabState(t);
  // Tab Cek (perbandingan dua periode per halaman)
  const [cekData, setCekData] = useState<any>(null);
  const [cekLoading, setCekLoading] = useState(false);
  // Konten (pendataan)
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [taskItems, setTaskItems] = useState<TaskItem[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const [productItems, setProductItems] = useState<ProductItem[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);
  const [bundleLoading, setBundleLoading] = useState(false);
  // sub-bab Tab Konten: artikel | produk (tampil di header)
  const [kontenSub, setKontenSub] = useState<'artikel' | 'produk' | 'bundle'>('artikel');
  // Overview (ringkasan performa)
  const [ovData, setOvData] = useState<any>(null);
  const [ovLoading, setOvLoading] = useState(false);
  const [ovNote, setOvNote] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [seoLogs, setSeoLogs] = useState<any[]>([]);
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [selectedAspects, setSelectedAspects] = useState<string[]>([]);
  const [logFilterMonth, setLogFilterMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [expandedAiPage, setExpandedAiPage] = useState<string | null>(null);
  const [expandedScrollPage, setExpandedScrollPage] = useState<string | null>(null);
  const [expandedErPage, setExpandedErPage] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [projects, setProjects] = useState<Array<{id:string;name:string;role:string}>>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(
    () => localStorage.getItem('razeo_project')
  );
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteBusy, setInviteBusy] = useState(false);
  // sidebar bisa di-hide/show (pilihan disimpan di perangkat ini)
  const [sideOpen, setSideOpen] = useState<boolean>(() => localStorage.getItem('razeo_side') !== '0');
  const toggleSide = () => setSideOpen((v) => { localStorage.setItem('razeo_side', v ? '0' : '1'); return !v; });
  // jenis data Tab Cek — tombolnya di header (chip HP: strip khusus layar kecil)
  const [cekKind, setCekKind] = useState<Kind>('impressi');

  const getAuthHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return {};
    const h: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    // scope per-project: semua endpoint paham X-Project-Id
    const pid = activeProjectId ?? localStorage.getItem('razeo_project');
    if (pid) h['X-Project-Id'] = pid;
    return h;
  };

  // muat nama event scroll & CTA dari DATABASE per project (localStorage tetap jadi cadangan)
  useEffect(() => {
    if (viewState !== 'dashboard' || !activeProjectId) return;
    let alive = true;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        if (!('Authorization' in headers)) return;
        const res = await fetch('/api/projects', { method: 'POST', headers, body: JSON.stringify({ action: 'events-get' }) });
        if (!res.ok) return;
        const d = await res.json().catch(() => ({}));
        const ev = d?.events;
        if (ev && ev.scroll25) {
          const next: EvCfg = {
            scroll25: ev.scroll25 || DEFAULT_EV.scroll25,
            scroll50: ev.scroll50 || DEFAULT_EV.scroll50,
            scroll75: ev.scroll75 || DEFAULT_EV.scroll75,
            ctas: Array.isArray(ev.ctas) && ev.ctas.length ? ev.ctas : DEFAULT_EV.ctas,
            branded: Array.isArray(ev.branded_keywords)
              ? (ev.branded_keywords as any[]).filter((x) => typeof x === 'string' && (x as string).trim())
              : [],
          };
          if (alive) { setEvCfg(next); localStorage.setItem('razeo_events', JSON.stringify(next)); }
        } else if (d?.events === null) {
          // belum ada baris di DB → tulis sekali (gagal senyap: anggota non-owner kena 403)
          postEvToDb(evCfg);
        }
      } catch { /* jaringan/DB belum siap → tetap pakai localStorage */ }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewState, activeProjectId]);

  const loadProjects = async () => {
    try {
      const headers = await getAuthHeaders();
      if (!('Authorization' in headers)) return;
      const res = await fetch('/api/projects', { headers });
      if (!res.ok) return;
      const data = await res.json();
      const list = data.projects || [];
      setProjects(list);
      if (list.length > 0) {
        const saved = localStorage.getItem('razeo_project');
        const ok = list.find((p: any) => p.id === saved);
        const current = ok ? ok.id : list[0].id;
        if (current !== saved) {
          localStorage.setItem('razeo_project', current);
          setActiveProjectId(current);
        }
      }
    } catch (e) {
      console.error('loadProjects error:', e);
    }
  };

  // Masuk ke sebuah project: simpan pilihan, muat koneksi, lalu ke 'select'
  const enterProject = async (pid: string, name: string, role: string) => {
    localStorage.setItem('razeo_project', pid);
    setActiveProjectId(pid);
    setProjectRole(role);
    // muat status koneksi GSC/GA4 milik project ini
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/projects', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'connection-get' })
      });
      if (res.ok) {
        const d = await res.json();
        setProjectConnection(d.connection ?? null);
        setProjectRole(d.role ?? role);
        // owner tanpa koneksi → ke layar connect; selain itu → pilih properti/audit
        if (d.role === 'owner' && !d.connection?.gsc_site) {
          setViewState('select');
        } else if (d.connection?.gsc_site) {
          setSelectedSite(d.connection.gsc_site);
          setSelectedGa4Property(d.connection.ga4_property ?? null);
          setViewState('select');
        } else {
          setViewState('select'); // member tanpa koneksi → tetap select (info)
        }
      } else {
        setViewState('select');
      }
    } catch {
      setViewState('select');
    }
    // muat daftar properti GSC/GA4 untuk layar pilih (jangan kosong/gapapa kalau gagal)
    fetchSites();
    // refresh picker header
    loadProjects();
  };

  // Buat project baru (dipanggil modal di ProjectGate) → sukses = langsung masuk
  const handleCreateProject = async (givenName: string): Promise<boolean> => {
    const name = givenName.trim();
    if (!name) { setError('Nama project wajib diisi'); return false; }
    setProjectWorking(true); setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/projects', {
        method: 'POST', headers,
        body: JSON.stringify({ name })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Gagal membuat project');
      await loadProjects();
      await enterProject(d.id, d.name, 'owner');
      return true;
    } catch (e: any) {
      setError(e.message || 'Gagal membuat project');
      return false;
    } finally {
      setProjectWorking(false);
    }
  };

  // Hapus project (hanya owner) — return true kalau berhasil
  const handleDeleteProject = async (pid: string) => {
    setError(null);
    try {
      const headers = await getAuthHeaders();
      headers['X-Project-Id'] = pid;
      const res = await fetch('/api/projects', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'delete' })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Gagal menghapus project');
      await loadProjects();
      // kalau project yang baru dihapus itu yang aktif → reset pilihan
      if (localStorage.getItem('razeo_project') === pid) localStorage.removeItem('razeo_project');
      return true;
    } catch (e: any) {
      setError(e.message || 'Gagal menghapus project');
      return false;
    }
  };

  // Ganti nama project (hanya owner) — return true kalau berhasil
  const handleRenameProject = async (pid: string, newName: string) => {
    const name = newName.trim();
    if (!name) { setError('Nama project wajib diisi'); return false; }
    setError(null);
    try {
      const headers = await getAuthHeaders();
      headers['X-Project-Id'] = pid; // rename project target, bukan yang aktif
      const res = await fetch('/api/projects', {
        method: 'POST', headers,
        body: JSON.stringify({ action: 'rename', name })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Gagal mengganti nama');
      await loadProjects(); // segarkan dropdown & layar pilih
      return true;
    } catch (e: any) {
      setError(e.message || 'Gagal mengganti nama project');
      return false;
    }
  };

  // Simpan pilihan GSC + GA4 ke project (hanya owner)
  const handleSaveConnection = async () => {
    if (!selectedSite) { setError('Pilih dulu property Search Console'); return; }
    setProjectWorking(true); setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/projects', {
        method: 'POST', headers,
        body: JSON.stringify({
          action: 'connection-save',
          gsc_site: selectedSite,
          ga4_property: selectedGa4Property || null
        })
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Gagal menyimpan koneksi');
      setProjectConnection(d.connection);
      setProjectRole('owner');
      setIsConnected(true);
      await fetchData(selectedSite);
    } catch (e: any) {
      setError(e.message || 'Gagal menyimpan koneksi');
    } finally {
      setProjectWorking(false);
    }
  };

  // Tambah link undangan ke project aktif (hanya owner)
  const handleOpenInvite = async () => {
    setShowInvite(true);
    setInviteLink(null);
    setInviteBusy(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/projects', { method: 'POST', headers, body: JSON.stringify({ action: 'invite' }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat undangan');
      // selalu tampilkan domain resmi (bukan hostname deployment yang panjang)
      const APP_ORIGIN = 'https://razeo.vercel.app';
      setInviteLink(`${APP_ORIGIN}/?invite=${data.invitation.token}`);
    } catch (e: any) {
      setInviteLink('ERROR:' + (e.message || 'gagal'));
    } finally {
      setInviteBusy(false);
    }
  };

  // Auto-tebus link undangan ?invite=TOKEN (setelah login)
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (!token) return;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/projects', {
          method: 'POST', headers,
          body: JSON.stringify({ action: 'redeem', token })
        });
        const data = await res.json();
        if (res.ok) {
          // pindah ke project hasil undangan
          localStorage.setItem('razeo_project', data.project_id);
          setActiveProjectId(data.project_id);
          params.delete('invite');
          const qs = params.toString();
          window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : ''));
          await loadProjects();
        } else {
          console.warn('Redeem gagal:', data.error);
        }
      } catch (e) {
        console.error('Redeem error:', e);
      }
    })();
  }, [user]);

  useEffect(() => {
    // Baca sesi dari penyimpanan lokal dulu (getSession), lalu verifikasi ke server.
    // getUser() saja dulu berisiko: kalau verifikasi jaringan gagal, aplikasi mengira
    // belum login dan melempar pengguna ke layar login saat refresh.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session?.user) {
          setUser(data.session.user as User | null);
          loadProjects();
          return;
        }
        // tidak ada sesi lokal → coba verifikasi server (fallback)
        return supabase.auth.getUser().then(({ data: g }) => {
          setUser(g.user as User | null);
          if (g.user) loadProjects();
        });
      })
      .catch(() => {
        // gagal baca penyimpanan → biarkan pendengar sesi yang mengurus
      });
    // dengarkan perubahan login; refresh token ditangani supabase-js sendiri.
    // Penting: sesi hilang hanya berarti keluar kalau memang event SIGNED_OUT
    // (klik logout). Event lain dengan session kosong TIDAK menendang ke login.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user as User | null);
        loadProjects();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setSeoLogs([]);
      return;
    }

    // Muat log dari API server (Supabase) dan refresh tiap 15 detik
    loadLogs();
    const interval = setInterval(loadLogs, 15000);
    return () => clearInterval(interval);
  }, [user, activeProjectId]);

  const loadLogs = async () => {
    if (!user) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/logs', { headers });
      if (!res.ok) {
        console.error('Gagal memuat log:', res.status);
        return;
      }
      const logs = await res.json();
      setSeoLogs(logs);
    } catch (err) {
      console.error('API error:', err);
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      // Supabase Auth: popup Google -> redirect balik -> sesi tersimpan di browser
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'https://razeo.vercel.app/' }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Login Error:", err);
      setError("Failed to login with Google: " + (err.message || "Unknown error"));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      const headers = await getAuthHeaders();
      await supabase.auth.signOut();   // tutup sesi lokal
      await fetch('/api/auth/logout', { 
        method: 'POST',
        headers
      });
      setIsConnected(false);
      setSites([]);
      setData([]);
      setSelectedSite(null);
      setViewState('login');
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  const testConnection = async () => {
    try {
      const headers = await getAuthHeaders();
      if (!headers.Authorization) return;
      const res = await fetch('/api/logs', { headers });
      if (!res.ok) console.error('Koneksi API log bermasalah:', res.status);
    } catch (error) {
      console.error('API unreachable:', error);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);
  const [selectedCtaPages, setSelectedCtaPages] = useState<Set<string>>(new Set());
  const [selectedScrollPages, setSelectedScrollPages] = useState<Set<string>>(new Set());
  const [selectedErPages, setSelectedErPages] = useState<Set<string>>(new Set());
  const [expandedConsolidationQuery, setExpandedConsolidationQuery] = useState<string | null>(null);
  const [enrichmentSort, setEnrichmentSort] = useState<{ col: 'clicks' | 'impressions' | 'position', order: 'asc' | 'desc' }>({ col: 'position', order: 'asc' });
  const [lhfSort, setLhfSort] = useState<{ col: 'clicks' | 'impressions' | 'position', order: 'asc' | 'desc' }>({ col: 'position', order: 'asc' });
  const [scrollSort, setScrollSort] = useState<{ col: 'sessions' | 'scroll_25' | 'scroll_50' | 'scroll_75', order: 'asc' | 'desc' }>({ col: 'sessions', order: 'desc' });
  const [erSort, setErSort] = useState<{ col: 'sessions' | 'er', order: 'asc' | 'desc' }>({ col: 'er', order: 'asc' });
  const [ctaSort, setCtaSort] = useState<{ col: 'sessions' | 'cta_total', order: 'asc' | 'desc' }>({ col: 'sessions', order: 'desc' });

  const getSlug = (url: string) => {
    if (!url) return '';
    try {
      // Handle cases where URL might not have protocol
      const urlToParse = url.startsWith('http') ? url : `https://${url}`;
      const path = new URL(urlToParse).pathname;
      return path;
    } catch (e) {
      // Fallback: remove domain if possible
      return url.replace(/^https?:\/\/[^\/]+/, '') || '/';
    }
  };

  // kunci stats per halaman — scroll & CTA memakai nama dari pengaturan,
    // 'sessions'/'engagement_rate' tetap kunci internal (bukan nama event)
    const TRACKED_EVENTS = Array.from(new Set([
      ...ctaEvKeys(), evKey(25), evKey(50), evKey(75),
      "page_view", "sessions", "engagement_rate",
    ]));

  const getGa4StatsForPage = (pageUrl: string) => {
    const slug = getSlug(pageUrl);
    const stats: Record<string, number> = {};
    TRACKED_EVENTS.forEach(event => stats[event] = 0);

    if (!ga4Data || ga4Data.length === 0) return stats;

    ga4Data.forEach(row => {
      const rowPath = row.dimensionValues[0].value;
      const eventName = row.dimensionValues[1].value;
      const count = parseInt(row.metricValues[0].value);
      const sessions = parseInt(row.metricValues[1].value);
      const er = parseFloat(row.metricValues[2].value);

      // Simple matching: check if slug matches or rowPath matches slug
      // Normalize both by removing trailing slashes
      const normalizedSlug = slug.replace(/\/$/, "");
      const normalizedRowPath = rowPath.replace(/\/$/, "");

      if (normalizedRowPath === normalizedSlug) {
        if (stats[eventName] !== undefined) {
          stats[eventName] += count;
        }
        // If this is the page_view row, we can get the total sessions for the page
        if (eventName === 'page_view') {
          stats['sessions'] += sessions;
          stats['engagement_rate'] = er;
        }
      }
    });

    return stats;
  };

  const Ga4EventBreakdown = ({ pageUrl }: { pageUrl: string }) => {
    if (!selectedGa4Property) return null;
    const stats = getGa4StatsForPage(pageUrl);
    const hasData = Object.values(stats).some(v => v > 0);

    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-3 h-3 text-emerald-600" />
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">GA4 Event Tracking (Starred)</h5>
        </div>
        {!hasData ? (
          <div className="p-4 text-center text-gray-400 text-[10px] italic bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            No GA4 event data found for this page in the selected period.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 p-4 bg-emerald-50/30 rounded-xl border border-emerald-100">
            {Object.entries(stats).map(([event, count]) => (
              <div key={event} className="flex flex-col p-2 bg-white rounded-lg border border-emerald-100 shadow-sm">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider truncate" title={event}>
                  {event.replace(/_/g, ' ')}
                </span>
                <span className={cn(
                  "text-sm font-bold",
                  count > 0 ? "text-emerald-600" : "text-gray-300"
                )}>
                  {count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const downloadPositionPdf = async (position: number, avgCtr: number) => {
    const { jsPDF, autoTable } = await loadPdfKit();
    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text(`CTR Optimization Report - Position ${position}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(`Average CTR for this position: ${avgCtr.toFixed(2)}%`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);
    
    // Data processing
    const pageGroups = new Map<string, { clicks: number, impressions: number, topQuery: string, queryCount: number }>();
    data.forEach(row => {
      const page = row.keys[1] || '';
      if (!inRole(page)) return;
      
      if (Math.round(row.position) === position) {
        if (!pageGroups.has(page)) {
          pageGroups.set(page, { clicks: row.clicks, impressions: row.impressions, topQuery: row.keys[0], queryCount: 1 });
        } else {
          const group = pageGroups.get(page)!;
          group.clicks += row.clicks;
          group.impressions += row.impressions;
          group.queryCount += 1;
        }
      }
    });

    const underperformingPages = Array.from(pageGroups.entries())
      .map(([page, stats]) => ({
        page,
        ...stats,
        ctr: stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0
      }))
      .filter(p => p.ctr < avgCtr)
      .sort((a, b) => b.impressions - a.impressions);

    const tableData: any[] = [];
    
    underperformingPages.forEach(page => {
      // Add page row
      tableData.push([
        { content: `PAGE: ${getSlug(page.page)}`, styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: `${page.ctr.toFixed(2)}%`, styles: { fontStyle: 'bold', fillColor: [249, 250, 251], textColor: [225, 29, 72] } },
        { content: page.clicks.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: page.impressions.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } }
      ]);

      // Find underperforming queries for this page
      const queries = data
        .filter(d => d.keys[1] === page.page && Math.round(d.position) === position)
        .map(q => ({
          query: q.keys[0],
          ctr: q.impressions > 0 ? (q.clicks / q.impressions) * 100 : 0,
          clicks: q.clicks,
          impressions: q.impressions
        }))
        .filter(q => q.ctr < avgCtr)
        .sort((a, b) => b.impressions - a.impressions);

      queries.forEach(q => {
        tableData.push([
          `  - ${q.query}`,
          `${q.ctr.toFixed(2)}%`,
          q.clicks.toLocaleString(),
          q.impressions.toLocaleString()
        ]);
      });
    });

    autoTable(doc, {
      startY: 45,
      head: [['URL / Query', 'CTR', 'Clicks', 'Impressions']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105] },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { halign: 'right', cellWidth: 30 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 30 }
      },
      styles: { fontSize: 9 }
    });

    doc.save(`CTR-Optimization-Position-${position}.pdf`);
  };

  const downloadAllPositionsCsv = () => {
    const pageMap = new Map<string, { clicks: number, impressions: number }>();
    
    activeData.forEach(row => {
      const page = row.keys[1];
      if (!page) return;
      if (!inRole(page)) return;
      
      const pos = Math.round(row.position);
      if (pos >= 1 && pos <= 10) {
        if (!pageMap.has(page)) {
          pageMap.set(page, { clicks: row.clicks, impressions: row.impressions });
        } else {
          const stats = pageMap.get(page)!;
          stats.clicks += row.clicks;
          stats.impressions += row.impressions;
        }
      }
    });

    const csvRows = [
      ["Page URL", "CTR (%)"],
      ...Array.from(pageMap.entries()).map(([url, stats]) => {
        const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions) * 100 : 0;
        return [url, ctr.toFixed(2)];
      })
    ];

    const csvContent = "\uFEFF" + csvRows.map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `CTR-Analysis-All-Positions-1-10-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadEnrichmentPDF = async (enrichmentData: any[]) => {
    const { jsPDF, autoTable } = await loadPdfKit();
    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('SEO Enrichment Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text('Pages with high potential (Pos 1-10) and keywords at Pos 10+', 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);
    
    const tableData: any[] = [];
    
    enrichmentData.forEach(row => {
      // Add page row
      tableData.push([
        { content: `PAGE: ${getSlug(row.keys[0])}`, styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.clicks.toFixed(1), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.impressions.toLocaleString(undefined, { maximumFractionDigits: 0 }), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: `${(row.ctr * 100).toFixed(2)}%`, styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.position.toFixed(1), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } }
      ]);

      // Find queries for this page with position >= 10
      const queries = data
        .filter(d => d.keys[1] === row.keys[0] && d.position >= 10)
        .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);

      queries.forEach(q => {
        tableData.push([
          { content: `  - ${q.keys[0]}`, styles: { fontSize: 9, textColor: [100, 116, 139] } },
          { content: q.clicks.toLocaleString(), styles: { fontSize: 9, textColor: [100, 116, 139] } },
          { content: q.impressions.toLocaleString(), styles: { fontSize: 9, textColor: [100, 116, 139] } },
          { content: `${(q.ctr * 100).toFixed(2)}%`, styles: { fontSize: 9, textColor: [100, 116, 139] } },
          { content: q.position.toFixed(1), styles: { fontSize: 9, textColor: [100, 116, 139] } }
        ]);
      });
    });

    autoTable(doc, {
      head: [['Page / Query', 'Avg. Clicks', 'Avg. Impressions', 'Avg. CTR', 'Avg. Position']],
      body: tableData,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 25, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' }
      }
    });

    doc.save(`SEO-Enrichment-Report.pdf`);
  };

  const downloadLHFPDF = async (lhfData: any[]) => {
    const { jsPDF, autoTable } = await loadPdfKit();
    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('Low Hanging Fruit Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text('Pages with Avg. Position 10+ and keywords at Pos 10+', 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);
    
    const tableData: any[] = [];
    
    lhfData.forEach(row => {
      // Add page row
      tableData.push([
        { content: `PAGE: ${getSlug(row.keys[0])}`, styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.queryCount?.toString() || '0', styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.impressions.toLocaleString(undefined, { maximumFractionDigits: 0 }), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.clicks.toFixed(1), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.position.toFixed(1), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } }
      ]);

      // Find queries for this page with position >= 10
      const queries = data
        .filter(d => d.keys[1] === row.keys[0] && d.position >= 10)
        .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);

      queries.forEach(q => {
        tableData.push([
          { content: `  - ${q.keys[0]}`, styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: '1', styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: q.impressions.toLocaleString(), styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: q.clicks.toLocaleString(), styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: q.position.toFixed(1), styles: { fontSize: 9, textColor: [107, 114, 128] } }
        ]);
      });
    });

    autoTable(doc, {
      head: [['Page / Query', 'Queries', 'Avg. Impressions', 'Avg. Clicks', 'Avg. Position']],
      body: tableData,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 25, halign: 'right' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' }
      }
    });

    doc.save(`SEO-LHF-Report.pdf`);
  };

  const downloadAiPDF = async (aiData: any[]) => {
    const { jsPDF, autoTable } = await loadPdfKit();
    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('AI Search Audit Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text('Pages with informational/question-based queries (Position > 6)', 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);
    
    const tableData: any[] = [];
    const aiQuestionWords = ['apa', 'siapa', 'kapan', 'dimana', 'mengapa', 'bagaimana', 'apakah', 'bisakah', 'berapa', '?'];

    aiData.forEach(row => {
      // Add page row
      tableData.push([
        { content: `PAGE: ${getSlug(row.keys[0])}`, styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.clicks.toFixed(1), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.impressions.toLocaleString(undefined, { maximumFractionDigits: 0 }), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: `${(row.ctr * 100).toFixed(2)}%`, styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.position.toFixed(1), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } }
      ]);

      // Find question queries for this page with position > 6
      const queries = data
        .filter(d => d.keys[1] === row.keys[0] && d.position > 6 && aiQuestionWords.some(word => d.keys[0]?.toLowerCase().includes(word)))
        .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);

      queries.forEach(q => {
        tableData.push([
          { content: `  - ${q.keys[0]}`, styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: q.clicks.toLocaleString(), styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: q.impressions.toLocaleString(), styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: `${(q.ctr * 100).toFixed(2)}%`, styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: q.position.toFixed(1), styles: { fontSize: 9, textColor: [107, 114, 128] } }
        ]);
      });
    });

    autoTable(doc, {
      head: [['Page / Question Query', 'Avg. Clicks', 'Avg. Impressions', 'Avg. CTR', 'Avg. Position']],
      body: tableData,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 25, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' }
      }
    });

    doc.save(`SEO-AI-Search-Report.pdf`);
  };

  const downloadZeroPDF = async (zeroData: any[]) => {
    const { jsPDF, autoTable } = await loadPdfKit();
    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('Zero Traffic Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text('Pages with impressions but zero clicks', 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);
    
    const tableData: any[] = [];
    
    zeroData.forEach(row => {
      // Add page row
      tableData.push([
        { content: `PAGE: ${getSlug(row.keys[0])}`, styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.queryCount?.toString() || '0', styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.impressions.toLocaleString(undefined, { maximumFractionDigits: 0 }), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.clicks.toFixed(1), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.position.toFixed(1), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } }
      ]);

      // Find queries for this page
      const queries = data
        .filter(d => d.keys[1] === row.keys[0])
        .sort((a, b) => b.impressions - a.impressions);

      queries.forEach(q => {
        tableData.push([
          { content: `  - ${q.keys[0]}`, styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: '1', styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: q.impressions.toLocaleString(), styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: q.clicks.toLocaleString(), styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: q.position.toFixed(1), styles: { fontSize: 9, textColor: [107, 114, 128] } }
        ]);
      });
    });

    autoTable(doc, {
      head: [['Page / Query', 'Queries', 'Avg. Impressions', 'Avg. Clicks', 'Avg. Position']],
      body: tableData,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 25, halign: 'right' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' }
      }
    });

    doc.save(`SEO-Zero-Traffic-Report.pdf`);
  };

  const downloadConsolidationPDF = async (consolidationData: any[]) => {
    const { jsPDF, autoTable } = await loadPdfKit();
    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('Keyword Consolidation Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text('Queries ranking on multiple pages (Cannibalization)', 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);
    
    const tableData: any[] = [];

    consolidationData.forEach(row => {
      // Add query row
      tableData.push([
        { content: `QUERY: ${row.keys[0]}`, styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.clicks.toLocaleString(), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.impressions.toLocaleString(undefined, { maximumFractionDigits: 0 }), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: `${(row.ctr * 100).toFixed(2)}%`, styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } },
        { content: row.position.toFixed(1), styles: { fontStyle: 'bold', fillColor: [249, 250, 251] } }
      ]);

      // Find pages for this query
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

      const uniquePages = Array.from(pagesMap.entries())
        .map(([url, vals]) => ({
          url,
          clicks: vals.clicks,
          impressions: vals.impressions,
          ctr: vals.impressions > 0 ? vals.clicks / vals.impressions : 0,
          position: vals.position.reduce((a, b) => a + b, 0) / vals.position.length
        }))
        .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);

      uniquePages.forEach(p => {
        tableData.push([
          { content: `  - ${getSlug(p.url)}`, styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: p.clicks.toLocaleString(), styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: p.impressions.toLocaleString(), styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: `${(p.ctr * 100).toFixed(2)}%`, styles: { fontSize: 9, textColor: [107, 114, 128] } },
          { content: p.position.toFixed(1), styles: { fontSize: 9, textColor: [107, 114, 128] } }
        ]);

        /* GA4 stats removed as requested */
      });
    });

    autoTable(doc, {
      head: [['Query / Page', 'Clicks', 'Impressions', 'CTR', 'Position']],
      body: tableData,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 25, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 25, halign: 'right' },
        4: { cellWidth: 25, halign: 'right' }
      }
    });

    doc.save(`SEO-Consolidation-Report.pdf`);
  };

  const downloadScrollPDF = async (scrollData: any[]) => {
    const { jsPDF, autoTable } = await loadPdfKit();
    const doc = new jsPDF() as any;
    
    // Filter data if some are selected
    const dataToExport = selectedScrollPages.size > 0 
      ? scrollData.filter(row => selectedScrollPages.has(row.keys[0]))
      : scrollData;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('Scroll Optimization Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(`Page scroll depth analysis (GA4 Events)${selectedScrollPages.size > 0 ? ` (${selectedScrollPages.size} selected)` : ''}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);
    
    const tableData = dataToExport.map(row => {
      const ga4 = getGa4StatsForPage(row.keys[0]);
      const sessions = ga4['sessions'] || 0;
      const getPerc = (val: number) => sessions > 0 ? `${((val / sessions) * 100).toFixed(1)}%` : '0%';
      return [
        getSlug(row.keys[0]),
        sessions,
        getPerc(ga4[evKey(25)] || 0),
        getPerc(ga4[evKey(50)] || 0),
        getPerc(ga4[evKey(75)] || 0)
      ];
    });

    autoTable(doc, {
      head: [['Page URL', 'Sessions', 'Scroll 25%', 'Scroll 50%', 'Scroll 75%']],
      body: tableData,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' }
      }
    });

    doc.save(`SEO-Scroll-Optimization-Report.pdf`);
  };

  const downloadErPDF = async (erData: any[]) => {
    const { jsPDF, autoTable } = await loadPdfKit();
    const doc = new jsPDF() as any;
    
    // Filter data if some are selected
    const dataToExport = selectedErPages.size > 0 
      ? erData.filter(row => selectedErPages.has(row.keys[0]))
      : erData;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('ER Optimization Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(`Engagement Rate Analysis - Sub-tab: ${erSubTab}${selectedErPages.size > 0 ? ` (${selectedErPages.size} selected)` : ''}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);
    
    const tableData = dataToExport.map(row => {
      const ga4 = getGa4StatsForPage(row.keys[0]);
      const sessions = ga4['sessions'] || 0;
      const er = ga4['engagement_rate'] || 0;
      return [
        getSlug(row.keys[0]),
        sessions.toLocaleString(),
        `${(er * 100).toFixed(2)}%`
      ];
    });

    autoTable(doc, {
      head: [['Page URL', 'Sessions', 'Engagement Rate']],
      body: tableData,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 3 },
    });

    doc.save(`SEO-ER-Optimization-${erSubTab}-Report.pdf`);
  };

  const downloadCtaPDF = async (ctaData: any[]) => {
    const { jsPDF, autoTable } = await loadPdfKit();
    const doc = new jsPDF() as any;
    
    // Filter data if some are selected
    const dataToExport = selectedCtaPages.size > 0 
      ? ctaData.filter(row => selectedCtaPages.has(row.keys[0]))
      : ctaData;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(5, 150, 105); // emerald-600
    doc.text('CTA Optimization Report', 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(107, 114, 128); // gray-500
    doc.text(`CTA Analysis - Sub-tab: ${ctaSubTab}${selectedCtaPages.size > 0 ? ` (${selectedCtaPages.size} selected)` : ''}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 36);
    
    const tableData = dataToExport.map(row => {
      const ga4 = getGa4StatsForPage(row.keys[0]);
      const sessions = ga4['sessions'] || 0;
      const ctaPerc = sessions > 0 ? (ctaTotal(ga4) / sessions) * 100 : 0;
      
      return [
        getSlug(row.keys[0]),
        sessions.toLocaleString(),
        `${ctaPerc.toFixed(2)}%`
      ];
    });

    autoTable(doc, {
      head: [['Page URL', 'Sessions', 'CTA %']],
      body: tableData,
      startY: 45,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      styles: { fontSize: 10, cellPadding: 3 },
    });

    doc.save(`SEO-CTA-Optimization-${ctaSubTab}-Report.pdf`);
  };

  useEffect(() => {
    setSelectedCtrPosition(null);
    setSelectedCtrPage(null);
    setExpandedDecliningPage(null);
    setExpandedEnrichmentPage(null);
    setExpandedZeroPage(null);
    setExpandedLhfPage(null);
    setExpandedAiPage(null);
    setExpandedConsolidationQuery(null);
    setSelectedCtaPages(new Set());
  }, [auditTab]);

  useEffect(() => {
    setSelectedCtaPages(new Set());
  }, [ctaSubTab]);

  useEffect(() => {
    setSelectedCtrPage(null);
  }, [selectedCtrPosition]);

  useEffect(() => {
    checkAuthStatus();
    
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsConnected(true);
        // hanyalari saat sedang di layar pilih-properti (memuat ulang data);
        // jangan angkat gerbang project / dashboard ke layar connect
        if (viewStateRef.current === 'select') fetchSites();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const checkAuthStatus = async () => {
    if (!user) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/auth/status', { headers });
      if (!res.ok) {
        console.error('Auth check: server balas', res.status);
        return;
      }
      const status = await res.json();
      setIsConnected(status.connected);
      // PERBAIKAN: jangan pernah memindahkan halaman — cek ini dipanggil berkali-kali
      // (mis. saat refresh token otomatis), yang dulu menyeret dashboard kembali
      // ke layar connect GSC. Cukup isi ulang daftar kalau memang sedang di layar itu.
      if (status.connected && viewStateRef.current === 'select') {
        fetchSites();
      }
    } catch (err) {
      console.error('Auth check failed', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Pulihkan sesi setelah refresh: kalau project terakhir sudah connect GSC/GA4,
  // langsung kembali ke dashboard (bukan gerbang pilih project).
  const restoreSessionToDashboard = async (): Promise<boolean> => {
    try {
      // Satu permintaan saja: daftar project sudah menyertakan gsc_site/ga4_property
      // per project (lihat listProjects di shared) — tanpa langkah tambahan yang bisa gagal.
      const headers = await getAuthHeaders();
      if (!('Authorization' in headers)) { return false; }
      const res = await fetch('/api/projects', { headers });
      if (!res.ok) { return false; }
      const d = await res.json();
      const list: any[] = d.projects || [];
      if (list.length === 0) { return false; }
      // prioritas: project terakhir dipakai (yang sudah connect) → project mana pun
      // yang sudah connect → kalau tidak ada satupun, kembali ke gerbang.
      const saved = localStorage.getItem('razeo_project');
      const proj =
        list.find((pp) => pp.id === saved && pp.gsc_site) ||
        list.find((pp) => pp.gsc_site) ||
        list.find((pp) => pp.id === saved) ||
        list[0];
        if (!proj.gsc_site) { return false; } // tidak ada project tersambung → gerbang dulu
      localStorage.setItem('razeo_project', proj.id);
      setActiveProjectId(proj.id);
      setProjectRole(proj.role ?? null);
      setProjectConnection({ gsc_site: proj.gsc_site, ga4_property: proj.ga4_property ?? null, connected_at: null });
      setSelectedSite(proj.gsc_site);
      setSelectedGa4Property(proj.ga4_property ?? null);
      setViewState('dashboard');
      fetchData(proj.gsc_site); // isi data (spinner kartu yang menandai proses)
      return true;
    } catch {
      return false;
    }
  };

  // ===== Tab OVERVIEW: muat ringkasan GSC + GA4 (filter durasi pakai startDate/endDate) =====
    // ===== Tab Insight (branding + returning user) =====
  const [insight, setInsight] = useState<{ branded: any; users: any } | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightNote, setInsightNote] = useState<string | null>(null);
  const loadInsight = async (sd = startDate, ed = endDate) => {
    if (!selectedSite) { setInsight(null); setInsightNote('Pilih property Search Console dulu di halaman properti.'); return; }
    setInsightLoading(true);
    const headers = await getAuthHeaders();
    if (!('Authorization' in headers)) { setInsightNote('Sesi tidak terbaca — muat ulang halaman.'); setInsightLoading(false); return; }
    // GSC: agregat impresi/klik/CTR keyword branded
    let branded: any = { keywords: [], summary: { impressions: 0, clicks: 0, ctr: 0 } };
    let gscErr: string | null = null;
    try {
      const q = new URLSearchParams({
        action: 'branded', siteUrl: String(selectedSite), startDate: sd, endDate: ed,
        keywords: (evCfg.branded || []).map((k) => (k || '').trim()).filter(Boolean).join(','),
      });
      const r = await fetch(`/api/gsc/data?${q.toString()}`, { headers });
      if (r.ok) branded = await r.json();
      else gscErr = (await r.json().catch(() => ({})))?.error || `GSC (${r.status})`;
    } catch (e: any) { gscErr = e?.message || 'GSC gagal dimuat'; }
    // GA4: total/new/returning users → % returning (opsional: property belum dipilih = kosong)
    let users: any = null;
    let ga4Err: string | null = null;
    const pid = selectedGa4Property?.split('/').pop();
    if (pid) {
      try {
        const r = await fetch(`/api/ga4/data?action=users&propertyId=${pid}&startDate=${sd}&endDate=${ed}`, { headers });
        if (r.ok) users = await r.json();
        else ga4Err = (await r.json().catch(() => ({})))?.error || `GA4 (${r.status})`;
      } catch (e: any) { ga4Err = e?.message || 'GA4 gagal dimuat'; }
    }
    setInsight({ branded, users });
    setInsightNote([gscErr, ga4Err].filter(Boolean).join(' • ') || null);
    setInsightLoading(false);
  };
const loadOverview = async (sd = startDate, ed = endDate) => {
    if (!selectedSite) { setOvData(null); setOvNote('Pilih property Search Console dulu di halaman properti.'); return; }
    setOvLoading(true);
    try {
      const headers = await getAuthHeaders();
      if (!('Authorization' in headers)) { setOvNote('Sesi tidak terbaca — muat ulang halaman.'); return; }
      setOvNote(null);
      // GSC: ringkasan + top page + top query
      const g = await fetch(`/api/gsc/data?action=overview&siteUrl=${encodeURIComponent(selectedSite)}&startDate=${sd}&endDate=${ed}`, { headers });
      if (!g.ok) throw new Error((await g.json().catch(() => ({})))?.error || `GSC (${g.status})`);
      const gsc = await g.json();
      // ringkasan periode pembanding (tampil saat tombol Compare aktif)
      let gscPrev: any = null;
      if (isComparing) {
        try {
          const cp = await fetch(`/api/gsc/data?action=overview&siteUrl=${encodeURIComponent(selectedSite)}&startDate=${compareStartDate}&endDate=${compareEndDate}`, { headers });
          if (cp.ok) gscPrev = (await cp.json()) as any;
        } catch { /* pembanding opsional — abaikan bila gagal */ }
      }
      // GA4: sumber trafik + kota (opsional — property belum dipilih = kosong, bukan error)
      let topSources: any[] = [];
      let topCities: any[] = [];
      let totalSessions = 0;
      let totalSessionsPrev = 0;
      let sesiHarian: any[] = [];
      let sesiPeriod: any[] = [];
      let sesiHarianPrev: any[] = [];
      let topBrowsers: any[] = [];
      let topOss: any[] = [];
      let topDevices: any[] = [];
      let ga4Note: string | null = null;
      const pid = selectedGa4Property?.split('/').pop();
      if (pid) {
        try {
          const a = await fetch(`/api/ga4/data?action=overview&propertyId=${pid}&startDate=${sd}&endDate=${ed}`, { headers });
          if (a.ok) {
            const da = await a.json();
            topSources = da.topSources || [];
            topCities = da.topCities || [];
            topBrowsers = da.topBrowsers || [];
            topOss = da.topOss || [];
            topDevices = da.topDevices || [];
            totalSessions = da.totalSessions || 0;
            sesiHarian = da.sesiHarian || [];
            sesiPeriod = da.sesiPeriod || [];
            // sesi periode pembanding (kartu Sesi saat Compare + diagram pembanding tidak di bahas)
            if (isComparing) {
              try {
                const ac = await fetch(`/api/ga4/data?action=overview&propertyId=${pid}&startDate=${compareStartDate}&endDate=${compareEndDate}`, { headers });
                if (ac.ok) {
                  const dac = await ac.json();
                  totalSessionsPrev = dac.totalSessions || 0;
                  sesiHarianPrev = dac.sesiHarian || [];
                }
              } catch { /* opsional */ }
            }
          } else {
            ga4Note = 'Sumber trafik/kota tidak bisa dimuat: ' + (a.status === 401 ? 'property GA4 belum terhubung' : `GA4 (${a.status})`);
          }
        } catch (e: any) { ga4Note = 'Sumber trafik/kota tidak bisa dimuat: ' + (e.message || 'gagal'); }
      } else {
        ga4Note = 'Sumber trafik & kota menampilkan — sambungkan property GA4 dulu.';
      }
      setOvData({ gsc, gscPrev, topSources, topCities, totalSessions, totalSessionsPrev, sesiHarian, sesiPeriod, sesiHarianPrev, topBrowsers, topOss, topDevices });
      setOvNote(ga4Note);
    } catch (e: any) {
      setOvData(null);
      setOvNote('Gagal memuat overview: ' + (e.message || 'kesalahan jaringan'));
    } finally {
      setOvLoading(false);
    }
  };

  // ===== Tab CEK: bandingkan periode sekarang vs pembanding per halaman =====
  const loadCek = async (sd = startDate, ed = endDate, cs = compareStartDate, ce = compareEndDate) => {
    if (!selectedSite) { setCekData(null); return; }
    setCekLoading(true);
    try {
      const headers = await getAuthHeaders();
      if (!('Authorization' in headers)) throw new Error('Sesi tidak terbaca');
      const qs = `siteUrl=${encodeURIComponent(selectedSite)}&startDate=${sd}&endDate=${ed}&compareStartDate=${cs}&compareEndDate=${ce}`;
      // GSC: impressions / position / ctr per halaman, dua periode
      const g = await fetch(`/api/gsc/data?action=compare&${qs}`, { headers });
      if (!g.ok) throw new Error((await g.json().catch(() => ({})))?.error || `GSC (${g.status})`);
      const gsc = await g.json();
      // GA4: sesi + scroll 75% per halaman (opsional tanpa property GA4 → kosong)
      let sesi: any = { current: [], previous: [] };
      let scroll75: any = { current: [], previous: [] };
      const pid = selectedGa4Property?.split('/').pop();
      if (pid) {
        try {
          const a = await fetch(`/api/ga4/data?action=compare&propertyId=${pid}&startDate=${sd}&endDate=${ed}&compareStartDate=${cs}&compareEndDate=${ce}&scroll75Event=${encodeURIComponent(evKey(75))}`, { headers });
          if (a.ok) { const d2 = await a.json(); sesi = d2.sessions; scroll75 = d2.scroll75; }
        } catch { /* GA4 opsional */ }
      }
      setCekData({ gsc, sesi, scroll75 });
    } catch (e: any) {
      setCekData(null);
      setError('Gagal memuat data Cek: ' + (e.message || 'jaringan'));
    } finally {
      setCekLoading(false);
    }
  };

  // ===== Tab KONTEN: daftar/tambah/ubah/hapus =====
  const postContent = async (body: any, okExpected = 200) => {
    const headers = await getAuthHeaders();
    if (!('Authorization' in headers)) throw new Error('Sesi tidak terbaca');
    const res = await fetch('/api/projects', { method: 'POST', headers, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { const msg = d.error || `Gagal (${res.status})`; setError(msg); throw new Error(msg); }
    return d;
  };
  const loadContent = async () => {
    setContentLoading(true);
    try {
      const d = await postContent({ action: 'content-list' });
      setContentItems(d.items || []);
    } catch { /* pesan sudah lewat postContent */ }
    finally { setContentLoading(false); }
  };
  const addContent = async (row: any) => {
    try { await postContent({ action: 'content-add', ...row }, 201); await loadContent(); return true; } catch { return false; }
  };
  const updateContent = async (id: string, patch: any) => {
    try { await postContent({ action: 'content-update', id, ...patch }); await loadContent(); return true; } catch { return false; }
  };
  const deleteContent = async (id: string) => {
    try { await postContent({ action: 'content-delete', id }); await loadContent(); return true; } catch { return false; }
  };

  // ===== tab KONTEN > sub-tab Produk: daftar/tambah/ubah/hapus (tabel products) =====
  const loadProducts = async () => {
    setProductLoading(true);
    try {
      const d = await postContent({ action: 'product-list' });
      setProductItems(d.items || []);
    } catch { /* pesan sudah lewat postContent */ }
    finally { setProductLoading(false); }
  };
  const addProduct = async (row: any) => {
    try { await postContent({ action: 'product-add', ...row }, 201); await loadProducts(); return true; } catch { return false; }
  };
  const updateProduct = async (id: string, patch: any) => {
    try { await postContent({ action: 'product-update', id, ...patch }); await loadProducts(); return true; } catch { return false; }
  };
  const deleteProduct = async (id: string) => {
    try { await postContent({ action: 'product-delete', id }); await loadProducts(); return true; } catch { return false; }
  };

  // ===== tab KONTEN > sub-tab Bundle: daftar/tambah/ubah/hapus (tabel bundles) =====
  const loadBundles = async () => {
    setBundleLoading(true);
    try {
      const d = await postContent({ action: 'bundle-list' });
      setBundleItems(d.items || []);
    } catch { /* pesan sudah lewat postContent */ }
    finally { setBundleLoading(false); }
  };
  const addBundle = async (row: any) => {
    try { await postContent({ action: 'bundle-add', ...row }, 201); await loadBundles(); return true; } catch { return false; }
  };
  const updateBundle = async (id: string, patch: any) => {
    try { await postContent({ action: 'bundle-update', id, ...patch }); await loadBundles(); return true; } catch { return false; }
  };
  const deleteBundle = async (id: string) => {
    try { await postContent({ action: 'bundle-delete', id }); await loadBundles(); return true; } catch { return false; }
  };

  // ===== tab TASK: rencana tugas (nama, prioritas, status) =====
  const loadTasks = async () => {
    setTaskLoading(true);
    try {
      const d = await postContent({ action: 'task-list' });
      setTaskItems(d.items || []);
    } catch { /* pesan error sudah di postContent */ }
    setTaskLoading(false);
  };
  const addTask = async (row: any) => {
    try { await postContent({ action: 'task-add', ...row }, 201); await loadTasks(); return true; } catch { return false; }
  };
  const updateTask = async (id: string, patch: any) => {
    try { await postContent({ action: 'task-update', id, ...patch }); await loadTasks(); return true; } catch { return false; }
  };
  const deleteTask = async (id: string) => {
    try { await postContent({ action: 'task-delete', id }); await loadTasks(); return true; } catch { return false; }
  };

  // muat data ketika masuk dashboard (project tersambung) + saat tab dibuka
  useEffect(() => {
    if (viewState === 'dashboard' && (currentTab === 'overview' || currentTab === 'insight' || currentTab === 'dashboard')) {
      /* deps ditambah isComparing di penutup efek */
      if (currentTab === 'overview') loadOverview();
      if (currentTab === 'insight') loadInsight();
      else {
        fetchSites();
        if (selectedSite && data.length === 0) fetchData(selectedSite); // isi data dashboard kalau belum ada
      }
    }
    if (viewState === 'dashboard' && (currentTab === 'konten' || currentTab === 'visualisasi')) loadContent();
      loadProducts(); // sub-tab Produk ikut dimuat bersama konten
      loadBundles();  // sub-tab Bundle ikut dimuat bersama konten
    if (viewState === 'dashboard' && currentTab === 'task') loadTasks();
    if (viewState === 'dashboard' && currentTab === 'cek') loadCek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewState, currentTab, activeProjectId, isComparing]);

  // ===== Sinkron URL ↔ layar aktif =====
  const bootedRef = useRef(false);
  useEffect(() => {
    // sebelum status login diketahui, URL yang diminta user dipertahankan
    // (mis. membuka /dashboard langsung — jangan diubah ke '/' dulu)
    if (viewState === 'login') {
      return; // selama status login belum diputuskan, URL TIDAK disentuh sama sekali
    }
    let path = VIEW_PATHS[viewState] ?? '/';
    let targetTab: TabId | null = null;
    if (viewState === 'dashboard') {
      // direct-open / refresh di URL tab (mis. /konten, /task) → hormati & pulihkan tabnya (R1: satu arbiter)
      const t = segToTab(window.location.pathname);
      if (t) { targetTab = t; path = TAB_PATHS[t]; }
    }
    if (window.location.pathname === path) {
      if (targetTab && currentTabRef.current !== targetTab) setCurrentTabState(targetTab);
      bootedRef.current = true; return;
    }
    if (!bootedRef.current) {
      // ganti URL sekali saat aplikasi menyala — riwayat tak menumpuk dengan pengganti
      window.history.replaceState(null, '', path);
      if (targetTab && currentTabRef.current !== targetTab) setCurrentTabState(targetTab);
      bootedRef.current = true;
    } else {
      window.history.pushState(null, '', path);
    }
  }, [viewState]);

  // tombol Back/Forward peramban → layar disesuaikan ke URL tujuan
  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname;
      let target: 'login' | 'project' | 'select' | 'dashboard' = PATH_VIEWS[p] ?? 'login';
      const t = segToTab(p);
      if (t) {
        target = 'dashboard'; // slug tab → layar dashboard, tabnya dipulihkan di bawah
        if (currentTabRef.current !== t) setCurrentTabState(t);
      }
      viewStateRef.current = target;
      setViewState(target);
      // landing ('login') saat ada user akan disalurkan efek pengaman ke gerbang
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Klik tab di sidebar/strip → tulis slug tab ke URL (Back/Forward peramban jalan)
  useEffect(() => {
    if (viewState !== 'dashboard') return;
    const path = TAB_PATHS[currentTab];
    if (!path || window.location.pathname === path) return;
    if (!bootedRef.current) return; // saat boot, efek sinkron viewState di atas yang menulis
    window.history.pushState(null, '', path);
  }, [currentTab, viewState]);

  // (Perpindahan pengaman dihapus — jumpa di render: selama user ada dan layar
  // masih 'login', yang tampil loader, BUKAN landing dan BUKAN perpindahan view.
  // Layar final diputuskan restoreSessionToDashboard di bawah.)

  useEffect(() => {
    if (user) {
      (async () => {
        // Saat baru masuk — layar bisa 'login' (normal) atau sudah 'project'
        // (pengaman di atas sempat menyetelnya). Restore tetap dicoba agar
        // refresh dari dashboard langsung kembali ke dashboard.
        if (viewStateRef.current === 'login' || viewStateRef.current === 'project') {
          const restored = await restoreSessionToDashboard();
          if (!restored && viewStateRef.current === 'login') {
            // tidak ada project tersambung → gerbang pilih/buat project
            viewStateRef.current = 'project';
            setViewState('project');
          }
        }
        checkAuthStatus();
      })();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const fetchSites = async () => {
    try {
      const headers = await getAuthHeaders();
      const gscRes = await fetch('/api/gsc/sites', { headers });
      const sitesData = await gscRes.json();
      if (!gscRes.ok || Array.isArray(sitesData) === false) {
        const msg = sitesData?.error || `GSC (${gscRes.status})`;
        setSites([]);
        if (gscRes.status === 401 && String(sitesData?.error || '').includes('Token'))
          setError('Sesi Google perlu dihubungkan ulang — klik "Hubungkan Akun Google Dulu".');
        else if (gscRes.status === 401 && msg.includes('belum hubungkan'))
          setError(null); // kondisi normal → petunjuk tombol connect yang mengurus
        else if (gscRes.status === 401 || gscRes.status === 403)
          setError('Belum hubungkan akun Google: ' + msg);
        else
          setError('Gagal memuat daftar properti Search Console: ' + msg);
        return;
      }
      setSites(sitesData);
      if (Array.isArray(sitesData) && sitesData.length === 0 && projectRole === 'owner' && !isConnected) {
        // belum connect → tombol connect di bawah yang mengurus
        return;
      }
      
      const ga4Res = await fetch('/api/ga4/properties', { headers });
      const ga4Data = await ga4Res.json();
      if (ga4Res.ok && Array.isArray(ga4Data)) {
        setGa4Properties(ga4Data);
      }
    } catch (err) {
      setError('Failed to load sites or properties');
    }
  };

  const fetchData = async (siteUrl: string) => {
    if (new Date(startDate) > new Date(endDate)) {
      setError('Start date cannot be after end date.');
      return;
    }
    if (isComparing && new Date(compareStartDate) > new Date(compareEndDate)) {
      setError('Comparison start date cannot be after end date.');
      return;
    }

    setIsFetchingData(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      // Fetch current period
      const res = await fetch(`/api/gsc/data?siteUrl=${encodeURIComponent(siteUrl)}&startDate=${startDate}&endDate=${endDate}`, { headers });
      const gscResponse = await res.json();
      
      if (res.status !== 200) {
        throw new Error(gscResponse.error || 'Failed to fetch GSC data');
      }

      if (gscResponse.rows) {
        setData(gscResponse.rows);
        setSummary(gscResponse.summary);
        setTimeSeries(gscResponse.timeSeries);
        setViewState('dashboard');
      } else {
        setData([]);
        setSummary(null);
        setTimeSeries([]);
        setError('No data returned for current period.');
      }

      // Fetch comparison period if enabled
      if (isComparing) {
        const compRes = await fetch(`/api/gsc/data?siteUrl=${encodeURIComponent(siteUrl)}&startDate=${compareStartDate}&endDate=${compareEndDate}`, { headers });
        const compResponse = await compRes.json();
        
        if (compRes.status !== 200) {
          throw new Error(compResponse.error || 'Failed to fetch comparison data');
        }

        if (compResponse.rows) {
          setComparisonData(compResponse.rows);
          setComparisonSummary(compResponse.summary);
          setComparisonTimeSeries(compResponse.timeSeries);
        } else {
          setComparisonData([]);
          setComparisonSummary(null);
          setComparisonTimeSeries([]);
        }
      } else {
        setComparisonData([]);
        setComparisonSummary(null);
        setComparisonTimeSeries([]);
      }

      // Fetch GA4 data if property is selected
      if (selectedGa4Property) {
        try {
          const evList = [...(evCfg.ctas || []), evCfg.scroll25, evCfg.scroll50, evCfg.scroll75].filter(Boolean).join(',');
      const ga4Res = await fetch(`/api/ga4/data?propertyId=${selectedGa4Property.split('/').pop()}&startDate=${startDate}&endDate=${endDate}&events=${encodeURIComponent(evList)}`, { headers });
          const ga4Data = await ga4Res.json();
          if (ga4Res.ok) {
            setGa4Data(ga4Data);
          } else if (ga4Data.error && ga4Data.error.includes("Google Analytics Data API is not enabled")) {
            setError(ga4Data.error);
          }
        } catch (err) {
          console.error('Failed to fetch GA4 data:', err);
        } finally {
        }
      } else {
        setGa4Data([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch GSC data');
    } finally {
      setIsFetchingData(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/auth/url', { headers });
      const data = await res.json();
      
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to get authentication URL. Please check your Google OAuth credentials in the Settings menu.');
      }
      
      window.open(data.url, 'oauth_popup', 'width=600,height=700');
    } catch (err: any) {
      console.error("Connect Error:", err);
      setError(err.message || 'Failed to start connection');
    } finally {
      setIsConnecting(false);
    }
  };


  useEffect(() => {
    if (selectedSite && viewState === 'dashboard') {
      if (currentTab === 'dashboard') fetchData(selectedSite);
      if (currentTab === 'overview') loadOverview();
      if (currentTab === 'insight') loadInsight();
      if (currentTab === 'cek') loadCek();
    }
  }, [startDate, endDate, compareStartDate, compareEndDate, isComparing, currentTab, viewState, selectedSite]);

  if (isLoading) return <BootScreen />;

  // user sudah ada tapi halaman belum diputuskan (restore sedang jalan) → loader, bukan landing
  if (viewState === 'login' && user) return <BootScreen />;

  if (viewState === 'login') {
    return (
      <LoginScreen
        error={error}
        setError={setError}
        user={user}
        handleLogin={handleLogin}
        isLoggingIn={isLoggingIn}
        handleConnect={handleConnect}
        isConnecting={isConnecting}
      />
    );
  }

  // Gerbang project — pilih/buat project sebelum masuk dashboard
  if (viewState === 'project') {
    return (
      <ProjectGate
        error={error}
        setError={setError}
        projects={projects}
        activeProjectId={activeProjectId}
        handleCreateProjectWith={handleCreateProject}
        handleRenameProject={handleRenameProject}
        handleDeleteProject={handleDeleteProject}
        user={user}
        enterProject={enterProject}
        handleLogout={handleLogout}
      />
    );
  }

  if (viewState === 'select') {
    return (
      <PropertyScreen
        error={error}
        setError={setError}
        projects={projects}
        activeProjectId={activeProjectId}
        projectRole={projectRole}
        projectConnection={projectConnection}
        sites={sites}
        ga4Properties={ga4Properties}
        selectedSite={selectedSite}
        setSelectedSite={setSelectedSite}
        selectedGa4Property={selectedGa4Property}
        setSelectedGa4Property={setSelectedGa4Property}
        isConnected={isConnected}
        projectWorking={projectWorking}
        isFetchingData={isFetchingData}
        handleConnect={handleConnect}
        isConnecting={isConnecting}
        handleSaveConnection={handleSaveConnection}
        fetchData={fetchData}
        handleLogout={handleLogout}
      />
    );
  }

  // Dashboard View
  const isMainRecent = !isComparing || new Date(startDate) >= new Date(compareStartDate);
  
  const activeSummary = isMainRecent ? summary : comparisonSummary;
  const activeComparisonSummary = isMainRecent ? comparisonSummary : summary;
  const activeData = isMainRecent ? data : comparisonData;
  const activeComparisonData = isMainRecent ? comparisonData : data;
  const activeTimeSeries = isMainRecent ? timeSeries : comparisonTimeSeries;
  const activeComparisonTimeSeries = isMainRecent ? comparisonTimeSeries : timeSeries;

  const totalClicks = activeSummary?.clicks || 0;
  const totalImpressions = activeSummary?.impressions || 0;
  const avgCtr = (activeSummary?.ctr || 0) * 100;
  const avgPos = activeSummary?.position || 0;

  const totalGa4Events = ga4Data.reduce((acc, row) => acc + parseInt(row.metricValues[0].value), 0);
  const totalSales = ga4Data
    .filter(row => row.dimensionValues[1].value.includes('purchase'))
    .reduce((acc, row) => acc + parseInt(row.metricValues[0].value), 0);

  const compClicks = activeComparisonSummary?.clicks || 0;
  const compImpressions = activeComparisonSummary?.impressions || 0;
  const compCtr = (activeComparisonSummary?.ctr || 0) * 100;
  const compPos = activeComparisonSummary?.position || 0;

  const getChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const renderChange = (current: number, previous: number, inverse = false) => {
    if (!isComparing) return null;
    const change = getChange(current, previous);
    if (change === 0) return <div className="text-[10px] font-bold text-gray-400">—</div>;
    
    const isPositive = change > 0;
    const isGood = inverse ? !isPositive : isPositive;
    
    return (
      <div className={cn(
        "text-[10px] font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full",
        isGood ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
      )}>
        {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
      </div>
    );
  };

  // Top Pages (simplified from query/page dimensions)
  const topQueries = [...activeData]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);

  const getMonthlyData = (rows: GSCRow[]) => {
    const monthly: Record<string, { date: string, clicks: number, impressions: number }> = {};
    rows.forEach(row => {
      const d = new Date(row.keys[0]);
      if (isNaN(d.getTime())) return;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[monthKey]) {
        monthly[monthKey] = { 
          date: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), 
          clicks: 0, 
          impressions: 0 
        };
      }
      monthly[monthKey].clicks += row.clicks;
      monthly[monthKey].impressions += row.impressions;
    });
    return Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, val]) => val);
  };

  const currentMonthly = getMonthlyData(activeTimeSeries);
  const prevMonthly = getMonthlyData(activeComparisonTimeSeries);

  const monthlyChartData = currentMonthly.map((curr, i) => ({
    ...curr,
    prevClicks: prevMonthly[i]?.clicks,
    prevImpressions: prevMonthly[i]?.impressions,
  }));

  const chartData = activeTimeSeries.length > 31 ? monthlyChartData : activeTimeSeries.map((row, i) => ({
    ...row,
    date: row.keys[0],
    prevClicks: activeComparisonTimeSeries[i]?.clicks,
    prevImpressions: activeComparisonTimeSeries[i]?.impressions,
  }));

  // Audit Logic
  const getAuditData = () => {
    let filtered = [...activeData];

    if (searchQuery) {
      filtered = filtered.filter(row => 
        row.keys[0]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.keys[1]?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    switch (auditTab) {
      case 'lhf':
        const pageGroups = new Map<string, { clicks: number[], impressions: number[], ctr: number[], position: number[], hasLowPosQuery: boolean, queries: Set<string> }>();
        activeData.forEach(row => {
          const page = row.keys[1];
          if (!page || page.includes('#')) return;
          if (!inRole(page)) return;
          
          if (!pageGroups.has(page)) {
            pageGroups.set(page, { clicks: [], impressions: [], ctr: [], position: [], hasLowPosQuery: false, queries: new Set() });
          }
          const group = pageGroups.get(page)!;
          group.clicks.push(row.clicks);
          group.impressions.push(row.impressions);
          group.ctr.push(row.ctr);
          group.position.push(row.position);
          if (row.keys[0]) group.queries.add(row.keys[0]);
          if (row.position >= 10) {
            group.hasLowPosQuery = true;
          }
        });

        let aggregated = Array.from(pageGroups.entries())
          .map(([page, vals]) => ({
            keys: [page],
            clicks: vals.clicks.reduce((a, b) => a + b, 0) / vals.clicks.length,
            impressions: vals.impressions.reduce((a, b) => a + b, 0) / vals.impressions.length,
            ctr: vals.ctr.reduce((a, b) => a + b, 0) / vals.ctr.length,
            position: vals.position.reduce((a, b) => a + b, 0) / vals.position.length,
            hasLowPosQuery: vals.hasLowPosQuery,
            queryCount: vals.queries.size
          }))
          .filter(row => row.position >= 10 && row.hasLowPosQuery);

        if (searchQuery) {
          aggregated = aggregated.filter(row => row.keys[0].toLowerCase().includes(searchQuery.toLowerCase()));
        }

        return aggregated.sort((a, b) => {
          const factor = lhfSort.order === 'asc' ? 1 : -1;
          if (lhfSort.col === 'clicks') return (a.clicks - b.clicks) * factor;
          if (lhfSort.col === 'impressions') return (a.impressions - b.impressions) * factor;
          return (a.position - b.position) * factor;
        });
      case 'zero':
        // First, identify LHF pages to exclude them
        const lhfPagesForZero = new Set<string>();
        const tempLhfGroupsForZero = new Map<string, { position: number[], hasLowPosQuery: boolean }>();
        activeData.forEach(row => {
          const page = row.keys[1];
          if (!page || page.includes('#')) return;
          if (!tempLhfGroupsForZero.has(page)) {
            tempLhfGroupsForZero.set(page, { position: [], hasLowPosQuery: false });
          }
          const group = tempLhfGroupsForZero.get(page)!;
          group.position.push(row.position);
          if (row.position >= 10) group.hasLowPosQuery = true;
        });
        
        tempLhfGroupsForZero.forEach((vals, page) => {
          const avgPos = vals.position.reduce((a, b) => a + b, 0) / vals.position.length;
          if (avgPos >= 10 && vals.hasLowPosQuery) {
            lhfPagesForZero.add(page);
          }
        });

        const zeroPageGroups = new Map<string, { clicks: number[], impressions: number[], ctr: number[], position: number[], queries: Set<string> }>();
        activeData.forEach(row => {
          const page = row.keys[1];
          const query = row.keys[0];
          if (!page || page.includes('#')) return;
          if (!inRole(page)) return;
          if (lhfPagesForZero.has(page)) return; // EXCLUDE LHF PAGES
          
          if (!zeroPageGroups.has(page)) {
            zeroPageGroups.set(page, { clicks: [], impressions: [], ctr: [], position: [], queries: new Set() });
          }
          const group = zeroPageGroups.get(page)!;
          group.clicks.push(row.clicks);
          group.impressions.push(row.impressions);
          group.ctr.push(row.ctr);
          group.position.push(row.position);
          if (query) group.queries.add(query);
        });

        let aggregatedZero = Array.from(zeroPageGroups.entries())
          .map(([page, vals]) => ({
            keys: [page],
            clicks: vals.clicks.reduce((a, b) => a + b, 0),
            impressions: vals.impressions.reduce((a, b) => a + b, 0) / vals.impressions.length,
            ctr: vals.ctr.reduce((a, b) => a + b, 0) / vals.ctr.length,
            position: vals.position.reduce((a, b) => a + b, 0) / vals.position.length,
            queryCount: vals.queries.size
          }))
          .filter(row => row.clicks === 0 && (row.queryCount || 0) < 6);

        if (searchQuery) {
          aggregatedZero = aggregatedZero.filter(row => row.keys[0].toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return aggregatedZero.sort((a, b) => b.impressions - a.impressions);
      case 'enrichment':
        // First, identify LHF pages to exclude them
        const lhfPages = new Set<string>();
        const tempLhfGroups = new Map<string, { position: number[], hasLowPosQuery: boolean }>();
        activeData.forEach(row => {
          const page = row.keys[1];
          if (!page || page.includes('#')) return;
          if (!tempLhfGroups.has(page)) {
            tempLhfGroups.set(page, { position: [], hasLowPosQuery: false });
          }
          const group = tempLhfGroups.get(page)!;
          group.position.push(row.position);
          if (row.position >= 10) group.hasLowPosQuery = true;
        });
        
        tempLhfGroups.forEach((vals, page) => {
          const avgPos = vals.position.reduce((a, b) => a + b, 0) / vals.position.length;
          if (avgPos >= 10 && vals.hasLowPosQuery) {
            lhfPages.add(page);
          }
        });

        const enrichmentPageGroups = new Map<string, { clicks: number[], impressions: number[], ctr: number[], position: number[], hasLowPosQuery: boolean }>();
        activeData.forEach(row => {
          const page = row.keys[1];
          if (!page || page.includes('#')) return;
          if (!inRole(page)) return;
          if (getSlug(page) === '/') return;
          if (lhfPages.has(page)) return; // EXCLUDE LHF PAGES
          
          if (!enrichmentPageGroups.has(page)) {
            enrichmentPageGroups.set(page, { clicks: [], impressions: [], ctr: [], position: [], hasLowPosQuery: false });
          }
          const group = enrichmentPageGroups.get(page)!;
          group.clicks.push(row.clicks);
          group.impressions.push(row.impressions);
          group.ctr.push(row.ctr);
          group.position.push(row.position);
          if (row.position >= 10) {
            group.hasLowPosQuery = true;
          }
        });

        let aggregatedEnrichment = Array.from(enrichmentPageGroups.entries())
          .map(([page, vals]) => ({
            keys: [page],
            clicks: vals.clicks.reduce((a, b) => a + b, 0),
            impressions: vals.impressions.reduce((a, b) => a + b, 0),
            ctr: vals.impressions.reduce((a, b) => a + b, 0) > 0 
              ? vals.clicks.reduce((a, b) => a + b, 0) / vals.impressions.reduce((a, b) => a + b, 0) 
              : 0,
            position: vals.position.reduce((a, b) => a + b, 0) / vals.position.length,
            hasLowPosQuery: vals.hasLowPosQuery
          }))
          .filter(row => row.position >= 1 && row.position <= 10 && row.hasLowPosQuery);

        if (searchQuery) {
          aggregatedEnrichment = aggregatedEnrichment.filter(row => row.keys[0].toLowerCase().includes(searchQuery.toLowerCase()));
        }

        return aggregatedEnrichment.sort((a, b) => {
          const factor = enrichmentSort.order === 'asc' ? 1 : -1;
          if (enrichmentSort.col === 'clicks') return (a.clicks - b.clicks) * factor;
          if (enrichmentSort.col === 'impressions') return (a.impressions - b.impressions) * factor;
          return (a.position - b.position) * factor;
        });
      case 'ai':
        const aiQuestionWords = ['apa', 'siapa', 'kapan', 'dimana', 'mengapa', 'bagaimana', 'apakah', 'bisakah', 'berapa', '?'];
        const aiPageGroups = new Map<string, { clicks: number[], impressions: number[], ctr: number[], position: number[], hasQuestion: boolean }>();
        
        activeData.forEach(row => {
          const page = row.keys[1];
          const query = row.keys[0];
          if (!page || page.includes('#')) return;
          if (!inRole(page)) return;
          
          if (!aiPageGroups.has(page)) {
            aiPageGroups.set(page, { clicks: [], impressions: [], ctr: [], position: [], hasQuestion: false });
          }
          const group = aiPageGroups.get(page)!;
          
          if (query && row.position > 6 && aiQuestionWords.some(word => query.toLowerCase().includes(word))) {
            group.hasQuestion = true;
            group.clicks.push(row.clicks);
            group.impressions.push(row.impressions);
            group.ctr.push(row.ctr);
            group.position.push(row.position);
          }
        });

        let aggregatedAi = Array.from(aiPageGroups.entries())
          .map(([page, vals]) => ({
            keys: [page],
            clicks: vals.clicks.reduce((a, b) => a + b, 0) / vals.clicks.length,
            impressions: vals.impressions.reduce((a, b) => a + b, 0) / vals.impressions.length,
            ctr: vals.ctr.reduce((a, b) => a + b, 0) / vals.ctr.length,
            position: vals.position.reduce((a, b) => a + b, 0) / vals.position.length,
            hasQuestion: vals.hasQuestion
          }))
          .filter(row => row.hasQuestion);

        if (searchQuery) {
          aggregatedAi = aggregatedAi.filter(row => row.keys[0].toLowerCase().includes(searchQuery.toLowerCase()));
        }

        return aggregatedAi.sort((a, b) => b.impressions - a.impressions);
      case 'declining':
        if (!isComparing || activeComparisonData.length === 0) return [];
        
        const currentPages = new Map<string, { clicks: number[], impressions: number[], ctr: number[], position: number[], queries: Map<string, { clicks: number, impressions: number, ctr: number, position: number }> }>();
        activeData.forEach(row => {
          const page = row.keys[1];
          const query = row.keys[0];
          if (!page || page.includes('#')) return;
          if (!inRole(page)) return;
          
          if (!currentPages.has(page)) {
            currentPages.set(page, { clicks: [], impressions: [], ctr: [], position: [], queries: new Map() });
          }
          const group = currentPages.get(page)!;
          group.clicks.push(row.clicks);
          group.impressions.push(row.impressions);
          group.ctr.push(row.ctr);
          group.position.push(row.position);
          if (query) {
            group.queries.set(query, { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position });
          }
        });

        const prevPages = new Map<string, { clicks: number[], impressions: number[], ctr: number[], position: number[], queries: Map<string, { clicks: number, impressions: number, ctr: number, position: number }> }>();
        activeComparisonData.forEach(row => {
          const page = row.keys[1];
          const query = row.keys[0];
          if (!page || page.includes('#')) return;
          
          if (!prevPages.has(page)) {
            prevPages.set(page, { clicks: [], impressions: [], ctr: [], position: [], queries: new Map() });
          }
          const group = prevPages.get(page)!;
          group.clicks.push(row.clicks);
          group.impressions.push(row.impressions);
          group.ctr.push(row.ctr);
          group.position.push(row.position);
          if (query) {
            group.queries.set(query, { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position });
          }
        });

        let aggregatedDeclining = Array.from(currentPages.entries())
          .map(([page, vals]) => {
            const currentPos = vals.position.reduce((a, b) => a + b, 0) / vals.position.length;
            const currentClicks = vals.clicks.reduce((a, b) => a + b, 0);
            
            const prevVals = prevPages.get(page);
            const prevPos = prevVals ? prevVals.position.reduce((a, b) => a + b, 0) / prevVals.position.length : currentPos;
            const prevClicks = prevVals ? prevVals.clicks.reduce((a, b) => a + b, 0) : currentClicks;
            
            // Find declining queries for this page
            const decliningQueries: any[] = [];
            vals.queries.forEach((qData, qName) => {
              const pQData = prevVals?.queries.get(qName);
              const qClickChange = qData.clicks - (pQData?.clicks || 0);
              const qPosChange = qData.position - (pQData?.position || qData.position);
              
              if (qClickChange < 0 || qPosChange > 0) {
                decliningQueries.push({
                  query: qName,
                  clicks: qData.clicks,
                  clickChange: qClickChange,
                  position: qData.position,
                  posChange: qPosChange
                });
              }
            });

            return {
              keys: [page],
              clicks: currentClicks,
              impressions: vals.impressions.reduce((a, b) => a + b, 0) / vals.impressions.length,
              ctr: vals.ctr.reduce((a, b) => a + b, 0) / vals.ctr.length,
              position: currentPos,
              posChange: currentPos - prevPos,
              clickChange: currentClicks - prevClicks,
              queryCount: vals.queries.size,
              decliningQueries: decliningQueries.sort((a, b) => b.posChange - a.posChange)
            };
          })
          .filter(row => (row.clickChange < 0 || row.posChange > 0) && row.position >= 12);

        if (searchQuery) {
          aggregatedDeclining = aggregatedDeclining.filter(row => row.keys[0].toLowerCase().includes(searchQuery.toLowerCase()));
        }

        return aggregatedDeclining.sort((a, b) => b.posChange - a.posChange);
      case 'consolidation':
        // Find queries that have multiple pages
        const queryGroups = new Map<string, { clicks: number, impressions: number, ctr: number[], position: number[], pages: string[] }>();
        
        activeData.forEach(row => {
          const q = row.keys[0];
          const p = row.keys[1];
          if (!q || !p) return;
          if (!inRole(p)) return;

          if (!queryGroups.has(q)) {
            queryGroups.set(q, { clicks: 0, impressions: 0, ctr: [], position: [], pages: [] });
          }
          const group = queryGroups.get(q)!;
          group.clicks += row.clicks;
          group.impressions += row.impressions;
          group.ctr.push(row.ctr);
          group.position.push(row.position);
          if (!group.pages.includes(p)) group.pages.push(p);
        });

        let cannibalized = Array.from(queryGroups.entries())
          .filter(([_, data]) => data.pages.length > 1)
          .map(([query, data]) => ({
            keys: [query],
            clicks: data.clicks,
            impressions: data.impressions,
            ctr: data.impressions > 0 ? data.clicks / data.impressions : 0,
            position: data.position.reduce((a, b) => a + b, 0) / data.position.length,
            pages: data.pages
          }));

        if (searchQuery) {
          cannibalized = cannibalized.filter(row => row.keys[0].toLowerCase().includes(searchQuery.toLowerCase()));
        }

        return cannibalized.sort((a, b) => b.impressions - a.impressions);
      case 'scroll':
        const scrollPageGroups = new Map<string, { clicks: number[], impressions: number[], ctr: number[], position: number[], queries: Set<string> }>();
        activeData.forEach(row => {
          const page = row.keys[1];
          if (!page || page.includes('#')) return;
          if (!inRole(page)) return;
          
          if (!scrollPageGroups.has(page)) {
            scrollPageGroups.set(page, { clicks: [], impressions: [], ctr: [], position: [], queries: new Set() });
          }
          const group = scrollPageGroups.get(page)!;
          group.clicks.push(row.clicks);
          group.impressions.push(row.impressions);
          group.ctr.push(row.ctr);
          group.position.push(row.position);
          if (row.keys[0]) group.queries.add(row.keys[0]);
        });

        let aggregatedScroll = Array.from(scrollPageGroups.entries())
          .map(([page, vals]) => ({
            keys: [page],
            clicks: vals.clicks.reduce((a, b) => a + b, 0) / vals.clicks.length,
            impressions: vals.impressions.reduce((a, b) => a + b, 0) / vals.impressions.length,
            ctr: vals.ctr.reduce((a, b) => a + b, 0) / vals.ctr.length,
            position: vals.position.reduce((a, b) => a + b, 0) / vals.position.length,
            queryCount: vals.queries.size
          }))
          .filter(row => {
            const stats = getGa4StatsForPage(row.keys[0]);
            const sessions = stats.sessions || 0;
            if (sessions === 0) return false;
            
            const p25 = (stats[evKey(25)] || 0) / sessions;
            const p50 = (stats[evKey(50)] || 0) / sessions;
            const p75 = (stats[evKey(75)] || 0) / sessions;
            
            return p25 < 0.7 || p50 < 0.5 || p75 < 0.3;
          });

        if (searchQuery) {
          aggregatedScroll = aggregatedScroll.filter(row => row.keys[0].toLowerCase().includes(searchQuery.toLowerCase()));
        }

        return aggregatedScroll.sort((a, b) => {
          const statsA = getGa4StatsForPage(a.keys[0]);
          const statsB = getGa4StatsForPage(b.keys[0]);
          const factor = scrollSort.order === 'asc' ? 1 : -1;
          
          if (scrollSort.col === 'sessions') return ((statsA.sessions || 0) - (statsB.sessions || 0)) * factor;
          
          const getPerc = (stats: any, col: string) => {
            const s = stats.sessions || 0;
            const v = col === '__cta_total' ? ctaTotal(stats) : (stats[col] || 0);
            return s > 0 ? v / s : 0;
          };

          if (scrollSort.col === 'scroll_25') return (getPerc(statsA, evKey(25)) - getPerc(statsB, evKey(25))) * factor;
          if (scrollSort.col === 'scroll_50') return (getPerc(statsA, evKey(50)) - getPerc(statsB, evKey(50))) * factor;
          if (scrollSort.col === 'scroll_75') return (getPerc(statsA, evKey(75)) - getPerc(statsB, evKey(75))) * factor;
          
          return (b.impressions - a.impressions);
        });
      case 'er':
        const erPageGroups = new Map<string, { clicks: number[], impressions: number[], ctr: number[], position: number[], queries: Set<string> }>();
        activeData.forEach(row => {
          const page = row.keys[1];
          if (!page || page.includes('#')) return;
          
          // Filter based on sub-tab
          const isProduk = page.includes('/produk/');
          if (!inRole(page)) return;
          if (erSubTab === 'article' && isProduk) return;
          if (erSubTab === 'product' && !isProduk) return;
          
          if (!erPageGroups.has(page)) {
            erPageGroups.set(page, { clicks: [], impressions: [], ctr: [], position: [], queries: new Set() });
          }
          const group = erPageGroups.get(page)!;
          group.clicks.push(row.clicks);
          group.impressions.push(row.impressions);
          group.ctr.push(row.ctr);
          group.position.push(row.position);
          if (row.keys[0]) group.queries.add(row.keys[0]);
        });

        let aggregatedEr = Array.from(erPageGroups.entries())
          .map(([page, vals]) => ({
            keys: [page],
            clicks: vals.clicks.reduce((a, b) => a + b, 0) / vals.clicks.length,
            impressions: vals.impressions.reduce((a, b) => a + b, 0) / vals.impressions.length,
            ctr: vals.ctr.reduce((a, b) => a + b, 0) / vals.ctr.length,
            position: vals.position.reduce((a, b) => a + b, 0) / vals.position.length,
            queryCount: vals.queries.size
          }))
          .filter(row => {
            const stats = getGa4StatsForPage(row.keys[0]);
            const er = stats.engagement_rate || 0;
            const sessions = stats.sessions || 0;
            
            if (sessions === 0) return false;
            
            if (erSubTab === 'article') {
              return er < 0.5;
            } else {
              return er < 0.4;
            }
          });

        if (searchQuery) {
          aggregatedEr = aggregatedEr.filter(row => row.keys[0].toLowerCase().includes(searchQuery.toLowerCase()));
        }

        return aggregatedEr.sort((a, b) => {
          const statsA = getGa4StatsForPage(a.keys[0]);
          const statsB = getGa4StatsForPage(b.keys[0]);
          const factor = erSort.order === 'asc' ? 1 : -1;
          
          if (erSort.col === 'sessions') return ((statsA.sessions || 0) - (statsB.sessions || 0)) * factor;
          if (erSort.col === 'er') return ((statsA.engagement_rate || 0) - (statsB.engagement_rate || 0)) * factor;
          
          return (b.impressions - a.impressions);
        });
      case 'cta':
        const ctaPageGroups = new Map<string, { clicks: number[], impressions: number[], ctr: number[], position: number[], queries: Set<string> }>();
        activeData.forEach(row => {
          const page = row.keys[1];
          if (!page || page.includes('#')) return;
          
          const isProduk = page.includes('/produk/');
          if (!inRole(page)) return;
          if (ctaSubTab === 'article' && isProduk) return;
          if (ctaSubTab === 'product' && !isProduk) return;
          
          if (!ctaPageGroups.has(page)) {
            ctaPageGroups.set(page, { clicks: [], impressions: [], ctr: [], position: [], queries: new Set() });
          }
          const group = ctaPageGroups.get(page)!;
          group.clicks.push(row.clicks);
          group.impressions.push(row.impressions);
          group.ctr.push(row.ctr);
          group.position.push(row.position);
          if (row.keys[0]) group.queries.add(row.keys[0]);
        });

        let aggregatedCta = Array.from(ctaPageGroups.entries())
          .map(([page, vals]) => ({
            keys: [page],
            clicks: vals.clicks.reduce((a, b) => a + b, 0) / vals.clicks.length,
            impressions: vals.impressions.reduce((a, b) => a + b, 0) / vals.impressions.length,
            ctr: vals.ctr.reduce((a, b) => a + b, 0) / vals.ctr.length,
            position: vals.position.reduce((a, b) => a + b, 0) / vals.position.length,
            queryCount: vals.queries.size
          }))
          .filter(row => {
            const stats = getGa4StatsForPage(row.keys[0]);
            const sessions = stats.sessions || 0;
            return sessions > 0;
          });

        if (searchQuery) {
          aggregatedCta = aggregatedCta.filter(row => row.keys[0].toLowerCase().includes(searchQuery.toLowerCase()));
        }

        return aggregatedCta.sort((a, b) => {
          const statsA = getGa4StatsForPage(a.keys[0]);
          const statsB = getGa4StatsForPage(b.keys[0]);
          const factor = ctaSort.order === 'asc' ? 1 : -1;
          
          if (ctaSort.col === 'sessions') return ((statsA.sessions || 0) - (statsB.sessions || 0)) * factor;
          
          const getPerc = (stats: any, col: string) => {
            const s = stats.sessions || 0;
            const v = col === '__cta_total' ? ctaTotal(stats) : (stats[col] || 0);
            return s > 0 ? v / s : 0;
          };

          if (ctaSort.col === 'cta_total') return (getPerc(statsA, '__cta_total') - getPerc(statsB, '__cta_total')) * factor;
          
          return (b.impressions - a.impressions);
        });
      case 'ctr':
        // This is handled by a special view, but for the table we'll just return all
        return filtered;
      default:
        return filtered;
    }
  };

  const getCTRStats = () => {
    const stats: Record<number, { clicks: number, impressions: number, queries: number }> = {};
    for (let i = 1; i <= 10; i++) {
      stats[i] = { clicks: 0, impressions: 0, queries: 0 };
    }

    activeData.forEach(row => {
      const page = row.keys[1] || '';
      if (!inRole(page)) return;
      
      const pos = Math.round(row.position);
      if (pos >= 1 && pos <= 10) {
        stats[pos].clicks += row.clicks;
        stats[pos].impressions += row.impressions;
        stats[pos].queries += 1;
      }
    });

    return Object.entries(stats).map(([pos, data]) => ({
      position: parseInt(pos),
      avgClicks: data.queries > 0 ? data.clicks / data.queries : 0,
      avgImpressions: data.queries > 0 ? data.impressions / data.queries : 0,
      avgCtr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      totalQueries: data.queries
    }));
  };

  const auditRows = getAuditData();
  const ctrStats = getCTRStats();

  const handleAddLog = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const aspects = Array.from(formData.getAll('aspect')) as string[];
    
    const beforeParts: string[] = [];
    const afterParts: string[] = [];
    
    aspects.forEach(aspect => {
      const b = formData.get(`before_${aspect}`) as string;
      const a = formData.get(`after_${aspect}`) as string;
      if (b) beforeParts.push(`${aspect}: ${b}`);
      if (a) afterParts.push(`${aspect}: ${a}`);
    });

    const newLog = {
      uid: user.uid,
      url: formData.get('url') as string,
      date: formData.get('date') as string,
      aspect: aspects,
      queries: formData.get('queries') as string,
      before: beforeParts.join('\n'),
      after: afterParts.join('\n'),
      note: formData.get('note') as string
    };

    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/logs', {
        method: 'POST',
        headers,
        body: JSON.stringify(newLog)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({} as any));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      setIsAddingLog(false);
      setSelectedAspects([]);
    } catch (err) {
      console.error("Error adding log:", err);
      alert("Gagal menyimpan log. Periksa konsol untuk detailnya.");
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus log ini?")) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/logs/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("Error deleting log:", err);
    }
  };

  const exportLogsToCSV = () => {
    const headers = ["Tanggal", "URL", "Aspek", "Query", "Sebelum", "Sesudah", "Catatan"];
    const rows = filteredLogs.map(log => [
      log.date,
      log.url,
      log.aspect.join(', '),
      log.queries,
      log.before.replace(/\n/g, ' '),
      log.after.replace(/\n/g, ' '),
      log.note.replace(/\n/g, ' ')
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `seo_logs_${logFilterMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportLogsToPDF = async () => {
    const { jsPDF, autoTable } = await loadPdfKit();
    const doc = new jsPDF();
    doc.text(`Laporan Aksi SEO - ${logFilterMonth}`, 14, 15);
    
    const tableData = filteredLogs.map(log => [
      log.date,
      log.url,
      log.aspect.join(', '),
      log.queries,
      log.before,
      log.after
    ]);

    autoTable(doc, {
      head: [['Tanggal', 'URL', 'Aspek', 'Query', 'Sebelum', 'Sesudah']],
      body: tableData,
      startY: 20,
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 40 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 30 }
      }
    });

    doc.save(`seo_report_${logFilterMonth}.pdf`);
  };

  const filteredLogs = seoLogs.filter(log => {
    const matchesSearch = log.url.toLowerCase().includes(logSearchQuery.toLowerCase()) || 
                         log.queries.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
                         log.note.toLowerCase().includes(logSearchQuery.toLowerCase());
    const matchesMonth = log.date.startsWith(logFilterMonth);
    return matchesSearch && matchesMonth;
  });

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const dateRangeLabel = `${fmtDate(isMainRecent ? startDate : compareStartDate)} - ${fmtDate(isMainRecent ? endDate : compareEndDate)}`;
  const displayName = (user?.user_metadata as any)?.full_name || user?.email || 'Pengguna';
  const initials = displayName.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();

  // ===== Halaman Pengaturan (tampilan sendiri; isi dipindah dari sidebar) =====
  const panel_title = "text-[11px] font-black uppercase tracking-wider text-gray-400";
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className={cn("max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between gap-4", sideOpen && 'md:pl-60')}>
          <div className="flex flex-1 items-center gap-6 min-w-0">
            <div className="flex items-center gap-2.5 shrink-0">
              {/* mobile: sidebar tak tampil → logo tetap ada di header; desktop: logo pindah ke sidebar */}
              <div className="md:hidden flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <h1 className="font-extrabold text-lg tracking-tight text-gray-900">RAZEO</h1>
              </div>
              {!sideOpen && (
                <button onClick={toggleSide} title="Tampilkan sidebar" aria-label="Tampilkan sidebar"
                  className="hidden md:inline-flex p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Tab Cek: tombol jenis data (Impresi/Posisi/Klik/Sesi/Scroll) di header */}
            {currentTab === 'cek' && (
              <div className="hidden md:flex flex-1 items-center justify-center gap-1.5 min-w-0 overflow-x-auto">
                {KINDS.map((k) => (
                  <button
                    key={k.id}
                    onClick={() => setCekKind(k.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap",
                      cekKind === k.id
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                        : "bg-white border-gray-200 text-gray-600 hover:border-emerald-300"
                    )}
                  >
                    <k.icon className={cn("w-3.5 h-3.5", cekKind === k.id ? "text-white" : "text-gray-400")} />
                    {k.label}
                  </button>
                ))}
              </div>
            )}

            {/* Sub-bab Tab Konten (Artikel | Produk) — di header */}
            {currentTab === 'konten' && (
              <div className="hidden md:flex flex-1 items-center justify-center gap-1.5 min-w-0">
                {(['artikel', 'produk', 'bundle'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setKontenSub(t)}
                    className={cn(
                      'px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all capitalize whitespace-nowrap',
                      kontenSub === t
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

          </div>

          <div className="flex items-center gap-3 shrink-0">
            {(currentTab === 'dashboard' || currentTab === 'overview' || currentTab === 'insight' || currentTab === 'cek') && (
              <>
                {/* Pill rentang tanggal */}
                <div className="relative hidden md:block">
                  <button
                    onClick={() => setShowDatePop(!showDatePop)}
                    className="flex items-center gap-2.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm hover:border-gray-300 transition-colors"
                    title="Atur rentang tanggal"
                  >
{!isMainRecent && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500 text-white">
                        Previous
                      </span>
                    )}
                    <span className="text-xs font-bold text-gray-700 hidden sm:inline">{dateRangeLabel}</span>
                    <span className="text-xs font-bold text-gray-700 sm:hidden">{fmtDate(isMainRecent ? startDate : compareStartDate)}</span>
                    <Calendar className="w-4 h-4 text-gray-400" />
                  </button>
                  {showDatePop && (
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-xl p-4 z-[60] space-y-3">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Mulai</span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Selesai</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400">Rentang ini dipakai kartu statistik & tabel audit.</p>

                      {/* Compare + refresh di dalam popup */}
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => setIsComparing(!isComparing)}
                          className={cn(
                            "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5",
                            isComparing
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-white border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300"
                          )}
                        >
                          <RefreshCw className={cn("w-3.5 h-3.5", isComparing && "animate-spin-once")} />
                          {isComparing ? 'Comparing' : 'Compare'}
                        </button>
                        <button
                          onClick={() => {
                            setShowDatePop(false);
                            if (!selectedSite) return;
                            if (currentTab === 'dashboard') fetchData(selectedSite);
                            if (currentTab === 'overview') loadOverview();
                            if (currentTab === 'insight') loadInsight();
                            if (currentTab === 'cek') loadCek();
                          }}
                          disabled={isFetchingData}
                          className="px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors disabled:opacity-50 text-gray-600"
                          title="Terapkan & muat ulang data"
                        >
                          <RefreshCw className={cn("w-4 h-4", isFetchingData && "animate-spin")} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Compare & refresh kini berada di dalam popup rentang tanggal */}
              </>
            )}

            {/* Tab Aksi: cari, pilih bulan, ekspor CSV/PDF — rata kanan di header */}
            {currentTab === 'tracker' && (
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative hidden sm:block w-56 shrink">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Cari log..."
                    value={logSearchQuery}
                    onChange={(e) => setLogSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>
                <div className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded-xl border border-gray-200 shadow-sm shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="month"
                    value={logFilterMonth}
                    onChange={(e) => setLogFilterMonth(e.target.value)}
                    className="bg-transparent text-[11px] font-bold text-gray-700 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm shrink-0">
                  <button
                    onClick={exportLogsToCSV}
                    className="p-1.5 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors"
                    title="Ekspor CSV"
                  >
                    <FileDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={exportLogsToPDF}
                    className="p-1.5 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors"
                    title="Ekspor PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ===== SIDEBAR NAVIGASI UTAMA (desktop) ===== */}
      {sideOpen && (
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col bg-white border-r border-gray-200 p-4 z-[55] overflow-y-auto">
        {/* Logo RAZEO + tombol sembunyikan sidebar — sejajar satu baris */}
        <div className="flex items-center justify-between gap-2 px-1 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20 shrink-0">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-extrabold text-lg tracking-tight text-gray-900">RAZEO</h1>
          </div>
          <button
            onClick={toggleSide}
            title="Sembunyikan sidebar"
            aria-label="Sembunyikan sidebar"
            className="p-1.5 shrink-0 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
        {/* Nama project (kiri) & tombol sembunyi (kanan) — sejajar satu baris */}
        <div className="flex items-center gap-1.5 mb-2">
        {projects.length > 0 && (
          <select
            value={activeProjectId ?? ''}
            onChange={(e) => {
              const pid = e.target.value;
              const chosen = projects.find((pp) => pp.id === pid);
              localStorage.setItem('razeo_project', pid);
              setActiveProjectId(pid);
              if (chosen) enterProject(chosen.id, chosen.name, chosen.role);
            }}
            className="flex-1 min-w-0 text-sm font-bold bg-white border border-gray-200 rounded-xl px-2.5 py-2 truncate focus:outline-none focus:border-emerald-500"
            title="Ganti project"
          >
            {projects.map((pp) => (
              <option key={pp.id} value={pp.id}>{pp.name}</option>
            ))}
          </select>
        )}        </div>
        <button
          onClick={() => setViewState('select')}
          className="w-full flex items-center gap-2 px-2.5 py-2 mb-2 bg-white border border-gray-200 rounded-xl text-xs hover:border-emerald-300 transition-colors"
          title="Ganti property Search Console / GA4"
        >
          <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="truncate flex-1 text-left font-medium text-gray-700">{selectedSite || 'Pilih property'}</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 rotate-90 shrink-0" />
        </button>

        <div className="mt-2"></div>

        <nav className="space-y-1">
          {TAB_LIST.map((t) => (
            <button
              key={t.id}
              onClick={() => setCurrentTab(t.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold transition-all text-left",
                currentTab === t.id
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <t.icon className={cn("w-4 h-4", currentTab === t.id ? "text-white" : "text-gray-400")} />
              {t.label}
            </button>
          ))}
        </nav>

        {/* halaman Pengaturan tersendiri (project, properti, anggota, akun, event) */}
        <div className="mt-auto pt-4 border-t border-gray-100">
          <button
            onClick={() => setCurrentTab('pengaturan')}
            className={cn(
              "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold transition-all text-left",
              currentTab === 'pengaturan'
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
            title="Buka halaman pengaturan"
          >
            <Settings className={cn("w-4 h-4", currentTab === 'pengaturan' ? "text-white" : "text-gray-400")} />
            Pengaturan
          </button>

          {/* akun — pindahan dari sidebar proyek (tab Optimasi), setelah Pengaturan */}
          <div className="mt-2 pt-3 border-t border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-gray-800 truncate">{displayName}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
      )}

      {/* isi halaman (tergeser kanan oleh sidebar di layar md+) */}
      <div className={sideOpen ? 'md:pl-56' : ''}>
      {/* strip tab — hanya layar kecil */}
      <nav className="md:hidden sticky top-16 z-40 bg-white/90 backdrop-blur border-b border-gray-200 px-3 py-2 flex items-center gap-1 overflow-x-auto">
        {TAB_LIST.map((t) => (
          <button
            key={t.id}
            onClick={() => setCurrentTab(t.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
              currentTab === t.id ? "bg-white text-gray-900 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-900"
            )}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={() => setCurrentTab('pengaturan')}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
            currentTab === 'pengaturan' ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-900"
          )}
        >
          Pengaturan
        </button>
      </nav>

      {/* jenis data Tab Cek — khusus layar kecil (sidebar tidak tampil di mobile) */}
      {currentTab === 'cek' && (
        <div className="md:hidden sticky top-[6.3rem] z-30 bg-gray-50/95 backdrop-blur px-3 py-2 flex items-center gap-1.5 overflow-x-auto border-b border-gray-200">
          {KINDS.map((k) => (
            <button
              key={k.id}
              onClick={() => setCekKind(k.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap",
                cekKind === k.id
                  ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:border-emerald-300"
              )}
            >
              <k.icon className={cn("w-3.5 h-3.5", cekKind === k.id ? "text-white" : "text-gray-400")} />
              {k.label}
            </button>
          ))}
        </div>
      )}

      {/* Sub-bab Tab Konten — layar kecil */}
      {currentTab === 'konten' && (
        <div className="md:hidden sticky top-[6.3rem] z-30 bg-gray-50/95 backdrop-blur px-3 py-2 flex items-center gap-1.5 overflow-x-auto border-b border-gray-200">
          {(['artikel', 'produk', 'bundle'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setKontenSub(t)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all capitalize whitespace-nowrap',
                kontenSub === t
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-emerald-300'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <main className="max-w-[1600px] mx-auto p-6">
        <React.Suspense fallback={<div className="py-16 text-center text-gray-400 text-sm">Memuat tab…</div>}>
        <AnimatePresence mode="wait">
          {currentTab === 'cek' && (
            <div key="cek">
              <LazyCekTab loading={cekLoading} data={cekData} kind={cekKind} onKind={setCekKind} />
            </div>
          )}
          {currentTab === 'overview' && (
            <div key="overview">
              <LazyOverviewTab
                loading={ovLoading}
                data={ovData}
                note={ovNote}
                startDate={startDate}
                endDate={endDate}
                compareStartDate={compareStartDate}
                compareEndDate={compareEndDate}
                isComparing={isComparing}
                renderChange={renderChange}
                authHeaders={getAuthHeaders}
                ga4PropertyId={selectedGa4Property ? selectedGa4Property.split('/').pop() || null : null}
                onRefresh={() => loadOverview()}
              />
            </div>
          )}
          {currentTab === 'insight' && (
            <div key="insight">
              <LazyInsightTab
                loading={insightLoading}
                branded={insight?.branded ?? null}
                users={insight?.users ?? null}
                error={insightNote}
                brandedKeywords={evCfg.branded || []}
                onRefresh={() => loadInsight()}
              />
            </div>
          )}
          {currentTab === 'konten' && (
            <div key="konten">
              <LazyKontenTab
                loading={contentLoading}
                items={contentItems}
                onAdd={addContent}
                onUpdate={updateContent}
                onDelete={deleteContent}
                sub={kontenSub}
                setSub={setKontenSub}
                prodLoading={productLoading}
                prodItems={productItems}
                onProdAdd={addProduct}
                onProdUpdate={updateProduct}
                onProdDelete={deleteProduct}
                bundleLoading={bundleLoading}
                bundleItems={bundleItems}
                onBundleAdd={addBundle}
                onBundleUpdate={updateBundle}
                onBundleDelete={deleteBundle}
              />
            </div>
          )}
          {currentTab === 'visualisasi' && (
            <div key="visualisasi">
              <LazyVisualisasiTab loading={contentLoading} items={contentItems} prodItems={productItems} authHeaders={getAuthHeaders} />
            </div>
          )}
          {currentTab === 'task' && (
            <div key="task">
              <LazyTaskTab
                loading={taskLoading}
                items={taskItems}
                onAdd={addTask}
                onUpdate={updateTask}
                onDelete={deleteTask}
              />
            </div>
          )}
          {currentTab === 'pengaturan' && (
            <LazySettingsPage
              activeProjectId={activeProjectId}
              enterProject={enterProject}
              evCfg={evCfg}
              handleOpenInvite={handleOpenInvite}
              panel_title={panel_title}
              projects={projects}
              saveEv={saveEv}
              selectedSite={selectedSite}
              setActiveProjectId={setActiveProjectId}
              setViewState={setViewState}
            />
          )}
          {['overview', 'insight', 'konten', 'task', 'cek', 'pengaturan', 'visualisasi'].includes(currentTab) ? null : currentTab === 'dashboard' ? (
          <LazyDashboardTab
            AUDIT_TABS={AUDIT_TABS}
            Ga4EventBreakdown={Ga4EventBreakdown}
            auditRows={auditRows}
            auditTab={auditTab}
            ctaEvKeys={ctaEvKeys}
            ctaSort={ctaSort}
            ctaSubTab={ctaSubTab}
            ctaTotal={ctaTotal}
            ctrStats={ctrStats}
            data={data}
            downloadAiPDF={downloadAiPDF}
            downloadAllPositionsCsv={downloadAllPositionsCsv}
            downloadConsolidationPDF={downloadConsolidationPDF}
            downloadCtaPDF={downloadCtaPDF}
            downloadEnrichmentPDF={downloadEnrichmentPDF}
            downloadErPDF={downloadErPDF}
            downloadLHFPDF={downloadLHFPDF}
            downloadPositionPdf={downloadPositionPdf}
            downloadScrollPDF={downloadScrollPDF}
            downloadZeroPDF={downloadZeroPDF}
            enrichmentSort={enrichmentSort}
            erSort={erSort}
            erSubTab={erSubTab}
            error={error}
            evKey={evKey}
            auditRole={auditRole}
            setAuditRole={setAuditRole}
            AUDIT_ROLES={AUDIT_ROLES}
            expandedAiPage={expandedAiPage}
            expandedConsolidationQuery={expandedConsolidationQuery}
            expandedDecliningPage={expandedDecliningPage}
            expandedEnrichmentPage={expandedEnrichmentPage}
            expandedErPage={expandedErPage}
            expandedLhfPage={expandedLhfPage}
            expandedScrollPage={expandedScrollPage}
            expandedZeroPage={expandedZeroPage}
            getGa4StatsForPage={getGa4StatsForPage}
            getSlug={getSlug}
            lhfSort={lhfSort}
            scrollSort={scrollSort}
            selectedCtaPages={selectedCtaPages}
            selectedCtrPage={selectedCtrPage}
            selectedCtrPosition={selectedCtrPosition}
            selectedErPages={selectedErPages}
            selectedScrollPages={selectedScrollPages}
            setAuditTab={setAuditTab}
            setCtaSort={setCtaSort}
            setCtaSubTab={setCtaSubTab}
            setEnrichmentSort={setEnrichmentSort}
            setErSort={setErSort}
            setErSubTab={setErSubTab}
            setExpandedAiPage={setExpandedAiPage}
            setExpandedConsolidationQuery={setExpandedConsolidationQuery}
            setExpandedDecliningPage={setExpandedDecliningPage}
            setExpandedEnrichmentPage={setExpandedEnrichmentPage}
            setExpandedErPage={setExpandedErPage}
            setExpandedLhfPage={setExpandedLhfPage}
            setExpandedScrollPage={setExpandedScrollPage}
            setExpandedZeroPage={setExpandedZeroPage}
            setLhfSort={setLhfSort}
            setScrollSort={setScrollSort}
            setSelectedCtaPages={setSelectedCtaPages}
            setSelectedCtrPage={setSelectedCtrPage}
            setSelectedCtrPosition={setSelectedCtrPosition}
            setSelectedErPages={setSelectedErPages}
            setSelectedScrollPages={setSelectedScrollPages}
          />
        ) : (
          <LazyAksiTab
            filteredLogs={filteredLogs}
            logFilterMonth={logFilterMonth}
            handleDeleteLog={handleDeleteLog}
            setIsAddingLog={setIsAddingLog}
            setSelectedAspects={setSelectedAspects}
            exportLogsToCSV={exportLogsToCSV}
            exportLogsToPDF={exportLogsToPDF}
          />
        )}
      </AnimatePresence>

      <LazyAksiAddLogModal
        data={data}
        isAddingLog={isAddingLog}
        selectedAspects={selectedAspects}
        setIsAddingLog={setIsAddingLog}
        setSelectedAspects={setSelectedAspects}
        handleAddLog={handleAddLog}
      />
        </React.Suspense>
      </main>

      <footer className="max-w-[1600px] mx-auto p-8 border-t border-gray-200 mt-12 text-center text-gray-400 text-sm font-medium">
      {showInvite && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={() => setShowInvite(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Undang ke Project</h3>
              <button onClick={() => setShowInvite(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Siapa pun yang membuka link ini dan login dengan Google akan menjadi
              <span className="font-bold text-gray-800"> anggota</span> project ini.
            </p>
            {inviteBusy ? (
              <div className="p-4 text-sm text-gray-400 text-center bg-gray-50 rounded-xl">Membuat link undangan...</div>
            ) : inviteLink?.startsWith('ERROR:') ? (
              <div className="p-4 text-sm text-red-600 bg-red-50 rounded-xl">{inviteLink.slice(6)}</div>
            ) : inviteLink ? (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs break-all font-mono">{inviteLink}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(inviteLink); }}
                    className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                  >Salin Link</button>
                  <button
                    onClick={handleOpenInvite}
                    className="py-2.5 px-4 bg-gray-100 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-200 transition-colors"
                  >Link Baru</button>
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
      </footer>
      </div>
    </div>
  );
}
