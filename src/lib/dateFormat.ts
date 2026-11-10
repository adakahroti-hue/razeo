// Tanggal publikasi ditampilkan dd-mm-yyyy (penyimpanan tetap yyyy-mm-dd.
// Nilai teks bebas hasil tempel tampil apa adanya.)

export function fmtTanggal(v?: string | null): string {
  if (!v) return '—';
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`; // dd-mm-yyyy
  return s; // hasil tempel bebas → biarkan apa adanya
}