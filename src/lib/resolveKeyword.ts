// Resolusi URL internal -> kata kunci (target keyword) artikel tujuannya.
// Dipakai kolom Internal Link (Tab Konten) & diagram Visualisasi.
// Normalisasi: buang protokol, www, slash akhir — pencocokan case-insensitive.

export const normUrl = (u?: string | null): string =>
  (u || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');

// map "?link_artikel" (ternormalisasi) -> target keyword (atau judul) milik artikel itu
export function keywordMap<T extends { link_artikel?: string | null; target_keyword?: string | null }>(
  items: T[]
): Map<string, string> {
  const m = new Map<string, string>();
  for (const it of items) {
    const key = normUrl(it.link_artikel);
    if (key) m.set(key, it.target_keyword || '');
  }
  return m;
}

// URL -> kata kunci tujuan. Kalau tak ada artikel bersangkutan di daftar ini,
// pakai slug terakhir yang dirapikan jadi teks (tetap terbaca walaupun bukan keyword).
export function urlToKeyword(url: string, m: Map<string, string>): string {
  const k = normUrl(url);
  const hit = m.get(k);
  if (hit) return hit;
  const seg = k.split('/').filter(Boolean).pop() || k;
  return seg.replace(/[-_]+/g, ' ').trim() || url;
}