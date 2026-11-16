export const BRAND = {
  name: 'PILAH',
  slogan: 'Pilih Langkah Bijak untuk Sampah',
} as const

/**
 * Menu utama di header. Berita dan FAQ adalah bagian (section) di beranda;
 * tombol "Pindai sampah" ditampilkan terpisah sebagai tombol utama.
 */
export const NAV = [
  { to: '/', label: 'Beranda', icon: 'home', section: null },
  { to: '/#berita', label: 'Berita', icon: 'news', section: 'berita' },
  { to: '/#faq', label: 'FAQ', icon: 'help', section: 'faq' },
  { to: '/tentang', label: 'Tentang', icon: 'info', section: null },
] as const

/** Kunci sessionStorage agar splash hanya tampil sekali per sesi. */
export const SPLASH_KEY = 'pilah:splash-seen'
