# Format model (Colab → web)

Web hanya menjalankan **umpan maju**. Pelatihan tetap di notebook Colab (NumPy murni). Bagian 9 notebook
mengekspor semua berkas di bawah secara otomatis ke `pilah_model_web.zip`.

## model.bin

Bilangan float32 little-endian, C-order, dengan urutan:

| Urutan | Nama | Bentuk     | Keterangan                            |
| -----: | ---- | ---------- | ------------------------------------- |
|      1 | `K`  | (8, 3, 3)  | kernel `[kernel][u][v]`               |
|      2 | `bc` | (8,)       | bias konvolusi                        |
|      3 | `V`  | (8192, 16) | bobot input→hidden, `V[i][j]` = vᵢⱼ   |
|      4 | `v0` | (16,)      | bias hidden                           |
|      5 | `w`  | (16,)      | bobot hidden→output                   |
|      6 | `w0` | (1,)       | bias output                           |

Total **131.185 float32 = 524.740 byte**. Urutan flatten `(kanal, baris, kolom)`, yaitu `x = P.reshape(-1)`
dengan `P` berbentuk `(8, 32, 32)`, sama seperti Langkah 6 algoritma CNN di makalah.

## meta.json

```json
{
  "version": "2026.11.20",
  "inputSize": 64, "kernels": 8, "kernelSize": 3, "hidden": 16,
  "flatten": "channel-major",
  "grayRound": true,
  "threshold": 0.5,
  "uncertainBand": 0.1,
  "metrics": { "accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0, "testSize": 400, "tp": 0, "tn": 0, "fp": 0, "fn": 0 },
  "training": { "trainSize": 1600, "epochs": 0, "alpha": 0.01, "epsilon": 0.05, "eMax": 50, "lossHistory": [], "accHistory": [] },
  "trainedAt": "2026-11-20"
}
```

`uncertainBand` = 0,1 berarti hasil dengan 0,4 < y < 0,6 ditampilkan sebagai "belum yakin".

## golden.json

Beberapa citra uji: nama berkas, matriks grayscale 64 × 64 (bilangan bulat 0–255), dan nilai y dari notebook.
`npm test` menjalankan umpan maju web pada matriks yang sama dan memastikan y sama sampai 4 desimal.

## Kesamaan prapemrosesan

Web meniru notebook secara persis, bukan sekadar mirip:

1. **Orientasi**: foto diputar sesuai EXIF (`ImageOps.exif_transpose` ↔ `imageOrientation: 'from-image'`).
2. **Transparansi**: PNG transparan ditempel di atas latar putih di kedua sisi.
3. **Resize**: `src/lib/ml/preprocess.ts` adalah implementasi ulang `Image.resize(..., Image.BILINEAR)` milik
   Pillow (filter segitiga dengan antialias, dua lintasan, koefisien fixed-point 22 bit). Tes
   `preprocess.test.ts` membandingkannya dengan keluaran Pillow asli dan hasilnya identik piksel per piksel.
4. **Grayscale**: `0,299R + 0,587G + 0,114B` lalu dibulatkan dengan `floor(x + 0,5)` (sama di NumPy dan JS).
5. **Normalisasi**: dibagi 255.

Pada uji E2E, keenam foto contoh menghasilkan matriks input yang sama persis (selisih 0) dan nilai y yang
sama dengan notebook. Satu-satunya sumber perbedaan yang mungkin tersisa adalah dekoder JPEG browser
tertentu; selisihnya sangat kecil dan tidak mengubah kelas.
