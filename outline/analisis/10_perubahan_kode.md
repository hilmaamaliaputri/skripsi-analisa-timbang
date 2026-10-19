# 10 — Catatan Perubahan Kode (27 September 2026)

> Dokumen ini mencatat perubahan kode setelah analisis awal (Fase 0–9), atas permintaan pemilik proyek:
> (1) cloud fallback dimigrasi dari **Mistral → Google Cloud Vision**, (2) bug yang ditemukan di `07_keterbatasan.md` diperbaiki.
> Salinan kode **sebelum perubahan** tetap tersedia di `drive-download-20260927T025225Z-1-001/*.zip` (repo tidak memakai git).
> Nomor baris di bawah mengacu ke kode **setelah** perubahan.

## Status verifikasi
| Bagian | Verifikasi | Hasil |
|---|---|---|
| Python (`poc-training-data-mobile-ocr-main`) | `python3 -m py_compile` semua skrip | Lolos (sintaks). Training ulang **belum** dijalankan (TensorFlow tidak terpasang di mesin ini) |
| TypeScript/React (`poc-mobile-ocr-main`) | `npm run type-check` / `npm run build` | **Belum dijalankan** — Node.js tidak terpasang. Wajib dijalankan sebelum dipakai: `npm install && npm run type-check && npm run build` |
| Uji fungsional Google Vision | Butuh API key + koneksi | **Belum diuji** |

## A. Migrasi cloud fallback ke Google Cloud Vision

| File | Perubahan |
|---|---|
| `poc-mobile-ocr-main/src/lib/ocr-cloud.ts` (ditulis ulang) | Endpoint `https://vision.googleapis.com/v1/images:annotate` (`L33`); fitur `DOCUMENT_TEXT_DETECTION` (default, ada confidence per simbol) atau `TEXT_DETECTION`; API key dikirim via header `X-Goog-Api-Key` (`L177`), bukan query string; gambar dikirim base64 murni; pemilihan angka dari **paragraf tertinggi** (digit display biasanya teks terbesar, label "TARE/kg" lebih kecil) (`pickWeight`, `L131`); confidence = rata-rata confidence simbol digit/titik (bukan lagi konstanta 0,95); field baru `confidenceAvailable`; error respons Vision ditangani. |
| `src/store/settings.ts` | `mistralApiKey` → `googleVisionApiKey`; `cloudOcrMode` `'ocr'\|'pixtral'` → `'document'\|'text'`; setting baru `autoCollectCloudSamples` (default `true`); versi persist 7 → **8** dengan migrasi (`L93-115`). API key Mistral lama sengaja tidak dibawa. |
| `src/pages/Settings.tsx` (`L212`) | Seksi "CLOUD FALLBACK · GOOGLE VISION": input API key (dengan saran membatasi key per HTTP referrer + hanya Vision API), slider trigger, pilihan DOCUMENT/TEXT, toggle AUTO-COLLECT DATASET. |
| `src/pages/CaptureOCR.tsx`, `src/pages/Review.tsx`, `src/pages/Detail.tsx` | Semua label/variabel Mistral/Pixtral → Google Vision. |
| `src/types/transaksi.ts` | `OCRSource` baru `'cloud-vision'`; `'cloud-mistral'` dipertahankan sebagai legacy agar record lama tetap terbaca; draft punya `cloud_verified_text`. |
| `src/store/capture.ts` | `confirmCloudResult(berat, manualEdited, verifiedText)` menyimpan teks final yang dikonfirmasi. |

### Fitur baru: auto-collect dataset (realisasi "Hybrid bootstrap" slide 14 langkah 4)
`src/pages/Review.tsx:L172-200`: saat transaksi bersumber `cloud-confirmed` disimpan dan `autoCollectCloudSamples` aktif, sistem otomatis menyimpan **(foto display, angka terverifikasi operator)** ke tabel `training_samples` dengan `notes = "auto:cloud-confirmed (google-vision[, operator-edit])"`. Tujuannya: mengatasi kelangkaan data nyata — setiap kasus yang gagal dibaca model lokal menjadi data latih baru. Label ini dikategorikan **silver label** (dibantu mesin + konfirmasi manusia) dan dapat dipisahkan saat analisis lewat kolom `notes`.

## B. Perbaikan bug

| ID (lihat 07) | Masalah | Perbaikan | Lokasi |
|---|---|---|---|
| T-13 | `parseBerat` membulatkan ke 2 desimal (3.895 → 3,9) | Presisi dipertahankan; koma → titik; pembacaan dengan >1 titik (mis. "3.8.95") ditolak sebagai ambigu → operator mengulang | `src/lib/ocr.ts:L155` |
| T-13 | Tampilan selalu `toFixed(2)` (3.895 tampil "3.90") | `formatBerat`: minimal 2, maksimal 4 desimal sesuai presisi asli; dipakai di LCD, Dashboard, Riwayat, Detail, Review | `src/lib/utils.ts:L38`, `components/LCDDisplay.tsx`, `pages/{Dashboard,History,Detail,Review}.tsx` |
| T-14 | Berat 0 kg tidak bisa ditinjau/disimpan (`!draft.berat_kg`) | Diganti `draft.berat_kg === null` | `src/pages/Review.tsx:L48,L133` |
| T-15 | Thumbnail "DILIHAT OCR" selalu hasil Otsu/invert, bukan input model sebenarnya | `prepareForTesseract()` diekstrak dan dipakai bersama oleh recognize & pratinjau; untuk CNN dibuat `renderCnnInputPreview()` (kanvas 256×64 grayscale) | `src/lib/ocr.ts:L56`, `src/lib/ocr-cnn.ts:L106`, `src/pages/CaptureOCR.tsx:L77` |
| T-04 | Preprocessing CNN di browser memepatkan citra lebar ke 256 px, sedangkan training memotong tengah | `drawModelInput()` sekarang: skala ke tinggi 64 (`floor`), **crop tengah** bila lebar ≥ 256, pad putih bila kurang — sama dengan `train.py:load_image()` | `src/lib/ocr-cnn.ts:L55` |
| T-16 | `training_samples.ocr_model` berisi bahasa Tesseract walau engine CNN; `full_blob_id` menduplikasi crop | `engineLabel` = `cnn:<nama-file>` atau bahasa Tesseract; `full_blob_id = null` (flow ini memang tidak menyimpan foto utuh) | `src/pages/Review.tsx:L67,L215` |
| V-05 | Input ground truth di-prefill hasil OCR (anchoring bias → label noise) | Tidak di-prefill; hasil OCR hanya ditampilkan sebagai placeholder | `src/pages/Review.tsx:L541` |
| V-06 | Ground truth hanya dicek "ada teks"; berat di-parse diam-diam ke 0 bila gagal | Tombol simpan aktif hanya jika `parseBerat(groundTruth)` valid | `src/pages/Review.tsx` (handleSaveTraining & tombol) |
| baru | Setelah cloud fallback lalu **ulangi capture**, sisa hasil cloud lama ikut terbawa ke draft baru | `setOCR` mengosongkan field cloud & `cloudModeUsed/cloudRawResponse` | `src/store/capture.ts:L51` |
| T-17 | Tidak ada auto-sync saat online kembali | Listener `online` + sync sekali saat app dibuka | `src/main.tsx:L12-18` |
| T-18 | Record bisa tertahan di status `syncing` | `listPendingTransaksi` ikut mengambil `syncing`; guard `inFlight` mencegah pengiriman ganda; `syncAll` berbagi satu proses bila dipanggil bersamaan; hitungan pending = semua yang belum `synced` | `src/lib/db.ts:L42`, `src/lib/sync.ts:L14,L86`, `pages/History.tsx` |
| minor | `syncAll` melaporkan pesan error basi | Mengambil `last_error` terbaru setelah sync | `src/lib/sync.ts` (`runSyncAll`) |
| T-19 (sebagian) | Payload sync tanpa jejak audit | Field opsional `ocr_source`, `ocr_raw_text`, `cloud_predicted_text`, `app_version` ditambahkan (foto tetap tidak dikirim) | `src/types/api.ts`, `src/lib/sync.ts` |
| T-22 (sebagian) | Setting kualitas gambar tidak dipakai | `imageQuality` dipakai saat capture ROI (`maxWidth` masih belum) | `src/pages/CaptureOCR.tsx:L134` |
| T-03 | Reshape CNN→RNN tanpa Permute (sekuens CTC atas→bawah) | `layers.Permute((2,1,3))` sebelum `Reshape` di **train.py, export_onnx.py, train_transfer.py** | `train.py:L114`, `export_onnx.py:L53`, `train_transfer.py:L110` |
| T-08 | Output 13 kelas (index 11 mati) | `Dense(config.NUM_CLASSES)` = 12, blank = index 11 = `BLANK_INDEX` | `train.py:L132`, `export_onnx.py:L73`, `train_transfer.py:L130` |
| T-11 | Tidak ada CER & akurasi titik desimal | `evaluate.py` menghitung **CER** dan **decimal-point accuracy**, keduanya masuk `evaluation_report.json` | `evaluate.py:L118,L122` |
| doc | Komentar "sequence length 64", README dataset "rotation ±5°" | Diperbaiki (T = 16; ±7° + daftar augmentasi lengkap) | `export_onnx.py`, `generate_synthetic.py`, `data/synthetic_full/README.md` |

## C. Dampak kompatibilitas
1. **Model `public/models/cnn_synth_v1.onnx` tetap bisa dipakai PWA** (input sama `[1,64,256,1]`; decoder membuang index ≥ 11 sehingga output 12 maupun 13 kelas sama-sama benar). Tetapi model itu dilatih **tanpa** Permute dan dengan preprocessing lama → angka 50%/60% di laporan baseline berlaku untuk arsitektur lama.
2. **Model baru harus dilatih ulang** dengan `train.py` versi ini; `export_onnx.py` versi baru tidak bisa mengekspor ulang bobot model lama (layer `output` beda ukuran).
3. Pengguna yang sudah memakai app: pengaturan otomatis dimigrasi ke versi 8; API key Mistral lama hilang dan harus diganti key Google Vision.
4. Record transaksi lama bersumber `cloud-mistral` tetap tampil sebagai sumber cloud.

## D. Yang sengaja BELUM diubah (keputusan desain, bukan bug)
| Item | Alasan |
|---|---|
| Jalur koreksi manual pada hasil cloud (S-06) | Bagian dari desain Hybrid Opsi D (slide 14: "operator quick-confirm ✓ benar / ✗ edit") dan ditandai `ocr_manual_edited`. Perlu keputusan apakah tetap diizinkan. |
| API key di browser/localStorage (S-04) | Wajar untuk POC; mitigasi: batasi key di Google Cloud Console. Produksi: proxy via backend. |
| Logout tidak menghapus data lokal (S-07) | Menghapus otomatis dapat menghilangkan transaksi yang belum tersinkron. |
| `sourcemap: true` di build produksi (S-09) | Tidak memengaruhi fungsi; direkomendasikan `'hidden'` saat produksi. |
| Kuantisasi model, beam search, kalibrasi confidence | Topik eksperimen skripsi, bukan perbaikan bug. |
| Backend nyata | Di luar cakupan (lihat saran di README). |
