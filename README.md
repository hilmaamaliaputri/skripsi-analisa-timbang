# Skripsi Analisa Timbang

Bahan skripsi **Hilma Amalia Putri**

Program Studi Informatika · Fakultas Teknik · Universitas Siliwangi

Terakhir diperbarui: 19 Oktober 2026

---

## Apa isi repo ini

Repo payung untuk seluruh pekerjaan skripsi. Isinya tiga bagian besar yang
sengaja dipisah supaya mudah dicari:

1. **`outline/`** — bahan skripsi. Analisis teknis, outline TA, dan slide.
2. **`sistem/`** — kode sistem yang sudah berjalan. Tiga sub-proyek terpisah.
3. **`jurnal/`** — koleksi rujukan. 29 PDF beserta indeks dan BibTeX.

Dokumen ini adalah pintu masuknya. Mulai dari sini.

---

## Peta repo

```
skripsi-analisa-timbang/
│
├── README.md                  ← kamu sedang di sini
├── CHANGELOG-PARAMETER.md     ← catatan revisi target 95% → 80%
│
├── outline/                   bahan skripsi
│   ├── analisis/              11 dokumen analisis teknis
│   ├── skripsi/               rangkuman outline TA
│   └── presentasi/            slide presentasi
│
├── sistem/                    kode yang berjalan
│   ├── README.md              cara menjalankan tiap sub-proyek
│   ├── poc-mobile-ocr-main/   PWA utama (React + TypeScript)
│   ├── poc-training-data-mobile-ocr-main/   pipeline ML (TensorFlow)
│   └── poc-ocr-timbangan-master/            app React Native + ML Kit
│
└── jurnal/                    koleksi rujukan
    ├── INDEKS-JURNAL.md       indeks utama, dikelompokkan per bab
    ├── UNDUH-MANUAL.md        paper yang perlu diunduh sendiri
    ├── references.bib         76 entri BibTeX
    └── pdf/                   29 berkas PDF (22 relevan)
```

---

## Mulai dari mana

Tergantung apa yang sedang kamu kerjakan.

**Kalau ingin memahami proyeknya secara keseluruhan**

Baca `outline/skripsi/RANGKUMAN_OUTLINE_TA.md`. Satu dokumen itu merangkum
semuanya — latar belakang, rumusan masalah, metodologi, sampai timeline.

**Kalau ingin menggali detail teknis**

Masuk ke `outline/analisis/`. Sebelas dokumen bernomor urut dari rencana
sampai catatan perubahan kode.

**Kalau ingin menjalankan atau menyunting sistemnya**

Masuk ke `sistem/`. Baca `sistem/README.md` dulu — di situ ada cara menjalankan
tiap sub-proyek dan daftar berkas yang perlu diunduh sendiri.

**Kalau sedang mencari rujukan**

Masuk ke `jurnal/`. Mulai dari `INDEKS-JURNAL.md`.

---

## Revisi parameter: 95% → 80%

Pada 19 Oktober 2026, lima parameter diturunkan dari 95% menjadi 80% agar
targetnya lebih realistis dicapai. Perubahan ini diterapkan **konsisten di dua
tempat**: dokumen outline dan kode sistem.

**Target akurasi**

- Target akurasi full-string — dari ≥95% menjadi ≥80%

**Ambang keyakinan lokal**

- `ocrThreshold` — dari 0,95 menjadi 0,80

**Parameter jalur cloud**

- `cloudFallbackThreshold` — dari 0,95 menjadi 0,80
- Batas slider fallback — dari 0,95 menjadi 0,80
- Konstanta confidence cloud — dari 0,95 menjadi 0,80

Rincian lengkap per berkas, termasuk daftar angka 95 yang sengaja tidak diubah
dan alasannya, ada di `CHANGELOG-PARAMETER.md`.

**Cara mengubahnya lagi nanti.** Di pipeline ML, target akurasi kini disimpan
sebagai satu konstanta `TARGET_FULL_ACC` di `config.py`. Ubah di situ saja —
`evaluate.py`, `train.py`, dan `train_transfer.py` membacanya dari sana. Di PWA,
nilainya ada di `src/store/settings.ts`.

---

## Catatan kejujuran

**Angka hasil di dokumen adalah apa adanya.** CNN dengan data sintetis mencapai
akurasi test 50,0%, ML Kit 4 dari 7, dan Tesseract 0 dari 12. Angka-angka ini
tidak diperhalus — justru itu dasar argumen kebaruan skripsi.

**Sebagian angka 95% sengaja dibiarkan.** Ada di laporan historis
(`SPEC.md` bagian Validation Report dan `SYNTHETIC_BASELINE_REPORT.md`) karena
itu catatan pengujian yang memang dijalankan saat targetnya masih 95%.
Mengubahnya akan menghapus bukti. Setiap dokumen begitu diberi catatan di
kepalanya.

**Dua berkas besar tidak disertakan.** Model ONNX dan data Tesseract
dikecualikan lewat `.gitignore` supaya repo ringan. Cara mendapatkannya ada di
`sistem/README.md`.

**Belum ada data nyata untuk melatih CNN.** Ini syarat utama sebelum eksperimen
E1–E4 bisa dijalankan.

**Ada satu kontradiksi antar dokumen yang belum diselesaikan.** Dua dokumen
analisis berbeda pendapat soal konstanta confidence cloud. Rinciannya ada di
bagian terakhir `CHANGELOG-PARAMETER.md`.
