# 06 — Pengujian & Evaluasi

## 6a. Test otomatis yang sudah ada

| Jenis | Status | Bukti | Label |
|---|---|---|---|
| Unit test (JS/TS) | **Tidak ada** — tidak ada file `*.test.*`/`*.spec.*`, tidak ada Vitest/Jest, tidak ada script `test` | `poc-mobile-ocr-main/package.json:L7-13` | [KODE] |
| Unit test (Python) | **Tidak ada** — tidak ada pytest/unittest | daftar file `poc-training-data-mobile-ocr-main/` | [KODE] |
| Integration / E2E (Playwright, Cypress) | **Tidak ada** | | [KODE] |
| Type-check statis | Ada: `tsc --noEmit` (`strict: true`) | `package.json:L11`, `tsconfig.json:L14` | [KODE] |
| Validasi numerik ekspor ONNX | Ada: Keras vs ONNX, ambang 1e-4 | `export_onnx.py:L139-189` | [KODE] |
| Evaluasi fixture App RN | Ada fungsi `verdictOf` (exact / close ≤5% / wrong / miss) dan ground truth 7 citra | `poc-ocr-timbangan-master/src/ocr/lib/groundTruth.js:L3-19` | [KODE] |
| Uji manual terdokumentasi | Test case TC-01 s.d. TC-03 dan skenario demo | `SPEC.md:L157-196,L444-549` | [KODE] |

## 6b. Script evaluasi model — `evaluate.py`

| Metrik | Implementasi | Baris |
|---|---|---|
| Full-string accuracy (exact match) | `p == t` | `L101-103` |
| Char-level accuracy (posisional) | cocokkan indeks yang sama; penyebut $\sum|t|$ | `L106-112` |
| Rata-rata edit distance (Levenshtein) | DP | `L37-52,L115-116` |
| Akurasi per panjang label | dict per `len(t)` | `L119-126` |
| Latensi inferensi | rata-rata detik/citra per batch (CPU) | `L89-96,L128` |
| Target 80% tercapai? | boolean | `L137-138` |
| Daftar kegagalan | `failures.csv` | `L147-158` |
| Confusion matrix per karakter | pasangan posisional → heatmap | `L160-185` |
| Laporan | `evaluation_report.json` | `L188-203` |
| **Tidak ada** | CER ter-normalisasi, WER, akurasi titik desimal, kalibrasi confidence, akurasi pada ambang (selective accuracy), bootstrap CI | — |

Selama training: `val_full_acc`, `val_char_acc` tiap epoch (`train.py:L192-230`), kurva loss/akurasi (`L331-354`).

## 6c. Hasil yang tercatat di repo

> Semua angka di bawah dikutip dari dokumen Markdown. **File hasil mentah** (`evaluation_report.json`, `training.csv`, `history.json`, `failures.csv`, `onnx_validation.json`, folder `output/` RN) **TIDAK DITEMUKAN DI REPO**, sehingga angka belum dapat diverifikasi ulang. [KONFIRMASI] apakah file-file itu masih tersimpan.

### 6c.1 Tesseract.js di PWA — `poc-mobile-ocr-main/SPEC.md:L778-795`
Data uji: 12 percobaan pada **2 citra** — satu dari *Kaggle 7-Segment Industrial Digits Dataset* (GT `9562`) dan timbangan retail **Gram-S5i** (GT `3.895`).

| # | Model | Preprocessing | Crop | Hasil | Conf | Verdict |
|---|---|---|---|---|---|---|
| 1 | eng | none | full | `0.40` | 42% | ❌ |
| 2 | eng | full | crop 60% | `2.00` | 43% | ❌ |
| 3 | ssd | full | crop 60% | `1111.00` | 76% | ❌ |
| 4 | ssd | none | full | `811174` | 47% | ❌ |
| 5 | ssd | none | auto-crop ROI | `1888` | 61% | ❌ |
| 6–7 | ssd | upscale+pad | manual | `4888`, `884794` | 76%, 63% | ❌ |
| 8 | ssd | upscale+pad | manual | `3895` | 74% | ⚠ digit benar, desimal hilang |
| 9–11 | ssd | upscale+pad | manual | `173895`, `038952`, `88955` | 71%, 44%, 72% | ❌ inkonsisten |
| 12 | ssd | upscale+pad | manual (PSM 7 tunggal) | bervariasi | — | ⚠ stabil tapi ≠ GT |

Kesimpulan tercatat: **0/12 exact match**, terbaik 1/12 benar digit tanpa desimal; confidence tidak berkorelasi dengan kebenaran (`SPEC.md:L807-815`). Target awal C5 = ≥70% pada 20 sampel (`SPEC.md:L106`) — **jumlah 20 sampel tidak terpenuhi**.

### 6c.2 CRNN from-scratch (data sintetis) — `SYNTHETIC_BASELINE_REPORT.md:L25-58`
| Metrik | Nilai |
|---|---|
| Val full-string acc (terbaik, epoch 44) | **60,4%** |
| Val char acc (terbaik) | 84,2% |
| **Test full-string acc** | **50,0% (52/104)** |
| Test char acc | 82,0% (431/526) |
| Inferensi (CPU desktop) | 29 ms/citra |
| Akurasi per panjang (test) | 3: 75% (3/4) · 4: 57% (24/42) · 5: 62% (8/13) · 6: 44% (15/34) · 7: **18% (2/11)** |
| Loss | train 913 → 0,66; val ≈ 81 → rasio 122× (overfitting) (`L102,L112`) |

### 6c.3 Transfer learning MobileNetV3-Small — `SYNTHETIC_BASELINE_REPORT.md:L60-91`
| Fase | Val full acc | Val char acc |
|---|---|---|
| Warm-up terbaik (epoch 9) | 18,8% | 52% |
| Fine-tune terbaik (epoch 1) | 9,9% | 47% |
| Tren fine-tune | turun ke ≈4% | turun ke ≈40% |
Dihentikan manual pada epoch 11 fase 2 ("catastrophic forgetting").

### 6c.4 Ekspor ONNX — `SYNTHETIC_BASELINE_REPORT.md:L105,L114`
Keras 2.195 ms vs ONNX 81 ms (≈27×); **max diff 0,94** (tidak memenuhi ambang 1e-4 skrip).

### 6c.5 App React Native + ML Kit — `poc-ocr-timbangan-master/README.md:L9-21`, `docs/ANALYSIS_PER_FILE.md`
| Citra | GT | R35 | Jenis |
|---|---|---|---|
| body-scale-68.8kg | 68.8 | ✅ | LCD hitam |
| body-scale-50.78kg-led | 50.78 | ✅ | LED merah |
| industrial-3.895kg | 3.895 | ✅ | LCD industri |
| kitchen-48.65kg | 48.65 | ✅ | LCD putih |
| body-scale-52.8kg-lcd-pasif | 52.8 | ❌ `8` | LCD pasif kontras lemah |
| small-led-12.4g | 12.4 | ❌ `24` | LED 7-seg, digit "1" tipis |
| pocket-scale-3.72g | 3.72 | ⚪ miss | display kecil |
**4/7 = 57,1% exact**, 5/5 run bit-identik, ≈19 s/7 citra di AVD x86_64 (`src/models.js:L10-11`). Emulator, bukan HP fisik. [KODE dokumen]

### 6c.6 Klaim yang BUKAN hasil eksperimen (jangan dikutip sebagai hasil)
| Klaim | Lokasi | Status |
|---|---|---|
| "Full-string accuracy: 0.9580 (96/100)" | `TRAINING.md:L170-189` | contoh output ilustratif |
| "≥80%", "30–100 ms", "Reliable indicator" | `DEPLOYMENT.md:L363-371` ("Expected") | proyeksi |
| "500 nyata → 80–90%", "1.000 nyata → 92–96%", "10.000 sintetis → 65–70%" | slide 11 | estimasi tanpa dasar data |
| "Tesseract ~50–65%" | slide 8 | **tidak konsisten** dengan data SPEC (0/12 exact) |
| "Akurasi ~50–60%" (di prompt) | — | cocok dengan CNN sintetis (val 60,4% / test 50,0%) dan RN (57,1%), **bukan** Tesseract |

## 6d. Gap pengujian untuk skripsi

1. **Tidak ada data uji nyata** untuk CNN — semua angka CNN dari data sintetis; satu-satunya data nyata = 2 citra (Tesseract) & 7 citra (ML Kit).
2. **Set uji = set tuning** pada App RN (7 fixture dipakai untuk menyetel bobot) → tidak ada estimasi generalisasi.
3. Tidak ada **evaluasi on-device** (latensi ONNX di browser HP, pemakaian memori, waktu muat model 46 MB, baterai — risiko R8 `SPEC.md:L155`).
4. Tidak ada uji **kesetaraan preprocessing** train vs inference (Python vs browser) pada citra yang sama.
5. Tidak ada **analisis kalibrasi confidence** padahal gate 80% bergantung padanya (coverage vs. akurasi, ECE, kurva reliabilitas).
6. Tidak ada metrik **akurasi titik desimal** dan **error absolut berat (kg)** — padahal kesalahan 1 digit berarti transaksi salah (slide 8).
7. Tidak ada unit test fungsi kritis: `parseBerat`, `ctcDecode`, Otsu, `generateTrxCode`, `syncOne`.
8. Tidak ada uji **fungsional PWA** tercatat: installability (C1), offline (C2), storage stress 200 blob (C7/TC-03), Lighthouse > 90, akurasi QR > 95% (C4) — kriteria ada, **hasil TIDAK DITEMUKAN DI REPO**.
9. Tidak ada uji **usability/UAT** dengan operator nyata (waktu per transaksi < 30 s, tingkat retake).
10. Tidak ada **uji statistik** (confidence interval) — dengan n=104 atau n=7, CI sangat lebar (mis. 57,1% pada n=7 → CI 95% Wilson ≈ [25%, 84%]) [INFERENSI, dihitung analis].

## 6e. Usulan rancangan eksperimen

### E1 — Komparasi engine OCR pada data nyata (inti skripsi eksperimen)
- **Variabel bebas**: engine ∈ {Tesseract-ssd, Tesseract-letsgodigital, CRNN-sintetis (`cnn_synth_v1`), CRNN-nyata, CRNN-nyata+Permute (perbaikan urutan sekuens), CRNN sintetis→fine-tune nyata, ML Kit R35}; (opsional) Mistral/Pixtral sebagai *upper-bound reference* — dilaporkan terpisah karena melanggar constraint offline.
- **Variabel terikat**: exact-match accuracy, CER, akurasi titik desimal, MAE berat (kg), akurasi per panjang, latensi per citra di HP (ms), ukuran model (MB).
- **Variabel kontrol**: HP yang sama (sebutkan model), versi app, ROI 70×35%, resolusi kamera, set uji yang sama, seed 42.
- **Set uji**: citra nyata **yang tidak pernah dipakai training/tuning**, dibagi per **sesi/merek** (group split) agar frame hampir identik tidak bocor antar split.

### E2 — Pengaruh ukuran & komposisi data latih
- Bebas: jumlah sampel nyata {100, 250, 500, 1.000} × komposisi {nyata saja, sintetis+nyata}.
- Terikat: exact-match & CER pada test tetap → kurva belajar (*learning curve*).

### E3 — Kondisi pengambilan (robustness)
| Faktor | Level |
|---|---|
| Pencahayaan | terang (>500 lux), ruangan (100–300 lux), redup (<50 lux), glare/pantulan |
| Sudut kamera | 0°, ±15°, ±30° |
| Jarak | 15, 30, 50 cm |
| Jenis display | LED merah, LED hijau/VFD, LCD reflektif (pasif), LCD backlight |
| Merek/model timbangan | minimal 3–5 (mis. yang dipakai klien — [KONFIRMASI]) |
Desain faktorial parsial; catat kondisi terstruktur (bukan hanya kolom `notes` bebas). Lux diukur dengan aplikasi lux-meter [INFERENSI saran].

### E4 — Kalibrasi confidence & efektivitas gate
- Bebas: ambang τ ∈ {0,5 … 0,99}; N frame ∈ {1, 3, 5}.
- Terikat: **coverage** $=\frac{|\{i: c_i\ge\tau\}|}{N}$, **selective accuracy** $=\frac{|\{i: c_i\ge\tau \wedge \hat\ell_i=\ell_i\}|}{|\{i: c_i\ge\tau\}|}$, ECE, tingkat retake.
- Tujuan: menunjukkan apakah "confidence ≥ 80%" benar-benar menjamin akurasi ≥ 80%.

### E5 — Uji fungsional & non-fungsional PWA
Offline end-to-end (TC-02), stress storage 100 transaksi + 200 foto (TC-03), Lighthouse PWA, waktu per transaksi dengan stopwatch, akurasi QR (utuh/rusak sebagian/redup).

### Cara pengambilan data
Gunakan **Mode Training** PWA (sudah tersedia) → isi ground truth + merek → export ZIP. Rekomendasi tambahan: (1) dua orang memverifikasi ground truth (inter-annotator), (2) simpan juga foto penuh (saat ini `full_blob_id` = crop yang sama, `Review.tsx:L178`), (3) catat kondisi pada format terstruktur, (4) persetujuan dari pemilik lokasi/operator.

## 6f. Usulan tabel black-box testing

| ID | Fitur | Skenario | Input | Expected output |
|---|---|---|---|---|
| BB-01 | Login | Kredensial benar | `OP-2847` / `demo` | Masuk Dashboard, nama operator tampil |
| BB-02 | Login | Kredensial salah | `OP-2847` / `salah` | Pesan "Kredensial tidak valid", tetap di Login |
| BB-03 | Guard | Akses `/history` tanpa login | URL langsung | Redirect ke `/login` |
| BB-04 | Scan QR | QR jelas | QR `ABCD1234` | Badge "QR DITERIMA", tombol LANJUT aktif, HP bergetar |
| BB-05 | Scan QR | Input manual | ketik `abcd1234` | Tersimpan uppercase `ABCD1234`, lanjut ke Step 2 |
| BB-06 | Scan QR | Izin kamera ditolak | tolak izin | Pesan error + tombol RELOAD |
| BB-07 | Capture | Display tidak mengandung angka | arahkan ke dinding | "SEMUA FRAME GAGAL · ULANGI…" |
| BB-08 | Capture | Display jelas, conf ≥ 80% | display "12.50" | Review menampilkan 12.50, badge LULUS, SIMPAN aktif |
| BB-09 | Gate | conf < 80%, cloud OFF | display redup | Banner "CONFIDENCE TERLALU RENDAH", SIMPAN terkunci |
| BB-10 | Cloud | conf < 80%, cloud ON, online, key valid | display redup | Banner CLOUD FALLBACK, SIMPAN terkunci sampai BENAR/EDIT |
| BB-11 | Cloud | Offline | airplane mode | Pesan "Offline — silakan ULANGI capture" |
| BB-12 | Crop manual | Pilih area | geser kotak | OCR hanya pada area terpilih |
| BB-13 | Upload | File non-gambar | `.pdf` | "FILE BUKAN IMAGE" |
| BB-14 | Simpan offline | Airplane mode | transaksi valid | Muncul di Riwayat status OFFLINE/pending |
| BB-15 | Sync | Kembali online, tap SYNC | 3 pending | Status berubah synced, `sent_at` terisi |
| BB-16 | Sync gagal | Server error | (mock 5%) | Status GAGAL, `retry_count` naik |
| BB-17 | Riwayat | Filter PENDING | — | Hanya pending+failed tampil |
| BB-18 | Detail | Buka transaksi cloud-confirmed | — | Audit trail LOCAL vs CLOUD tampil |
| BB-19 | Mode Training | Ground truth kosong | — | Tombol simpan nonaktif |
| BB-20 | Mode Training | Simpan sampel | GT `3.895` | "TERSIMPAN KE DATASET", counter TOTAL +1 |
| BB-21 | Export | Ada sampel | tap EXPORT ZIP | File `analisa-training-<ts>.zip` berisi `labels.csv` (13 kolom) + `images/` |
| BB-22 | Engine | Ganti ke CNN | pilih CNN (BETA) | Review menampilkan "CNN · ONNX" + nama file model |
| BB-23 | PWA | Install & buka offline | Add to Home Screen, airplane | App terbuka tanpa jaringan |
| BB-24 | Presisi berat | Display 3 desimal | "3.895" | **Expected 3.895** — diprediksi GAGAL (tersimpan 3,9) karena `parseBerat` (`lib/ocr.ts:L143`) |
| BB-25 | Logout | Tap logout + konfirmasi | — | Kembali ke Login, token terhapus |
