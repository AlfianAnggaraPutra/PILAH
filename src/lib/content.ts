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

export const FAQ = [
  {
    q: 'Apakah fotoku dikirim ke server?',
    a: 'Tidak. Model PILAH diunduh sekali (sekitar 0,5 MB) lalu dijalankan langsung di browser. Foto dibaca dan dihitung di perangkatmu sendiri, tidak pernah diunggah ke mana pun.',
  },
  {
    q: 'Seberapa akurat hasilnya?',
    a: 'Angka akurasi, precision, recall, dan F1-score dihitung dari 400 citra uji dan ditampilkan di bagian Model pada halaman ini. Foto dari kamera ponsel bisa berbeda dari foto di dataset, jadi PILAH selalu menampilkan peluang setiap kelas, bukan hanya labelnya.',
  },
  {
    q: 'Kenapa kadang muncul tulisan "belum yakin"?',
    a: 'Itu terjadi saat nilai y dekat dengan 0,5, artinya peluang organik dan anorganik hampir seimbang. Biasanya karena latar ramai, cahaya kurang, atau ada beberapa benda sekaligus. Coba foto ulang satu benda dengan latar polos.',
  },
  {
    q: 'Kenapa citranya diubah menjadi hitam putih?',
    a: 'Penelitian ini memakai citra grayscale 64 × 64 agar setiap langkah perhitungan CNN bisa diuraikan secara manual di makalah. Konsekuensinya, model membaca bentuk dan tekstur, bukan warna.',
  },
  {
    q: 'Bisakah dipakai tanpa internet?',
    a: 'Setelah halaman dan model termuat sekali, proses klasifikasi tidak membutuhkan internet karena semuanya dihitung di perangkat.',
  },
  {
    q: 'Bagaimana dengan baterai, popok, atau elektronik?',
    a: OUT_OF_SCOPE,
  },
  {
    q: 'Apakah perlu membuat akun?',
    a: 'Tidak. PILAH bisa langsung dipakai tanpa daftar dan tanpa login. Riwayat pindaian hanya tersimpan sementara di tab browsermu dan hilang saat tab ditutup.',
  },
] as const

export const REFERENCES = [
  'Bishop, C. M. (2006). Pattern recognition and machine learning. Springer.',
  'Fadllurrohman, A. N., Lutfi, M., Akbar D. E., Q., & Fathurohman, A. (2024). Pemanfaatan convolutional neural network untuk klasifikasi efisien dan akurat pada berbagai jenis sampah. Jurnal Komputer dan Teknologi Informasi, 2(2), 80–83.',
  'Fantara, F. P., Syauqy, D., & Setyawan, G. E. (2018). Implementasi sistem klasifikasi sampah organik dan anorganik dengan metode jaringan saraf tiruan backpropagation. Jurnal Pengembangan Teknologi Informasi dan Ilmu Komputer, 2(11), 5577–5586.',
  'Fausett, L. (1994). Fundamentals of neural networks: Architectures, algorithms, and applications. Prentice Hall.',
  'Gonzalez, R. C., & Woods, R. E. (2018). Digital image processing (4th ed.). Pearson.',
  'Goodfellow, I., Bengio, Y., & Courville, A. (2016). Deep learning. MIT Press.',
  'Han, J., Kamber, M., & Pei, J. (2012). Data mining: Concepts and techniques (3rd ed.). Morgan Kaufmann.',
  'LeCun, Y., Bottou, L., Bengio, Y., & Haffner, P. (1998). Gradient-based learning applied to document recognition. Proceedings of the IEEE, 86(11), 2278–2324.',
  'Nair, V., & Hinton, G. E. (2010). Rectified linear units improve restricted Boltzmann machines. Proceedings of the 27th ICML, 807–814.',
  'Purba, M. E., Situmorang, A. Z., Ginting, G. L. B., Lubis, M. W. P., & Sinaga, F. M. (2025). Klasifikasi sampah organik dan anorganik menggunakan algoritma CNN. Jurnal Sifo Mikroskil, 26(1), 37–54.',
  'Republik Indonesia. (2008). Undang-Undang Nomor 18 Tahun 2008 tentang Pengelolaan Sampah.',
  'Ruder, S. (2016). An overview of gradient descent optimization algorithms. arXiv:1609.04747.',
  'Rumelhart, D. E., Hinton, G. E., & Williams, R. J. (1986). Learning representations by back-propagating errors. Nature, 323(6088), 533–536.',
  'Sekar, S. (2019). Waste classification data [Data set]. Kaggle.',
  'Siang, J. J. (2005). Jaringan syaraf tiruan dan pemrogramannya menggunakan Matlab. Andi.',
  'Sokolova, M., & Lapalme, G. (2009). A systematic analysis of performance measures for classification tasks. Information Processing & Management, 45(4), 427–437.',
  'Violleta, P. T. (2025, 25 Maret). KLH ingatkan masyarakat habiskan makanan guna kurangi "food waste". ANTARA News.',
  'Zahdomo, R. (2025, 19 Agustus). 52 persen timbunan sampah di Indonesia masih belum terkelola. JawaPos.com.',
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
