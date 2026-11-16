# Berkas model

Salin isi folder `model/` dari `pilah_model_web.zip` (hasil Bagian 9 notebook Colab) ke sini:

- `model.bin`: 131.185 bobot float32 (±0,5 MB)
- `meta.json`: arsitektur, ambang, metrik uji, riwayat pelatihan
- `golden.json`: beberapa citra uji + nilai y dari notebook untuk `npm test`

Format lengkap: `docs/MODEL-FORMAT.md`. Tanpa berkas ini, `npm run dev` berjalan dalam mode demo.
