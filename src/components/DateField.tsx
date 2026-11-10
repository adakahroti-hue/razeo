import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { cn } from '../lib/utils';

// Field tanggal: BOLEH diketik/tempel teks bebas, BISA juga dipilih lewat kalender.
// Nilai disimpan apa adanya; kalender hanya menimpa dgn format YYYY-MM-DD.
export default function DateField({ value, onChange, className, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // klik di luar kotak → tutup kalender
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  // picker minta '' atau YYYY-MM-DD valid — nilai teks bebas lain diabaikan utk picker
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';

  return (
    <div className="relative" ref={boxRef}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('pr-9', className)}
        placeholder={placeholder || '2026-01-31 atau teks bebas'}
        aria-label="Tanggal publikasi"
      />
      <button
        type="button"
        title="Pilih tanggal lewat kalender"
        aria-label="Pilih tanggal lewat kalender"
        onClick={() => setOpen((o) => !o)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
      >
        <CalendarDays className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-[70] bg-white border border-gray-200 rounded-xl shadow-xl p-3 space-y-2">
          <input
            type="date"
            value={iso}
            onChange={(e) => { onChange(e.target.value); setOpen(false); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="text-xs font-bold text-gray-400 hover:text-red-600">
              Kosongkan
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-xs font-bold text-emerald-600 hover:underline">
              Selesai
            </button>
          </div>
        </div>
      )}
    </div>
  );
}