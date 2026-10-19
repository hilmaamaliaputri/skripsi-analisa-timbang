# Changelog Parameter — Revisi 95% → 80%

Tanggal: **19 Oktober 2026**

Alasan: target 95% dinilai tidak realistis dicapai dalam waktu penelitian.
Angka 95% adalah syarat awal stakeholder, sementara hasil yang sudah tercatat
jauh di bawahnya. Target 80% dipilih sebagai angka yang masih bermakna secara
rekayasa tetapi mungkin dicapai.

Revisi ini diterapkan **konsisten di dua tempat**: dokumen outline dan kode
sistem, supaya keduanya tidak saling bertentangan.

---

## Ringkasan

**Lima parameter** diturunkan dari 95% menjadi 80%.

| Parameter | Sebelum | Sesudah |
|---|---|---|
| Target akurasi full-string | ≥ 95% | ≥ 80% |
| `ocrThreshold` | 0,95 | 0,80 |
| `cloudFallbackThreshold` | 0,95 | 0,80 |
| Batas slider fallback | 0,95 | 0,80 |
| Konstanta confidence cloud | 0,95 | 0,80 |

Jumlah penggantian:

- **30 di dokumen outline** — 13 berkas
- **29 di kode sistem** — 8 berkas

---

## Bagian 1 — Dokumen outline

Rincian lengkap per berkas ada di riwayat commit. Ringkasannya:

**Target akurasi (14 penggantian)**

- `outline/analisis/01_inventaris.md` baris 107, 125
- `outline/analisis/03_fitur_kebutuhan.md` baris 74, 153
- `outline/analisis/06_pengujian_evaluasi.md` baris 24, 91, 134
- `outline/analisis/07_keterbatasan.md` baris 17, 85
- `outline/analisis/08_pemetaan_skripsi.md` baris 22, 84
- `outline/analisis/09_outline_bimbingan.md` baris 137
- `outline/skripsi/RANGKUMAN_OUTLINE_TA.md` baris 136

**Ambang keyakinan lokal (11 penggantian)**

- `outline/analisis/02_arsitektur.md` baris 67
- `outline/analisis/03_fitur_kebutuhan.md` baris 16, 57, 105, 124
- `outline/analisis/04_data.md` baris 71
- `outline/analisis/06_pengujian_evaluasi.md` baris 102, 153, 154, 155
- `outline/analisis/07_keterbatasan.md` baris 23

**Parameter jalur cloud (5 penggantian)**

- `outline/analisis/04_data.md` baris 81
- `outline/analisis/05_metode_algoritma.md` baris 84, 160
- `outline/analisis/03_fitur_kebutuhan.md` baris 185
- `outline/analisis/07_keterbatasan.md` baris 23

---

## Bagian 2 — Kode sistem

### PWA (`sistem/poc-mobile-ocr-main/`)

**`src/store/settings.ts`**

- Baris 59 — nilai default `ocrThreshold`, `0.95` menjadi `0.80`
- Baris 70 — nilai default `cloudFallbackThreshold`, `0.95` menjadi `0.80`
- Baris 92 — migrasi versi `ocrThreshold`, `0.95` menjadi `0.80`
- Baris 103 — fallback `cloudFallbackThreshold`, `?? 0.95` menjadi `?? 0.80`

**`src/pages/Settings.tsx`**

- Baris 261 — batas slider fallback, `max={0.95}` menjadi `max={0.80}`
- Baris 374 — teks UI, `boost accuracy ke ≥95%` menjadi `≥80%`
- Baris 392 — label slider, `DEFAULT 95%` menjadi `DEFAULT 80%`

**`src/lib/ocr-cloud.ts`**

- Baris 191 — konstanta confidence jalur cloud, `0.95` menjadi `0.80`

**`src/lib/ocr-cnn.ts`**

- Baris 6 — komentar target, `≥95%` menjadi `≥80%`

**`SPEC.md`**

- Baris 833, 843, 884 — syarat ke depan untuk Phase 0

### Pipeline ML (`sistem/poc-training-data-mobile-ocr-main/`)

**`config.py`** — perbaikan struktural

: Target akurasi kini disimpan sebagai satu konstanta bernama, bukan angka lepas
  di banyak berkas:

  ```python
  TARGET_FULL_ACC = 0.80
  ```

**`evaluate.py`**

- Baris 137 — perbandingan memakai `config.TARGET_FULL_ACC`
- Baris 138 — label keluaran memakai nilai konstanta
- Baris 196 — kunci JSON `target_95_met` menjadi `target_met`, ditambah
  `target_full_acc` supaya nilainya tercatat eksplisit

**`train.py` baris 345 dan `train_transfer.py` baris 336**

: Garis target di grafik latihan kini membaca `config.TARGET_FULL_ACC`.

**Dokumentasi yang ikut diperbarui**

- `README.md` baris 30, 123
- `TRAINING.md` baris 150, 181, 245, 370, 418
- `DEPLOYMENT.md` baris 19, 99, 314, 367, 485

---

## Yang sengaja tidak diubah

Angka 95 muncul di banyak tempat lain yang **tidak berkaitan** dengan kelima
parameter di atas. Semuanya dibiarkan supaya dokumen dan laporan tetap faktual.

**Istilah statistik**

- `outline/analisis/06_pengujian_evaluasi.md` baris 107 — interval kepercayaan
  95% Wilson
- `outline/analisis/07_keterbatasan.md` baris 79 — permintaan pelaporan CI 95%

**Parameter teknis lain yang kebetulan bernilai sama**

- Kualitas kompresi JPEG `0,95` di `src/lib/image.ts` baris 98, 112, 153 dan
  `src/components/ManualCropEditor.tsx` baris 183
- Slider `imageQuality` `max={0.95}` di `src/pages/Settings.tsx` baris 455
- `outline/analisis/05_metode_algoritma.md` baris 19, 29, 42 — JPEG `q0,95`
- Akurasi QR `> 95%` (kriteria C4) di `SPEC.md` baris 105 dan
  `outline/analisis/06_pengujian_evaluasi.md` baris 105

  Ini metrik pemindaian QR, bukan akurasi OCR.

**Kutipan dan contoh output ilustratif**

- `TRAINING.md` baris 176 — angka `0.9580` pada contoh keluaran
- `DEPLOYMENT.md` baris 408 — contoh `confidence 0.95`
- `outline/analisis/01_inventaris.md` baris 108 dan
  `outline/analisis/06_pengujian_evaluasi.md` baris 90 — kutipan `95,8%`
  dari `TRAINING.md`

**Laporan historis**

- `sistem/poc-mobile-ocr-main/SPEC.md` — bagian Validation Report
- `sistem/poc-training-data-mobile-ocr-main/SYNTHETIC_BASELINE_REPORT.md`

  Keduanya mencatat pengujian yang **benar-benar dijalankan saat targetnya masih
  95%**. Mengubah angkanya akan menghapus bukti pengujian. Sebagai gantinya,
  masing-masing diberi catatan di kepala dokumen bahwa targetnya sudah direvisi.

**Deskripsi historis**

- `outline/analisis/10_perubahan_kode.md` baris 19 — kalimat "bukan lagi
  konstanta 0,95" menerangkan perilaku lama yang sudah diganti

---

## Kontradiksi yang belum diselesaikan

Dua dokumen berbeda pendapat soal konstanta confidence cloud:

- `outline/analisis/05_metode_algoritma.md` baris 160 menyatakan
  `ocr-cloud.ts:L191` memakai **konstanta 0,95**
- `outline/analisis/10_perubahan_kode.md` baris 19 menyatakan `ocr-cloud.ts`
  sudah **ditulis ulang** sehingga tidak lagi memakai konstanta 0,95

Keduanya tidak bisa benar bersamaan. Kemungkinan satu dokumen menggambarkan kode
sebelum perbaikan, satu lagi sesudahnya, dan audit dilakukan pada waktu berbeda.

**Perlu diperiksa langsung** di `sistem/poc-mobile-ocr-main/src/lib/ocr-cloud.ts`
baris 191, lalu kedua dokumen disamakan. Selama belum diperiksa, jangan mengutip
salah satunya sebagai fakta di skripsi.

---

## Riwayat keputusan

**19 Oktober 2026, tahap 1 — dokumen outline**

Dua parameter diturunkan: target akurasi dan `ocrThreshold`. Parameter jalur
cloud sengaja ditahan karena di luar permintaan awal.

**19 Oktober 2026, tahap 2 — dokumen outline**

Tiga parameter jalur cloud diselaraskan. Alasannya: kalau ambang keyakinan utama
80% sementara ambang fallback cloud tetap 95%, hampir semua pembacaan akan
memicu fallback ke cloud. Konstanta confidence cloud yang tetap di 95% juga
membuat hasil cloud selalu lolos gerbang 80% walau kualitasnya tidak diketahui.

**19 Oktober 2026, tahap 3 — kode sistem**

Kelima parameter yang sama diterapkan ke kode, supaya dokumen dan sistem tidak
bertentangan. Sekaligus target akurasi di pipeline ML dijadikan satu konstanta
bernama (`TARGET_FULL_ACC`) supaya perubahan berikutnya cukup di satu tempat.
