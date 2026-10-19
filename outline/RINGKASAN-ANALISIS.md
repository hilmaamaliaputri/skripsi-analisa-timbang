# Bahan Skripsi — Analisa Timbang (ringkasan)

## Ringkasan eksekutif

**Analisa Timbang** adalah proof of concept untuk mendigitalkan pencatatan berat karung oleh operator timbangan. Folder repo berisi **tiga sub-proyek**, bukan satu:

1. **PWA offline-first** (`poc-mobile-ocr-main`, React 18 + TypeScript + Vite, ±5.050 LOC). Alurnya: login → scan QR karung (ZXing) → ambil 1–5 frame dari ROI display → OCR on-device → confidence gate 95% → simpan ke IndexedDB, dengan foto di Cache API → sinkron ke backend saat online. Backend masih berupa **mock**. Engine OCR bisa dipilih: **Tesseract.js** (traineddata `ssd`/`letsgodigital`, PSM 7) atau **CRNN-CTC ONNX** (`cnn_synth_v1.onnx`, 46,6 MB, FP32, onnxruntime-web WASM). Ada juga **cloud fallback Mistral** yang opsional. Aplikasi punya **Mode Training** untuk mengumpulkan pasangan citra + ground truth dan mengekspornya sebagai ZIP.
2. **Pipeline ML Python** (`poc-training-data-mobile-ocr-main`, TensorFlow 2.15–2.16). Isinya generator data sintetis 7-segmen, prepare (split 80/10/10 per panjang label, augmentasi 4×), CRNN (7 conv + 2 BiLSTM + CTC, **11.598.093 parameter**, T=16), transfer learning MobileNetV3-Small, evaluasi (exact match, char acc, edit distance, confusion matrix), dan ekspor ONNX opset 13.
3. **App React Native + Google ML Kit** (`poc-ocr-timbangan-master`). Isinya 5 pipeline heuristik dan voting berbobot hasil 30 "loop" tuning.

**Hasil yang tercatat** (dari dokumen; artefak mentahnya tidak ada di repo):
- Tesseract: **0/12 exact** pada 2 citra nyata.
- CRNN dengan data sintetis: **val 60,4%, test 50,0% (52/104)**, char acc 82%, label 7 karakter hanya 18%.
- Transfer learning: 18,8%.
- ML Kit R35: **4/7 (57,1%)** di emulator.

Target stakeholder ≥95% **belum tercapai**. **Data nyata untuk melatih CNN belum ada sama sekali.** Angka "~50–60%" di prompt sesuai dengan hasil CNN sintetis dan ML Kit, bukan Tesseract.

**Temuan teknis kritis** (perlu dikonfirmasi lewat eksperimen):
- Reshape CNN→RNN dilakukan tanpa Permute, sehingga urutan sekuens CTC salah sumbu.
- Preprocessing saat training berbeda dengan saat inferensi.
- `parseBerat` membulatkan ke 2 desimal: 3.895 → 3,9.
- Validasi ekspor ONNX gagal menurut ambang skripnya sendiri (max diff 0,94 vs ambang 1e-4).
- Cloud fallback dan jalur koreksi manual bertentangan dengan constraint "tanpa cloud, tanpa input manual".
- Tidak ada test otomatis dan tidak ada riwayat git.

**Rekomendasi skripsi:** judul gabungan (PWA + CRNN-CTC on-device) dengan metodologi Prototyping + CRISP-DM. Syarat utamanya adalah mengumpulkan ≥500 citra nyata lewat Mode Training dan menjalankan eksperimen E1–E4.

## Daftar file hasil

| File | Isi singkat |
|---|---|
| **`RANGKUMAN_OUTLINE_TA.md`** | **Rangkuman lengkap outline Tugas Akhir (RP, RQ, RO, arsitektur, metodologi CRISP-DM + Prototyping, Bab I–V, timeline 16 minggu) format IF Unsil** |
| `00_rencana.md` | Struktur root, 3 sub-proyek, rencana baca per fase |
| `01_inventaris.md` | Fungsi folder, tech stack + versi, cara menjalankan, LOC, dokumentasi, timeline (pengganti git log) |
| `02_arsitektur.md` | Pola offline-first & layering, modul + dependensi, alur data, offline/sync, integrasi eksternal, diagram komponen & deployment |
| `03_fitur_kebutuhan.md` | 20 fitur PWA + 3 fitur RN, aktor, KF-01..17, KNF-01..12, use case, 2 activity, sequence, daftar screen |
| `04_data.md` | Skema IndexedDB/Cache/localStorage, field & index, skema API & dataset, siklus hidup, ERD & class diagram |
| `05_metode_algoritma.md` | Preprocessing, konfigurasi Tesseract, arsitektur CRNN per layer + hitung parameter, training, decoding, deployment ONNX, pseudocode & rumus LaTeX |
| `06_pengujian_evaluasi.md` | Status test, metrik `evaluate.py`, semua angka hasil + sumbernya, klaim yang bukan hasil, gap, rancangan eksperimen E1–E5, 25 kasus black-box |
| `07_keterbatasan.md` | TODO, 28 tech debt, batasan masalah, 11 isu keamanan/privasi, 12 risiko validitas |
| `08_pemetaan_skripsi.md` | 3 alternatif judul, argumen latar belakang, rumusan–tujuan, metodologi + bukti, topik teori + kata kunci, novelty |
| `09_outline_bimbingan.md` | Outline Bab I–V + status, daftar gambar/tabel/lampiran, checklist data, 15 pertanyaan pembimbing, timeline 16 minggu |
| `10_perubahan_kode.md` | Catatan perbaikan bug kritis (Permute, parsing desimal, sinkronisasi preprocessing, Google Vision fallback) |

## Daftar pertanyaan [KONFIRMASI] untuk Anda

**Konteks skripsi**
1. Program studi apa (Informatika / Sistem Informasi / Teknik Komputer), dan kampus mana? Apakah ada template atau panduan penulisan khusus?
2. Jenis skripsi mana yang dipilih: pengembangan sistem, eksperimen ML, atau gabungan?
3. Apa peran Anda di proyek (perancang, pengembang PWA, ML engineer, analis)? Bagian mana yang Anda kerjakan sendiri? Dokumen menyebut "Tim Engineering" dan "Imp Studio".
4. Apakah ada izin tertulis dari perusahaan/klien untuk memakai proyek, data, dan nama "PT ANALISA INDUSTRI"/"PT MITRA LOGISTIK" dalam skripsi? Atau nama-nama itu fiktif?

**Data & hasil**
5. Apakah sudah ada data nyata dari Mode Training (ZIP `analisa-training-*.zip`)? Jika ada, berapa sampel, dari merek timbangan apa, dan di mana disimpan?
6. Apakah artefak training masih tersimpan (`models/cnn_synth_v1/*.h5`, `evaluation_report.json`, `training.csv`, `confusion_matrix.png`, `failures.csv`, `onnx_validation.json`), begitu juga folder `output/` milik app RN?
7. Dari mana sumber dan apa lisensi 7 foto fixture (`examples/`) serta citra Kaggle "7-Segment Industrial Digits"?
8. Merek, tipe, dan resolusi desimal timbangan apa saja yang ada di lokasi penelitian (mis. GRAM-S5i, CAS)?
9. Apakah uji C1–C9 (installability, offline, storage 200 blob, akurasi QR) pernah dijalankan? Jika ya, di mana hasilnya?

**Repositori & dokumen**
10. Apakah repo git aslinya masih bisa diakses? Riwayat commit dibutuhkan untuk timeline dan bukti metodologi.
11. Di mana file `planning/PRD.md`, `mockup.html`, dan `Feature_List_ANALISA_TIMBANG.xlsx` (81 fitur, RAB)?
12. Apa URL Netlify yang aktif (slide 10 masih placeholder)?
13. Apa hubungan app React Native + ML Kit dengan PWA: jalur alternatif yang dibatalkan atau pembanding? Siapa yang mengerjakannya?

**Keputusan desain**
14. Apakah constraint "tanpa cloud AI" dan "tanpa input manual" masih berlaku? Kode sudah memiliki cloud fallback Mistral dan jalur koreksi manual, sementara slide mengusulkan Google Vision. Mana yang final?
15. Apakah backend sinkronisasi sungguhan sedang atau akan dibangun, dan dengan teknologi apa?
16. Apakah Anda bersedia (dan diizinkan) memperbaiki bug yang ditemukan (Permute, pembulatan desimal, `ocr_model`, pre-fill ground truth) sebagai bagian dari penelitian? Semua perbaikan dilakukan di luar folder `skripsi/`.
17. Apakah ada data dampak bisnis (jumlah transaksi per hari, tingkat salah catat manual) untuk latar belakang?
