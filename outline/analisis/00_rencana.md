# 00 — Rencana Analisis Repository "Analisa Timbang"

> Dokumen ini adalah hasil FASE 0. Semua path relatif terhadap root `OCR 7 Segments/`.
> Label: **[KODE]** terbukti dari kode/config · **[INFERENSI]** kesimpulan analis · **[KONFIRMASI]** perlu ditanyakan ke pemilik proyek.

## 0.1 Temuan awal struktur root (kedalaman 3)

```
OCR 7 Segments/
├── PRESENTATION_ANALISA_TIMBANG.pptx          (68 KB, 18 slide, status proyek 1 Mei 2026)
├── drive-download-20260927T025225Z-1-001/     (3 file ZIP = salinan arsip dari 3 folder di bawah)
├── poc-mobile-ocr-main/                        ← (A) PWA React + TypeScript  (aplikasi utama)
│   ├── src/{pages,components,lib,store,types,mocks,styles}
│   ├── public/{models/cnn_synth_v1.onnx, tesseract-data/*.traineddata, icons, manifest}
│   ├── README.md, SPEC.md (spesifikasi + laporan validasi POC)
│   └── vite.config.ts, netlify.toml, package.json
├── poc-training-data-mobile-ocr-main/          ← (B) Pipeline ML Python (TensorFlow CRNN-CTC)
│   ├── config.py, generate_synthetic.py, prepare.py, train.py, train_transfer.py,
│   │   evaluate.py, predict.py, export_onnx.py
│   ├── data/synthetic_full/ (1000 citra + labels.csv), notebooks/train_colab.ipynb
│   └── README.md, TRAINING.md, DEPLOYMENT.md, SYNTHETIC_BASELINE_REPORT.md
└── poc-ocr-timbangan-master/                   ← (C) Aplikasi React Native/Expo + Google ML Kit
    ├── src/{ScannerScreen.js, models.js, ocr/{runners.js, lib/, pipelines/}}
    ├── examples/ (7 foto fixture timbangan)
    └── docs/{PIPELINES_OVERVIEW.md, ANALYSIS_PER_FILE.md}
```

**Catatan penting awal:**
- [KODE] Repository ini **bukan satu repo**, melainkan **3 sub-proyek** terpisah (masing-masing punya `package.json`/`requirements.txt` sendiri).
- [KODE] **Tidak ada folder `.git`** di root maupun di dalam ZIP arsip (`unzip -l` pada 3 ZIP tidak memuat `.git/`). Riwayat commit **TIDAK DITEMUKAN DI REPO**; timeline disusun dari tanggal dokumen & mtime file.
- [KODE] Sub-proyek (C) — React Native + ML Kit — **tidak disebut** dalam deskripsi proyek di prompt (yang menyebut Tesseract + CNN). Ini jalur eksperimen OCR ketiga.
- [KODE] `node_modules/`, `dist/` tidak ada di disk → build/test tidak bisa dijalankan tanpa `npm install`.

## 0.2 Rencana baca per fase

| Fase | Output | Folder/file yang dibaca |
|---|---|---|
| 1 Inventaris | `01_inventaris.md` | semua `package.json`, `requirements.txt`, `app.json`, `vite.config.ts`, `netlify.toml`, `tsconfig.json`, semua README/MD, PPTX (teks slide), stat file & LOC, tanggal file |
| 2 Arsitektur | `02_arsitektur.md` | (A) `src/main.tsx`, `routes.tsx`, `lib/*`, `store/*`, `vite.config.ts`; (B) alur skrip Python; (C) `runners.js`, `pipelines/*` |
| 3 Fitur & Kebutuhan | `03_fitur_kebutuhan.md` | (A) `src/pages/*`, `components/*`, `SPEC.md` §2–3; (C) `ScannerScreen.js`, `models.js` |
| 4 Data | `04_data.md` | (A) `types/*`, `lib/db.ts`, `lib/training.ts`, `store/*` (persist), `types/api.ts`; (B) format `labels.csv` |
| 5 Metode & Algoritma | `05_metode_algoritma.md` | (A) `lib/image.ts`, `lib/ocr.ts`, `lib/ocr-cnn.ts`, `lib/ocr-cloud.ts`, `pages/CaptureOCR.tsx`; (B) semua `.py`; (C) `pipelines/r35-tuned-trim.js`, `r39-*.js` |
| 6 Pengujian | `06_pengujian_evaluasi.md` | `evaluate.py`, `SYNTHETIC_BASELINE_REPORT.md`, `SPEC.md` (Validation Report), (C) `README.md`, `docs/*`, `lib/groundTruth.js` |
| 7 Keterbatasan | `07_keterbatasan.md` | grep TODO/FIXME/HACK, `ocr-cloud.ts`, `settings.ts`, `api.ts`, `mocks/data.ts`, perbandingan kode vs dokumen |
| 8 Pemetaan | `08_pemetaan_skripsi.md` | sintesis fase 1–7 |
| 9 Outline | `09_outline_bimbingan.md` | sintesis fase 1–8 |
| Akhir | `README.md` | ringkasan + daftar [KONFIRMASI] |

## 0.3 Asumsi kerja
- Karena `KONTEKS` di prompt masih berisi placeholder (program studi, kampus, jenis skripsi, peran), analisis Fase 8–9 menyajikan **alternatif untuk ketiga jenis skripsi** dan menandai pilihan akhir sebagai [KONFIRMASI].
- File biner besar hanya dicatat nama/ukuran/format (`.onnx`, `.traineddata`, `.png`, `.pptx`, `.zip`).
