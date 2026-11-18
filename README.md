# PILAH · Pilih Langkah Bijak untuk Sampah

Website klasifikasi sampah **organik dan anorganik** dengan Convolutional Neural Network yang berjalan
**sepenuhnya di browser**. Tidak ada backend dan tidak ada foto yang diunggah. Model dilatih di Google
Colab (NumPy murni, notebook `PILAH_CNN_Backpropagation.ipynb`), lalu bobotnya (±0,5 MB) dipasang di
`public/model/`.

| Lapisan    | Pilihan                                                                     |
| ---------- | --------------------------------------------------------------------------- |
| Build / UI | Vite + React 19 + TypeScript                                                |
| Styling    | Tailwind CSS v4, tema gelap "Rimba Malam" di `src/index.css`                |
| Animasi    | Web Animations API + transisi CSS dengan easing pegas (`src/lib/motion.ts`) |
| Routing    | Router kecil berbasis History API (`src/lib/router.tsx`)                    |
| State      | `useSyncExternalStore` (`src/store/classifyStore.ts`)                       |
| Font       | Poppins + Inter (Fontsource, ikut dibundel sehingga jalan tanpa internet)   |
| Tes        | Vitest                                                                      |
| Deploy     | Vercel (statis)                                                             |

Dependensi produksi hanya `react`, `react-dom`, dan dua paket font. Animasi, router, ikon, dan state ditulis
sendiri supaya bundel kecil dan tidak terganggu perubahan versi pustaka.

## 1. Menjalankan di VS Code

1. Pasang **Node.js LTS** (`^20.19` atau `>=22.12`). Cek dengan `node -v`.
2. Buka folder `pilah-web` di VS Code, lalu klik **Install** pada rekomendasi ekstensi.
3. Di terminal VS Code:
   ```bash
   npm install
   npm run dev
   ```
   Buka <http://localhost:5173>. Selama `public/model/model.bin` belum ada, halaman Pindai berjalan dalam
   **mode demo** (bobot acak, ada banner peringatan), baik saat `npm run dev` maupun setelah deploy.
   Jalankan `npm install` lagi setiap kali `package.json` berubah (mis. setelah pdf-lib ditambahkan).

| Perintah            | Fungsi                                                               |
| ------------------- | -------------------------------------------------------------------- |
| `npm run dev`       | Server pengembangan                                                  |
| `npm run build`     | Build produksi ke `dist/`                                            |
| `npm run preview`   | Menjalankan hasil build secara lokal                                 |
| `npm test`          | Tes hitung manual makalah, kesamaan resize dengan Pillow, dan golden |
| `npm run typecheck` | Pemeriksaan tipe TypeScript                                          |
| `npm run lint`      | ESLint                                                               |
| `npm run check`     | Semua di atas sekaligus                                              |

**Melihat splash lagi:** splash tampil sekali per sesi. Buka jendela private, atau hapus kunci
`pilah:splash-seen` di DevTools → Application → Session Storage.

## 2. Memasang model dari Colab

1. Jalankan notebook `PILAH_CNN_Backpropagation.ipynb` di Google Colab dari atas sampai bawah.
   Bagian 9 mengunduh `pilah_model_web.zip`.
2. Ekstrak, lalu salin:
   - isi folder `model/` → `public/model/` (`model.bin`, `meta.json`, `golden.json`)
   - isi folder `samples/` → `public/samples/` (foto contoh + `manifest.json`)
3. Jalankan `npm test`. Tes **golden** otomatis aktif dan memastikan nilai y di web sama dengan notebook.
4. `npm run dev` untuk mencoba. Angka evaluasi, kurva error, dan jumlah data latih/uji di halaman Tentang
   semuanya terisi dari `meta.json`, jadi tidak ada angka yang perlu diubah manual bila notebook dijalankan
   ulang dengan pengaturan lain.

Detail format dan alasan teknisnya ada di `docs/MODEL-FORMAT.md`.

## 3. Deploy ke Vercel

1. Unggah proyek ke GitHub (folder `node_modules` dan `dist` tidak ikut, sudah diatur `.gitignore`).
2. Di <https://vercel.com> pilih **Add New → Project**, impor repositori. Vercel mengenali Vite otomatis
   (Build Command `npm run build`, Output Directory `dist`).
3. `vercel.json` sudah berisi rewrite agar alamat seperti `/tentang` tidak 404 saat dibuka langsung, dan
   cache panjang untuk berkas `assets/`.

## 4. Halaman

| Alamat         | Isi                                                                                                                                                                                                                                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (splash)       | Sampah jatuh ke tong yang sesuai, logo bergeser mulus, nama dan slogan muncul, jeda 3 detik. Sekali per sesi, tanpa tombol lewati.                                                                                                                                                                                                           |
| `/`            | Hero dengan permainan pilah, data sampah nasional, cara pakai, panduan organik/anorganik, **Berita** (`/#berita`), **FAQ** (`/#faq`), ajakan akhir                                                                                                                                                                                           |
| `/klasifikasi` | 1–20 foto per pindaian lewat kamera, galeri, seret-lepas, atau tempel (Ctrl+V). Deretan pratinjau dengan tombol hapus, foto ulang, dan ganti. Berkas yang tidak sesuai (format selain JPG/PNG/WebP, > 15 MB, rusak, terlalu kecil, duplikat, melebihi 20 foto) ditolak dengan alasan per berkas. Dialog konfirmasi saat meninggalkan halaman |
| `/hasil`       | 1 foto: foto masuk tong, peluang tiap kelas, saran, penelusuran 6 langkah CNN. 2+ foto: ringkasan (jumlah per jenis, tabel bergambar, saringan), rincian per foto (`/hasil?foto=…`), dan **Unduh PDF**. Pindah halaman atau Pindai lagi dikonfirmasi dulu, lalu hasilnya dihapus                                                             |
| `/tentang`     | Latar belakang, cara kerja interaktif, model & data, evaluasi, tim                                                                                                                                                                                                                                                                           |
| lainnya        | 404 dengan koran tersesat yang bisa dipilah                                                                                                                                                                                                                                                                                                  |

Alamat lama `/cara-kerja` dan `/panduan`, juga `/berita` dan `/faq`, dialihkan ke bagian yang sesuai.

Foto latar dan foto berita diambil langsung dari Unsplash (`unsplash()` di `src/lib/content.ts`). Saat offline
atau foto gagal dimuat, bagian tersebut tetap tampil dengan latar gradasi. Daftar berita ada di `NEWS` pada berkas yang sama;
untuk menambah berita, tambahkan objek baru di paling atas (urut dari yang terbaru).

## 5. Struktur

```
pilah-web/
├── docs/MODEL-FORMAT.md
├── public/
│   ├── brand/          logo dan tong (SVG)
│   ├── model/          model.bin, meta.json, golden.json (dari Colab)
│   ├── samples/        foto contoh + manifest.json (dari Colab)
│   └── tim/            foto tim untuk halaman Tentang: alfian.png, bintang.png, dosen.jpg
└── src/
    ├── assets/items/   10 ikon sampah 3D (WebP)
    ├── components/
    │   ├── about/      peraga konvolusi, pooling, sigmoid, kurva error
    │   ├── brand/      tong (SVG berlapis), logo, slogan
    │   ├── classify/   kamera, deretan pratinjau foto
    │   ├── home/       permainan pilah, berita, FAQ
    │   ├── layout/     header, navigasi bawah, footer
    │   ├── result/     animasi masuk tong, penelusur proses CNN, ringkasan banyak foto
    │   ├── splash/
    │   └── ui/         tombol, ikon, reveal, tooltip, dialog konfirmasi, foto latar, count-up, canvas peta
    ├── lib/
    │   ├── ml/         preprocess (resize identik Pillow), forward, model, classify + tes
    │   ├── advice.ts   label hasil + saran penanganan per foto
    │   ├── content.ts  semua teks: statistik, tim, FAQ, berita, foto
    │   ├── photos.ts   aturan berkas: format, 15 MB, 20 foto, duplikat (+ tes)
    │   ├── report.ts   laporan PDF (pdf-lib, dimuat saat tombol Unduh PDF ditekan)
    │   ├── motion.ts   easing pegas, helper animasi
    │   └── router.tsx
    ├── pages/          Home, Classify, Result, About, NotFound
    └── store/
```

Nama, NIM/NIP, dan dosen pembimbing di halaman Tentang ada di `TEAM` dan `SUPERVISOR` di
`src/lib/content.ts`. Fotonya cukup ditaruh di `public/tim/` dengan nama `alfian.png`, `bintang.png`, dan
`dosen.jpg`. Selama foto belum ada, kotaknya menampilkan inisial.
