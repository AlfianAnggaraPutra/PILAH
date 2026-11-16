export const BRAND = {
  name: 'PILAH',
  slogan: 'Pilih Langkah Bijak untuk Sampah',
  /** Nama terbentuk dari PIL(ih) … (samp)AH. Dua potongan ini disorot emas. */
  sloganParts: ['Pil', 'ih Langkah Bijak untuk Samp', 'ah'] as const,
} as const

export const NAV = [
  { to: '/', label: 'Beranda', icon: 'home' },
  { to: '/klasifikasi', label: 'Pindai', icon: 'scan' },
  { to: '/tentang', label: 'Tentang', icon: 'info' },
] as const

/** Kunci sessionStorage agar splash hanya tampil sekali per sesi. */
export const SPLASH_KEY = 'pilah:splash-seen'
