/**
 * Seluruh teks konten yang diambil dari makalah dikumpulkan di sini agar mudah diperbarui
 * (mis. setelah Bab IV selesai) tanpa menyentuh tata letak.
 */
import type { WasteKind } from './items'

export const TEAM = [
  { name: 'Alfian Anggara Putra Afandy', nim: '181231043', initials: 'AA' },
  { name: 'Bintang Cahya Putra Gunawan', nim: '181231061', initials: 'BC' },
] as const

/** Isi bila ingin menampilkan dosen pembimbing di halaman Tentang. Kosong = tidak ditampilkan. */
export const SUPERVISOR: { name: string; role: string } | null = null

export const PROJECT_LABEL = 'Project Jaringan Syaraf Tiruan'

export const INSTITUTION = {
  program: 'S-1 Matematika',
  department: 'Departemen Matematika',
  faculty: 'Fakultas Sains dan Teknologi',
  university: 'Universitas Airlangga',
  year: 2026,
}

export const RESEARCH_TITLE =
  'Klasifikasi Jenis Sampah Menggunakan Convolutional Neural Network (CNN) dengan Backpropagation'

/** Data persampahan nasional dari Bab I. */
export const STATS = [
  {
    value: 34.6,
    digits: 1,
    unit: 'juta ton',
    label: 'timbulan sampah nasional sepanjang 2024',
    source: 'SIPSN, dikutip JawaPos (Zahdomo, 2025)',
  },
  {
    value: 52.9,
    digits: 1,
    unit: '%',
    label: 'dari sampah itu belum terkelola dengan baik',
    source: 'SIPSN, dikutip JawaPos (Zahdomo, 2025)',
  },
  {
    value: 39.41,
    digits: 2,
    unit: '%',
    label: 'komposisi sampah berupa sisa makanan',
    source: 'SIPSN 2024, dikutip ANTARA (Violleta, 2025)',
  },
  {
    value: 19.55,
    digits: 2,
    unit: '%',
    label: 'komposisi sampah berupa plastik',
    source: 'SIPSN 2024, dikutip ANTARA (Violleta, 2025)',
  },
] as const

export const GUIDE: Record<
  WasteKind,
  { title: string; summary: string; examples: string[]; steps: string[]; becomes: string }
> = {
  organik: {
    title: 'Organik',
    summary:
      'Berasal dari makhluk hidup dan bisa membusuk secara alami dalam waktu singkat. Bentuknya cenderung tidak beraturan dengan tekstur alami.',
    examples: ['Sisa makanan', 'Kulit buah', 'Sayuran', 'Daun dan ranting', 'Roti basi'],
    steps: [
      'Tiriskan sisa kuah atau minyak supaya tidak cepat bau.',
      'Kumpulkan di wadah tertutup, terpisah dari plastik dan kertas.',
      'Olah jadi kompos di rumah, atau serahkan ke pengolah kompos dan biogas terdekat.',
    ],
    becomes: 'Kompos dan biogas',
  },
  anorganik: {
    title: 'Anorganik',
    summary:
      'Berasal dari bahan olahan industri dan sulit terurai, bisa sampai puluhan tahun. Biasanya berbentuk teratur, permukaannya halus atau mengilap, sering ada tulisan cetak.',
    examples: ['Botol plastik', 'Kaleng', 'Kardus', 'Kertas koran', 'Gelas plastik'],
    steps: [
      'Kosongkan dan bilas sebentar agar tidak mengundang semut atau jamur.',
      'Keringkan, lalu pipihkan botol dan kardus supaya hemat tempat.',
      'Pisahkan per bahan, lalu setorkan ke bank sampah atau pengepul daur ulang.',
    ],
    becomes: 'Bahan daur ulang',
  },
}

/** Jenis sampah yang di luar dua kelas model. Ditulis jujur agar pengguna tidak salah buang. */
export const OUT_OF_SCOPE =
  'Baterai, lampu, obat kedaluwarsa, dan kemasan pestisida termasuk sampah B3. Popok dan tisu bekas biasanya masuk residu. PILAH hanya mengenal organik dan anorganik, jadi untuk benda-benda ini ikuti aturan pengelolaan sampah di daerahmu.'

/** Pertanyaan umum untuk pengunjung (bahasa sehari-hari). Tampil di beranda, bagian #faq. */
export const FAQ = [
  {
    q: 'Apakah PILAH gratis?',
    a: 'Ya, gratis sepenuhnya. Kamu juga tidak perlu daftar, login, atau memasang aplikasi. Cukup buka website ini lalu mulai memindai.',
  },
  {
    q: 'Apakah fotoku disimpan atau dikirim ke orang lain?',
    a: 'Tidak. Foto diproses langsung di HP atau laptopmu, jadi tidak ada server yang menerima atau menyimpannya. Riwayat pindaian hanya tersimpan sementara di tab browser ini dan hilang saat tab ditutup.',
  },
  {
    q: 'Seberapa akurat hasilnya?',
    a: 'Setiap hasil selalu disertai persentase keyakinan, jadi kamu tahu seberapa yakin PILAH dengan jawabannya. Hasil pengujian lengkapnya bisa dilihat di halaman Tentang.',
  },
  {
    q: 'Kenapa kadang muncul tulisan "belum yakin"?',
    a: 'Artinya peluang organik dan anorganik hampir sama besar. Biasanya karena latar foto ramai, cahaya kurang, atau ada beberapa benda sekaligus. Coba foto ulang satu benda dengan latar polos.',
  },
  {
    q: 'Foto seperti apa yang paling bagus?',
    a: 'Satu benda per foto, terlihat jelas dan memenuhi bingkai, dengan cahaya cukup. Latar polos seperti lantai atau meja membantu PILAH fokus ke bendanya.',
  },
  {
    q: 'Sampah apa saja yang bisa dikenali?',
    a:
      'PILAH mengenali dua kelompok: organik (sisa makanan, daun, kulit buah) dan anorganik (plastik, kaleng, kertas, kardus). ' +
      'Baterai, lampu, obat, dan sampah berbahaya lainnya tidak termasuk, jadi buang sesuai aturan di daerahmu.',
  },
  {
    q: 'Bisakah dipakai tanpa internet?',
    a: 'Bisa, asalkan halaman PILAH sudah terbuka sekali. Setelah itu proses pengenalan berjalan di perangkatmu sendiri tanpa perlu sinyal.',
  },
  {
    q: 'Siapa yang membuat PILAH?',
    a: 'PILAH dibuat oleh mahasiswa S-1 Matematika Universitas Airlangga sebagai project mata kuliah Jaringan Syaraf Tiruan. Kenalan lebih lanjut di halaman Tentang.',
  },
] as const

export const DATASET = {
  name: 'Waste Classification Data',
  author: 'Sekar (2019)',
  url: 'https://www.kaggle.com/datasets/techsash/waste-classification-data',
  total: 25077,
  organik: 13966,
  anorganik: 11111,
  used: 2000,
  train: 1600,
  test: 400,
}

/** Rantai ukuran data dari input sampai output (Gambar 3.2). */
export const PIPELINE = [
  { id: 'input', name: 'Input', size: '64 × 64', note: 'citra grayscale ternormalisasi' },
  { id: 'pad', name: 'Zero padding', size: '66 × 66', note: 'tepi diberi nol, q = 1' },
  { id: 'conv', name: 'Konvolusi + ReLU', size: '8 × 64 × 64', note: '8 kernel 3 × 3, stride 1' },
  { id: 'pool', name: 'Max pooling', size: '8 × 32 × 32', note: 'jendela 2 × 2, stride 2' },
  { id: 'flat', name: 'Flatten', size: '8.192', note: 'disusun baris demi baris' },
  { id: 'hidden', name: 'Hidden layer', size: '16', note: '16 neuron, ReLU' },
  { id: 'out', name: 'Output', size: '1', note: 'sigmoid, peluang anorganik' },
] as const

/* ------------------------------------------------------------------ */
/* Foto                                                                */
/* ------------------------------------------------------------------ */

/**
 * Foto latar dan ilustrasi dari Unsplash (lisensi Unsplash: bebas dipakai, termasuk komersial).
 * Dimuat langsung dari CDN Unsplash dengan ukuran yang diminta.
 */
export function unsplash(id: string, w = 1600, q = 70) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=${q}`
}

export const PHOTOS = {
  hero: { id: 'photo-1584069453523-76e1b64154c4', by: 'Sahil Pandita' },
  tentang: { id: 'photo-1502239608882-93b729c6af43', by: 'Brennan Burling' },
  masalah: { id: 'photo-1606037150583-fb842a55bae7', by: 'Franck V.' },
  organik: { id: 'photo-1492496913980-501348b61469', by: 'Gabriel Jimenez' },
  anorganik: { id: 'photo-1595278069441-2cf29f8005a4', by: 'Nick Fewings' },
  ajakan: { id: 'photo-1542601906990-b4d3fb778b09', by: 'Noah Buscher' },
  pindai: { id: 'photo-1552152974-19b9caf99137', by: 'Alex Dukhanov' },
} as const

/* ------------------------------------------------------------------ */
/* Berita                                                              */
/* ------------------------------------------------------------------ */

export type NewsTopic = 'Kebijakan' | 'TPA' | 'Daur ulang' | 'Gerakan warga'

export interface NewsItem {
  title: string
  source: string
  date: string // ISO
  topic: NewsTopic
  summary: string
  url: string
  /** Foto ilustrasi (Unsplash), bukan foto asli berita. */
  photo: { id: string; by: string }
}

/**
 * Berita persampahan dari media dan situs resmi. Ringkasan ditulis ulang dengan bahasa sendiri;
 * berita lengkap dibuka di situs aslinya. Urut dari yang terbaru.
 */
export const NEWS: NewsItem[] = [
  {
    title: '43 TPA terbakar, Wamen LH tegaskan pemilahan sampah penting untuk pencegahan',
    source: 'Kementerian Lingkungan Hidup',
    date: '2026-10-01',
    topic: 'TPA',
    summary:
      'Sebanyak 43 TPA tercatat terbakar. Penyebab utamanya sampah organik yang tidak dipilah lalu menumpuk bersama plastik, dan risikonya naik di musim El Niño. Pemilahan sejak dari rumah disebut sebagai kunci pencegahan.',
    url: 'https://kemenlh.go.id/news/detail/43-tpa-terbakar-wamen-lh-pemilahan-sampah-penting-untuk-pencegahan',
    photo: { id: 'photo-1770068511850-50f9bd0ad5ed', by: 'Daniel Miksha' },
  },
  {
    title: 'Dari sampah jadi nilai ekonomi, KLH dorong penguatan industri daur ulang nasional',
    source: 'Kementerian Lingkungan Hidup',
    date: '2026-09-26',
    topic: 'Daur ulang',
    summary:
      'Dalam seminar nasional di Universitas Airlangga, KLH memaparkan bahwa Indonesia menghasilkan sekitar 10,83 juta ton sampah plastik per tahun, sementara 227 industri daur ulang baru bekerja sekitar 48 persen dari kapasitasnya.',
    url: 'https://www.kemenlh.go.id/news/detail/dari-sampah-jadi-nilai-ekonomi-klhbplh-dorong-penguatan-industri-daur-ulang-nasional',
    photo: { id: 'photo-1764529310915-f73129d29c22', by: 'Jenya Shportiak' },
  },
  {
    title: 'KLH targetkan seluruh pemda bisa tangani semua sampah rumah tangga',
    source: 'ANTARA',
    date: '2026-09-07',
    topic: 'Kebijakan',
    summary:
      'Pemerintah menargetkan setiap rumah tangga mendapat layanan pengumpulan sampah. Jika tercapai, 90 persen sampah diolah di fasilitas pengolahan dan hanya 10 persen residu yang berakhir di TPA.',
    url: 'https://megapolitan.antaranews.com/berita/548805/klh-targetkan-seluruh-pemda-di-indonesia-bisa-tangani-semua-sampah-rumah-tangga',
    photo: { id: 'photo-1605600659908-0ef719419d41', by: 'the blowup' },
  },
  {
    title: 'Bali wajibkan warga pilah sampah 100 persen mulai 1 Juli',
    source: 'Kementerian Lingkungan Hidup',
    date: '2026-06-10',
    topic: 'Kebijakan',
    summary:
      'Bali menjadi percontohan nasional pemilahan dari sumber. Setelah sampah organik dilarang masuk TPA sejak April, volume sampah di Denpasar dan Badung turun hingga 60 persen dengan tingkat kepatuhan warga 87 persen.',
    url: 'https://kemenlh.go.id/news/detail/tegas-klhbplh-dan-pemprov-bali-wajibkan-warga-pilah-sampah-100-persen-mulai-1-juli',
    photo: { id: 'photo-1611284446314-60a58ac0deb9', by: 'Nareeta Martin' },
  },
  {
    title: 'TPST Bantargebang hanya terima sampah residu mulai Agustus 2026',
    source: 'ANTARA',
    date: '2026-05-10',
    topic: 'TPA',
    summary:
      'Mulai 1 Agustus 2026, Bantargebang hanya menerima sampah sisa yang tidak bisa diolah lagi. Warga Jakarta diajak mulai memilah dari rumah, dan Kelurahan Rorotan sudah menjalankan sistemnya lebih dulu.',
    url: 'https://www.antaranews.com/berita/5562233/tpst-bantargebang-hanya-terima-sampah-residu-mulai-agustus-2026',
    photo: { id: 'photo-1763100351709-77023f1db28d', by: 'Yimeng Zhao' },
  },
  {
    title: 'Dari hulu berbenah mengelola sampah, harapan tumbuh dari rumah',
    source: 'Katadata',
    date: '2026-04-30',
    topic: 'Gerakan warga',
    summary:
      'Bank sampah warga RW 09 Cakung Barat menunjukkan bahwa pemilahan bisa dimulai dari lingkungan kecil. Secara nasional, 336 dari 514 kabupaten dan kota berstatus darurat sampah.',
    url: 'https://katadata.co.id/berita/nasional/69f36b7ca3c9a/dari-hulu-berbenah-mengelola-sampah-harapan-tumbuh-dari-rumah',
    photo: { id: 'photo-1582408921715-18e7806365c1', by: 'Jas Min' },
  },
  {
    title: 'Penutupan open dumping: sampah luber di Bali jadi alarm untuk daerah lain',
    source: 'Katadata',
    date: '2026-04-21',
    topic: 'TPA',
    summary:
      'Pembatasan sampah organik ke TPA Suwung sejak 1 April membuat sampah menumpuk di sejumlah titik. Kasus ini menjadi pelajaran bagi daerah lain agar fasilitas pengganti siap sebelum TPA ditutup.',
    url: 'https://katadata.co.id/ekonomi-hijau/ekonomi-sirkular/69e71b351fc22/penutupan-open-dumping-sampah-luber-di-bali-alarm-peringatan-untuk-daerah-lain',
    photo: { id: 'photo-1763741224342-496ca68c8f26', by: 'Phuong Nguyen' },
  },
  {
    title: 'Rorotan jadi percontohan: asal warga mau pilah sampah, beban TPA pasti turun',
    source: 'Kementerian Lingkungan Hidup',
    date: '2026-03-26',
    topic: 'Gerakan warga',
    summary:
      'Warga Rorotan, Jakarta Utara, mulai memilah sampah secara bertahap dibantu kader lingkungan, lengkap dengan bank sampah dan bioreaktor kompos. Hasilnya akan menjadi contoh untuk kelurahan lain.',
    url: 'https://www.kemenlh.go.id/news/detail/rorotan-jadi-percontohan-menteri-lh-asal-warga-mau-pilah-sampah-beban-tpa-pasti-turun',
    photo: { id: 'photo-1545333212-ffebc7933c12', by: 'Seth Cottle' },
  },
  {
    title: 'Ribuan ton sampah didaur ulang, program lingkungan ini hasilkan cuan bagi warga',
    source: 'detikFinance',
    date: '2026-02-21',
    topic: 'Daur ulang',
    summary:
      'Program pengelolaan sampah di 58 lokasi mengumpulkan sekitar 4.700 ton sampah per tahun. Sekitar 2.300 ton di antaranya didaur ulang atau diolah, dan menghasilkan pendapatan sekitar Rp3,2 miliar bagi warga.',
    url: 'https://finance.detik.com/ekonomi-hijau/d-8366559/ribuan-ton-sampah-didaur-ulang-program-lingkungan-ini-hasilkan-cuan-bagi-warga',
    photo: { id: 'photo-1767459516949-cbc6d219a595', by: 'Ricky A Villareal' },
  },
  {
    title: 'Tingkat pengelolaan sampah Indonesia naik menjadi 24,95 persen',
    source: 'ANTARA',
    date: '2026-02-11',
    topic: 'Kebijakan',
    summary:
      'Per Januari 2026, sampah yang terkelola naik menjadi 24,95 persen dari sekitar 10 persen pada awal 2025. Angka ini masih jauh dari target 63,4 persen untuk 2026, sehingga pemilahan rumah tangga terus didorong.',
    url: 'https://mataram.antaranews.com/berita/531042/indonesias-waste-management-rate-rises-to-2495-percent',
    photo: { id: 'photo-1532996122724-e3c354a0b15b', by: 'Pawel Czerwinski' },
  },
]
