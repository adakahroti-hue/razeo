import { Activity, BarChart3, MousePointer2, ScanLine, MapPin } from 'lucide-react';

// daftar jenis data tab Cek — tombolnya di header & strip App, jadi modul terpisah
// (modul ini jejaknya ringan; CekTab bisa di-lazy tanpa menyeret ikon/kodenya)
export type Kind = 'impressi' | 'posisi' | 'klik' | 'sesi' | 'scroll';

export const KINDS: { id: Kind; label: string; icon: any }[] = [
  { id: 'impressi', label: 'Impresi', icon: MapPin },
  { id: 'posisi', label: 'Posisi', icon: BarChart3 },
  { id: 'klik', label: 'Klik', icon: MousePointer2 },
  { id: 'sesi', label: 'Sesi', icon: Activity },
  { id: 'scroll', label: 'Scroll', icon: ScanLine },
];