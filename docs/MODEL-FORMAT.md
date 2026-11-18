# Format model (Colab → web)

Web hanya menjalankan **umpan maju**. Pelatihan tetap di notebook Colab (NumPy murni). Bagian 8 notebook
mengekspor semua berkas di bawah secara otomatis ke `pilah_model_web.zip`.

## model.bin

Bilangan float32 little-endian, C-order, dengan urutan:

| Urutan | Nama | Bentuk       | Keterangan                          |
| -----: | ---- | ------------ | ----------------------------------- |
|      1 | `K`  | (8, c, 3, 3) | kernel `[kernel][kanal][u][v]`      |
|      2 | `bc` | (8,)         | bias konvolusi                      |
|      3 | `V`  | (8192, 16)   | bobot input→hidden, `V[i][j]` = vᵢⱼ |
|      4 | `v0` | (16,)        | bias hidden                         |
|      5 | `w`  | (16,)        | bobot hidden→output                 |
|      6 | `w0` | (1,)         | bias output                         |

`c` = `channels` di meta.json: 3 untuk model berwarna (total **131.329 float32 = 525.316 byte**), 1 untuk
model lama satu kanal (131.185 float32). Urutan flatten `(kanal, baris, kolom)`, yaitu `x = P.reshape(-1)`
dengan `P` berbentuk `(8, 32, 32)`, sama seperti Langkah 6 algoritma CNN di makalah.

## meta.json

```json
{
  "version": "2026.11.20",
  "inputSize": 64,
  "kernels": 8,
  "kernelSize": 3,
  "hidden": 16,
  "flatten": "channel-major",
  "grayRound": true,
  "channels": 3,
  "threshold": 0.5,
  "uncertainBand": 0.1,
  "metrics": {
    "accuracy": 0.0,
    "precision": 0.0,
    "recall": 0.0,
    "f1": 0.0,
    "testSize": 4446,
    "tp": 0,
    "tn": 0,
    "fp": 0,
    "fn": 0
  },
  "data": { "perClass": 11111, "used": 22222, "train": 17776, "test": 4446 },
  "training": {
    "trainSize": 17776,
    "epochs": 0,
    "alpha": 0.01,
    "epsilon": 0.05,
    "eMax": 50,
    "l2": 0.01,
    "flip": true,
    "lossHistory": [],
    "accHistory": []
  },
  "trainedAt": "2026-11-20"
}
```

`uncertainBand` = 0,1 berarti hasil dengan 0,4 < y < 0,6 ditampilkan sebagai "belum yakin".

`data`, `l2`, `flip`, dan `alphaDecay` (hanya ada bila learning rate dikecilkan bertahap) baru ada sejak notebook
versi 2. Website tetap bisa membaca `meta.json` dari notebook versi pertama: jumlah data dihitung dari `trainSize`
dan `testSize`.

## golden.json

Beberapa citra uji: nama berkas, piksel input `input` berbentuk (kanal, 64, 64) yang diratakan (bilangan bulat
0–255), dan nilai y dari notebook. `npm test` menjalankan umpan maju web pada input yang sama dan memastikan
y sama sampai 4 desimal. Model lama memakai kolom `gray` (64 × 64) dan tetap didukung.

## Kesamaan prapemrosesan

Web meniru notebook secara persis, bukan sekadar mirip:

1. **Orientasi**: foto diputar sesuai EXIF (`ImageOps.exif_transpose` ↔ `imageOrientation: 'from-image'`).
2. **Transparansi**: PNG transparan ditempel di atas latar putih di kedua sisi.
3. **Resize**: `src/lib/ml/preprocess.ts` adalah implementasi ulang `Image.resize(..., Image.BILINEAR)` milik
   Pillow (filter segitiga dengan antialias, dua lintasan, koefisien fixed-point 22 bit). Tes
   `preprocess.test.ts` membandingkannya dengan keluaran Pillow asli dan hasilnya identik piksel per piksel.
4. **Kanal**: model tiga kanal memakai nilai R, G, B apa adanya, disusun `(kanal, baris, kolom)`. Model satu
   kanal memakai `0,299R + 0,587G + 0,114B` yang dibulatkan dengan `floor(x + 0,5)`.
5. **Normalisasi**: dibagi 255.

Pada uji E2E, keenam foto contoh menghasilkan nilai y yang sama dengan notebook (selisih di bawah 0,0001). Satu-satunya sumber perbedaan yang mungkin tersisa adalah dekoder JPEG browser
tertentu; selisihnya sangat kecil dan tidak mengubah kelas.
