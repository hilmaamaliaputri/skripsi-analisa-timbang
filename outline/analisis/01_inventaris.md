# 01 — Inventaris Repository

## 1a. Struktur folder & fungsi

| Folder | Fungsi | Bukti |
|---|---|---|
| `poc-mobile-ocr-main/` | PWA operator timbangan (React 18 + TS + Vite). Login → scan QR → foto display → OCR → review → simpan IndexedDB → sync. | [KODE] `poc-mobile-ocr-main/package.json:L2-6`, `src/routes.tsx:L19-35` |
| `…/src/pages/` | 8 halaman (Login, Dashboard, CaptureQR, CaptureOCR, Review, History, Detail, Settings) | [KODE] `src/routes.tsx:L3-10` |
| `…/src/lib/` | Logika inti: `db.ts` (Dexie+Cache API), `ocr.ts` (Tesseract), `ocr-cnn.ts` (ONNX), `ocr-cloud.ts` (Mistral), `image.ts` (preprocessing), `qr.ts` (ZXing), `camera.ts`, `sync.ts`, `api.ts`, `training.ts` (export ZIP), `utils.ts` | [KODE] direktori `src/lib/` |
| `…/src/store/` | State global Zustand: `auth`, `capture` (draft wizard), `network`, `settings` | [KODE] `src/store/*.ts` |
| `…/src/types/` | Interface TS: `Transaksi`, `TransaksiDraft`, `TrainingSample`, `OCRConfig`, API | [KODE] `src/types/*.ts` |
| `…/src/mocks/` | Handler MSW + data operator demo | [KODE] `src/mocks/handlers.ts`, `data.ts` |
| `…/public/models/` | `cnn_synth_v1.onnx` — **46.641.632 byte (≈44,5 MiB)**, format ONNX | [KODE] `ls -la` |
| `…/public/tesseract-data/` | `ssd.traineddata` (11.314.684 B), `letsgodigital.traineddata` (147.537 B) — model bahasa Tesseract untuk 7-segmen | [KODE] `ls -la` |
| `…/scripts/generate_icons.py` | Generator ikon PWA placeholder (Pillow) | [KODE] `scripts/generate_icons.py:L1-8` |
| `poc-training-data-mobile-ocr-main/` | Pipeline ML Python: sintetis → prepare → train → evaluate → export ONNX | [KODE] `README.md:L10-22` |
| `…/data/synthetic_full/` | 1.000 citra JPG + `labels.csv` + README (17 MB) | [KODE] `wc -l labels.csv` = 1001 baris |
| `…/data/synthetic_full_preview.png` | Pratinjau grid dataset sintetis (842 KB) | [KODE] |
| `…/notebooks/train_colab.ipynb` | Notebook Colab end-to-end — **tanpa output tersimpan** | [KODE] sel tidak memiliki `outputs` |
| `…/models/` | Hanya `.gitkeep` — **artefak model (.h5, history.json, evaluation_report.json) TIDAK ADA** (di-gitignore) | [KODE] `.gitignore` memuat `models/*/`, `*.h5`, `*.onnx` |
| `poc-ocr-timbangan-master/` | Aplikasi React Native (Expo 54) + Google ML Kit Text Recognition, 5 pipeline pra/pasca-proses berbasis aturan + voting | [KODE] `poc-ocr-timbangan-master/README.md:L1-5`, `package.json:L10-21` |
| `…/examples/` | 7 foto fixture timbangan (PNG, 30–683 KB) — dipakai sebagai set uji | [KODE] `README.md:L9-21` |
| `drive-download-…/` | 3 ZIP identik isinya dengan 3 folder (arsip) | [KODE] `unzip -l` |
| `PRESENTATION_ANALISA_TIMBANG.pptx` | 18 slide status proyek & proposal strategi hybrid (1 Mei 2026) | [KODE] teks `ppt/slides/slide1.xml` |

## 1b. Tech stack & versi

### (A) PWA — `poc-mobile-ocr-main/package.json`
| Kategori | Library | Versi | Bukti |
|---|---|---|---|
| Bahasa | TypeScript | ^5.5.4 (target ES2020, `strict: true`) | `package.json:L36`, `tsconfig.json:L3,L14` |
| UI | React / React DOM | ^18.3.1 | `package.json:L21-22` |
| Routing | react-router-dom | ^6.26.0 | `L23` |
| State | zustand | ^4.5.5 | `L25` |
| Database lokal | dexie (IndexedDB) + dexie-react-hooks | ^4.0.8 / ^1.1.7 | `L17-18` |
| OCR 1 | tesseract.js (WASM) | ^5.1.0 | `L24` |
| OCR 2 (ML runtime) | onnxruntime-web | ^1.25.1 | `L20` |
| QR | @zxing/browser, @zxing/library | ^0.1.5 / ^0.21.3 | `L15-16` |
| Export dataset | jszip | ^3.10.1 | `L19` |
| Build | vite ^5.4.2, @vitejs/plugin-react ^4.3.1 | | `L31,L37` |
| PWA | vite-plugin-pwa (Workbox) | ^0.20.5 | `L38` |
| Styling | tailwindcss ^3.4.10, postcss, autoprefixer | | `L32-35` |
| Mock backend | msw | ^2.4.0 (devDependency) | `L33` |
| Cloud OCR (opsional) | Mistral API (`mistral-ocr-latest`, `pixtral-12b-2409`) via `fetch` | — | `src/lib/ocr-cloud.ts:L22-25` |
| Deploy | Netlify (Node 20) | — | `netlify.toml:L1-6` |

### (B) Pipeline ML — `poc-training-data-mobile-ocr-main/requirements.txt`
| Kategori | Library | Versi | Bukti |
|---|---|---|---|
| Framework DL | tensorflow | >=2.15,<2.17 (opsional tensorflow-metal untuk Apple Silicon) | `requirements.txt:L2,L5-8` |
| Numerik | numpy | >=1.23,<2.0 | `L3` |
| Citra | opencv-python >=4.8, Pillow >=10.0, albumentations >=1.3 | | `L11-14` |
| Data | pandas >=2.0, scikit-learn >=1.3 | | `L13,L24` |
| Export | tf2onnx >=1.16, onnx >=1.15, onnxruntime >=1.16 | | `L17-19` |
| Visualisasi | matplotlib >=3.7, seaborn >=0.12 | | `L22-23` |
| Lainnya | tqdm, click, jupyter, ipykernel | | `L27-32` |
| Bahasa | Python (menggunakan sintaks `list[int]` → ≥3.9) | [INFERENSI] dari `config.py:L60` | |

### (C) App React Native — `poc-ocr-timbangan-master/package.json`
| Library | Versi | Bukti |
|---|---|---|
| expo | ~54.0.34 | `package.json:L11` |
| react / react-native | 19.1.0 / 0.81.5 | `L19-20` |
| @react-native-ml-kit/text-recognition | ^1.5.2 | `L18` |
| expo-image-manipulator, expo-image-picker, expo-camera, expo-asset, expo-file-system | ~14 / ~17 / ~17 / ~12 / ~19 | `L13-17` |
| Package manager | pnpm (lockfile `pnpm-lock.yaml`), Node 22+ | `README.md:L41-42` |

### Storage
- IndexedDB (DB `analisa-timbang`, tabel `transaksi`, `training_samples`) — [KODE] `src/lib/db.ts:L12-19`
- Cache API (`analisa-images-v1`) untuk blob foto — [KODE] `src/lib/db.ts:L5,L60-65`
- localStorage (Zustand persist `analisa-auth`, `analisa-settings`; `device_id`) — [KODE] `store/auth.ts:L27`, `store/settings.ts:L87`, `lib/utils.ts:L46-54`
- Server/DB backend: **TIDAK DITEMUKAN DI REPO** (hanya mock) — [KODE] `src/lib/api.ts:L9-12`

## 1c. Entry point & cara menjalankan

| Sub-proyek | Entry | Perintah | Bukti |
|---|---|---|---|
| (A) PWA | `index.html` → `src/main.tsx` → `routes.tsx` | `npm install` · `npm run dev` (port 5173) · `npm run build` (= `tsc && vite build`) · `npm run preview` · `npm run type-check` | `package.json:L7-13`, `vite.config.ts:L71-75`, `index.html:L24` |
| (A) Deploy | Netlify build `npm run build`, publish `dist`, SPA fallback | | `netlify.toml:L1-12` |
| (B) ML | skrip CLI | `python generate_synthetic.py --count 1000` → `python prepare.py --input … --clean` → `python train.py --epochs 50` → `python evaluate.py --model … --data …/test/` → `python export_onnx.py --model … --output model.onnx` ; opsional `train_transfer.py`, `predict.py`, Colab notebook | `README.md:L10-22`, docstring tiap skrip |
| (C) RN | `index.js` → `App.js` → `ScannerScreen.js` | `pnpm install` · `pnpm android` (`expo run:android`) · `pnpm start` | `package.json:L5-9`, `index.js:L1-4` |
| Test otomatis | — | **TIDAK ADA script `test`** di ketiga sub-proyek | [KODE] `package.json` (A) L7-13, (C) L5-9 |

## 1d. Statistik file & LOC (tanpa lockfile, node_modules, dataset)

| Bahasa | Jumlah file | Baris | Keterangan |
|---|---|---|---|
| TSX | 19 | 3.001 | halaman & komponen PWA |
| TS | 25 | 1.957 | lib/store/types PWA + config |
| JS | 14 | 2.267 | app React Native (C) + postcss |
| Python | 9 | 2.045 | pipeline ML (B) + generate_icons |
| Markdown | 9 | 3.148 | dokumentasi |
| CSS / HTML / TOML / JSON / IPYNB | 1 / 1 / 1 / 5 / 1 | 132 / 26 / 34 / 131 / 268 | |

Per sub-proyek (kode `.ts/.tsx/.js/.py` saja): (A) 5.053 · (B) 1.956 · (C) 2.261 baris. [KODE] hasil `wc -l`.

File terbesar logika: `pages/Review.tsx` (586 L), `pages/Settings.tsx` (513 L), `r37-lcd-attack.js` (409 L), `CaptureOCR.tsx` (388 L), `train.py` (369 L), `train_transfer.py` (368 L).

Biner: `cnn_synth_v1.onnx` 46,6 MB; `ssd.traineddata` 11,3 MB; `letsgodigital.traineddata` 147 KB; 7 PNG fixture (total ≈1,7 MB); dataset sintetis 1.000 JPG (17 MB); PPTX 68 KB.

## 1e. Dokumentasi yang sudah ada

| Dokumen | Isi pokok | Catatan |
|---|---|---|
| `poc-mobile-ocr-main/README.md` | Quick start, demo login, alur demo, struktur folder | Menyebut MSW di-boot di `main.tsx`, **tidak sesuai kode** (lihat 07) |
| `poc-mobile-ocr-main/SPEC.md` (889 L) | Tujuan POC, scope, success criteria C1–C9 & N1–N6, risk matrix R1–R8, arsitektur, demo, timeline, **Validation Report 1 Mei 2026** (12 uji Tesseract), rencana Phase 0 + RAB | Sumber utama latar belakang & hasil Tesseract |
| `…training…/README.md` | Arsitektur CRNN+CTC, target ≥80%, tabel hardware | |
| `…/TRAINING.md` (418 L) | Panduan step-by-step | **Angka 95,8% di L170-189 adalah CONTOH OUTPUT ilustratif**, bukan hasil eksperimen |
| `…/DEPLOYMENT.md` (507 L) | Integrasi ONNX ke PWA, checklist | Tabel "Expected" L363-371 = proyeksi, bukan hasil |
| `…/SYNTHETIC_BASELINE_REPORT.md` (281 L) | **Satu-satunya laporan hasil training**: from-scratch 60,4% val / 50,0% test; transfer learning 18,8% | Artefak mentah (json/csv) tidak ada di repo |
| `poc-ocr-timbangan-master/README.md`, `docs/PIPELINES_OVERVIEW.md`, `docs/ANALYSIS_PER_FILE.md` | Hasil 30 "loop" tuning pipeline ML Kit: terbaik 4/7 EXACT | Merujuk folder `output/` yang **tidak ada di repo** |
| `PRESENTATION_ANALISA_TIMBANG.pptx` | Latar belakang (cara lama vs baru), status, strategi Opsi A/B/D (hybrid), RAB | Beberapa klaim tidak sesuai kode (GPS, Google Vision) — lihat 07 |
| Referensi `../planning/PRD.md`, `mockup.html`, `Feature_List_ANALISA_TIMBANG.xlsx` | 81 fitur, RAB, timeline | **TIDAK DITEMUKAN DI REPO** [KONFIRMASI] |

Komentar kode penting: komentar Bahasa Indonesia cukup padat, mis. alasan PSM 7 (`src/lib/ocr.ts:L93-95`), catatan keamanan API key (`src/lib/ocr-cloud.ts:L12-13`), kewajiban preprocessing identik train–inference (`src/lib/ocr-cnn.ts:L47-50`).

## 1f. Riwayat & timeline (pengganti git log)

Riwayat git: **TIDAK DITEMUKAN DI REPO**. Timeline di bawah disusun dari tanggal dokumen dan mtime file (entri ZIP mempertahankan tanggal asli).

| Tanggal | Milestone | Bukti | Label |
|---|---|---|---|
| 30 Apr 2026 | Scaffold PWA v0.1.0 selesai | `poc-mobile-ocr-main/README.md:L244-246` | [KODE] |
| s.d. 1 Mei 2026 | Uji Tesseract (eng/ssd/letsgodigital), 12 data point → gagal target | `SPEC.md:L778-795` | [KODE] |
| 1 Mei 2026 | Constraint stakeholder: threshold 80%, tanpa input manual, tanpa cloud AI | `SPEC.md:L769-776` | [KODE] |
| 1 Mei 2026 14:04 | Dataset sintetis 1.000 sampel (seed 100) dibuat | `data/synthetic_full/README.md:L3-5` | [KODE] |
| 1 Mei 2026 | Training CRNN from-scratch & transfer learning, laporan baseline | `SYNTHETIC_BASELINE_REPORT.md:L3-6` | [KODE] |
| 1 Mei 2026 21:47 | Snapshot terakhir PWA + training (mtime seluruh file) | `stat` | [INFERENSI] |
| 1 Mei 2026 | Presentasi status & usulan Opsi D (hybrid cloud) | slide 1 | [KODE] |
| setelah 1 Mei | Fitur cloud fallback Mistral ditambahkan ke PWA (settings versi persist = 7) | `src/store/settings.ts:L88`, `src/lib/ocr-cloud.ts` | [INFERENSI] — urutan tepat tidak bisa dipastikan |
| 12 Mei 2026 | Snapshot app React Native + ML Kit (30 loop tuning) | mtime `poc-ocr-timbangan-master/*` | [INFERENSI] |
| 3 Agu 2026 | mtime file PPTX (kemungkinan disunting ulang) | `stat PRESENTATION_ANALISA_TIMBANG.pptx` | [INFERENSI] |

**Implikasi untuk skripsi:** tanpa git log, klaim metodologi (iteratif/prototyping) harus didukung bukti lain: versi skema Dexie v1→v2 (`db.ts:L13-19`), versi persist settings hingga 7 (`settings.ts:L88`), penomoran "Round/Loop" 25→40 di sub-proyek (C) (`docs/PIPELINES_OVERVIEW.md:L9-31`). [KONFIRMASI] apakah repo git asli (GitHub/GitLab) masih bisa diakses untuk mengambil `git log`.
