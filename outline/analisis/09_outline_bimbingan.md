# 09 — Outline Skripsi & Bahan Bimbingan

> Outline disusun untuk **Judul C (gabungan)**. Untuk Judul A, hapus 3.4 & 4.3–4.4 bagian ML berat; untuk Judul B, ringkas 3.3 & 4.2 bagian aplikasi.
> Status: **[SIAP]** bahan lengkap di repo · **[PARSIAL]** sebagian ada · **[KOSONG — butuh data/eksperimen]**.
> Format penomoran/penulisan mengikuti panduan kampus [KONFIRMASI].

## 9a. Outline Bab I–V

### BAB I PENDAHULUAN
| Sub-bab | Isi yang ditulis | Sumber | Status |
|---|---|---|---|
| 1.1 Latar Belakang | Masalah pencatatan manual, kebutuhan offline & integritas, kegagalan OCR generik, celah data nyata | `08` §8b; `SPEC.md:L25-34,L769-815`; slide 3, 8 | [PARSIAL] — perlu data dampak (jumlah transaksi, tingkat salah catat) & referensi jurnal |
| 1.2 Rumusan Masalah | 3–4 pertanyaan penelitian | `08` §8c | [SIAP] (menunggu pilihan judul) |
| 1.3 Tujuan Penelitian | 1:1 dengan rumusan | `08` §8c | [SIAP] |
| 1.4 Batasan Masalah | karakter, panjang, platform, backend mock, merek timbangan | `07` §7b | [PARSIAL] — merek/lokasi perlu dipastikan |
| 1.5 Manfaat Penelitian | praktis, akademis | `08` §8c | [SIAP] |
| 1.6 Sistematika Penulisan | ringkasan tiap bab | — | [SIAP] |

### BAB II TINJAUAN PUSTAKA / LANDASAN TEORI
| Sub-bab | Isi | Sumber | Status |
|---|---|---|---|
| 2.1 Penelitian Terkait | tabel 8–15 penelitian (OCR 7-segmen, CRNN, pembacaan meteran, OCR di browser) + posisi penelitian | kata kunci `08` §8e | [KOSONG — butuh studi literatur] |
| 2.2 Timbangan Digital & Display Tujuh Segmen | 2.2.1 prinsip segmen a–g; 2.2.2 LED vs LCD | `generate_synthetic.py:L27-47`; `examples/` | [PARSIAL] |
| 2.3 Pengolahan Citra Digital | 2.3.1 grayscale; 2.3.2 thresholding Otsu; 2.3.3 resize & padding | `05` §5a | [PARSIAL] — rumus siap, perlu referensi |
| 2.4 Optical Character Recognition | 2.4.1 konsep OCR; 2.4.2 Tesseract (OEM, PSM, traineddata); 2.4.3 Google ML Kit | `05` §5b | [PARSIAL] |
| 2.5 Deep Learning untuk Pengenalan Teks | 2.5.1 CNN; 2.5.2 LSTM & BiLSTM; 2.5.3 CTC; 2.5.4 CRNN; 2.5.5 transfer learning & MobileNetV3; 2.5.6 augmentasi & data sintetis | `05` §5c–5d | [PARSIAL] |
| 2.6 Metrik Evaluasi | exact match, char acc, CER, Levenshtein, confusion matrix, kalibrasi | `05` §5g, `06` §6b | [SIAP] rumus; [PARSIAL] referensi |
| 2.7 Deployment Model di Perangkat | 2.7.1 ONNX; 2.7.2 ONNX Runtime Web & WebAssembly; 2.7.3 kuantisasi | `05` §5f | [PARSIAL] |
| 2.8 Progressive Web App | 2.8.1 manifest & service worker; 2.8.2 strategi cache Workbox; 2.8.3 IndexedDB & Cache API; 2.8.4 sinkronisasi offline | `02` §2d | [PARSIAL] |
| 2.9 QR Code | decoding, ZXing | `lib/qr.ts` | [PARSIAL] |
| 2.10 Metodologi Pengembangan | Prototyping, CRISP-DM | `08` §8d | [PARSIAL] |
| 2.11 UML & Pengujian Black-box | | — | [PARSIAL] |

### BAB III METODOLOGI PENELITIAN
| Sub-bab | Isi | Sumber | Status |
|---|---|---|---|
| 3.1 Kerangka / Alur Penelitian | diagram tahapan (identifikasi → pengumpulan data → prototipe → training → evaluasi) | `08` §8d | [SIAP] (buat diagram) |
| 3.2 Objek, Lokasi & Waktu Penelitian | lokasi penimbangan, jenis timbangan, periode | — | [KOSONG — butuh data] |
| 3.3 Analisis & Perancangan Sistem | | | |
| 3.3.1 Analisis sistem berjalan | proses manual saat ini | slide 3 | [PARSIAL] — perlu wawancara/observasi |
| 3.3.2 Analisis kebutuhan (KF, KNF) | KF-01..17, KNF-01..12 | `03` §3c–3d | [SIAP] |
| 3.3.3 Use case, activity, sequence | | `03` §3e | [SIAP] |
| 3.3.4 Arsitektur & deployment | | `02` §2f | [SIAP] |
| 3.3.5 Perancangan data (ERD, skema IndexedDB) | | `04` | [SIAP] |
| 3.3.6 Rancangan antarmuka | 9 screen | `03` §3f | [PARSIAL] — butuh screenshot/mockup |
| 3.4 Metode Pengembangan Model (CRISP-DM) | | | |
| 3.4.1 Pengumpulan data (Mode Training, protokol kondisi) | | `06` §6e, `lib/training.ts` | [PARSIAL] — prosedur siap, data belum ada |
| 3.4.2 Data sintetis | generator & parameter | `05` §5a.5 | [SIAP] |
| 3.4.3 Preprocessing & augmentasi | | `05` §5a | [SIAP] |
| 3.4.4 Arsitektur CRNN-CTC (+ varian Permute, transfer) | tabel layer & parameter | `05` §5c | [SIAP] |
| 3.4.5 Skenario pelatihan & hyperparameter | | `05` §5d | [SIAP] |
| 3.4.6 Ekspor & deployment ONNX | | `05` §5f | [SIAP] |
| 3.5 Rancangan Eksperimen & Evaluasi | E1–E5, variabel, metrik | `06` §6e | [SIAP] rancangan |
| 3.6 Rancangan Pengujian Sistem | tabel black-box BB-01..25 | `06` §6f | [SIAP] |

### BAB IV HASIL DAN PEMBAHASAN
| Sub-bab | Isi | Sumber | Status |
|---|---|---|---|
| 4.1 Implementasi Sistem | 4.1.1 lingkungan & tools; 4.1.2 implementasi halaman (screenshot); 4.1.3 implementasi modul OCR; 4.1.4 penyimpanan & sinkronisasi | `01`, `02`, `03` + kode | [PARSIAL] — butuh screenshot |
| 4.2 Hasil Pengujian Black-box | tabel hasil BB | `06` §6f | [KOSONG — butuh eksekusi uji] |
| 4.3 Hasil Pengumpulan Dataset | jumlah, distribusi panjang, merek, kondisi | `prepare.py` stats | [KOSONG — butuh data] |
| 4.4 Hasil Pelatihan & Evaluasi Model | | | |
| 4.4.1 Baseline OCR generik (Tesseract) | tabel 12 uji | `06` §6c.1 | [PARSIAL] — n terlalu kecil; ulangi pada test set nyata |
| 4.4.2 Baseline CRNN sintetis & transfer learning | 60,4% val / 50,0% test; 18,8% | `06` §6c.2–3 | [PARSIAL] — artefak mentah (kurva, json) perlu dicari/diulang |
| 4.4.3 CRNN data nyata (+ perbaikan Permute) | | — | [KOSONG — butuh eksperimen] |
| 4.4.4 Perbandingan engine (E1) | termasuk ML Kit 4/7 | `06` §6c.5 | [KOSONG — butuh eksperimen] |
| 4.4.5 Pengaruh data/kondisi (E2, E3) | | — | [KOSONG — butuh eksperimen] |
| 4.4.6 Kalibrasi confidence & ambang (E4) | | — | [KOSONG — butuh eksperimen] |
| 4.5 Kinerja On-Device | latensi, ukuran model, waktu muat, offline | — | [KOSONG — butuh pengukuran di HP] |
| 4.6 Pembahasan | interpretasi, analisis kesalahan (confusion matrix, titik desimal), keterbatasan, validitas | `07` | [PARSIAL] |

### BAB V PENUTUP
| Sub-bab | Isi | Sumber | Status |
|---|---|---|---|
| 5.1 Kesimpulan | jawaban 1:1 per rumusan | hasil Bab IV | [KOSONG — menunggu hasil] |
| 5.2 Saran | kuantisasi, auto-sync, backend nyata, keamanan, beam search, kalibrasi, dataset lebih luas | `07` §7b–7c | [SIAP] |

## 9b. Daftar gambar, tabel, lampiran yang disarankan

**Gambar**
| No | Gambar | Sumber |
|---|---|---|
| G-1 | Contoh display 7-segmen (LED, LCD) | `poc-ocr-timbangan-master/examples/*.png` (cek lisensi) |
| G-2 | Susunan segmen a–g | diagram dari `generate_synthetic.py:L27-47` |
| G-3 | Alur penelitian | `08` §8d |
| G-4 | Arsitektur komponen & deployment | `02` §2f (Mermaid) |
| G-5 | Use case, activity (2), sequence | `03` §3e |
| G-6 | ERD / class diagram | `04` §4d |
| G-7 | Tahapan preprocessing (asli → grayscale merah → Otsu → invers → upscale+pad) | jalankan `lib/image.ts` pada 1 citra |
| G-8 | Arsitektur CRNN-CTC (blok) | `05` §5c |
| G-9 | Contoh citra sintetis | `data/synthetic_full_preview.png` |
| G-10 | Kurva loss & akurasi training | `training_curves.png` (**tidak ada di repo** → latih ulang) |
| G-11 | Confusion matrix per karakter | `confusion_matrix.png` (**tidak ada** → jalankan `evaluate.py`) |
| G-12 | Screenshot 9 layar PWA | ambil dari aplikasi berjalan |
| G-13 | Diagram state sinkronisasi | `04` §4c |
| G-14 | Kurva coverage vs selective accuracy | hasil E4 |

**Tabel**
Tech stack (`01` §1b) · kebutuhan fungsional & non-fungsional (`03`) · skema `transaksi` & `training_samples` (`04`) · layer & parameter CRNN (`05` §5c) · hyperparameter (`05` §5d) · parameter augmentasi (`05` §5a.5) · hasil Tesseract 12 uji (`06` §6c.1) · baseline sintetis & per-panjang (`06` §6c.2) · hasil ML Kit per citra (`06` §6c.5) · rancangan eksperimen (`06` §6e) · black-box (`06` §6f) · perbandingan engine (hasil E1).

**Lampiran — potongan kode (dengan path)**
| Lampiran | Potongan | Path |
|---|---|---|
| L-1 | Capture multi-frame & pemilihan frame | `poc-mobile-ocr-main/src/pages/CaptureOCR.tsx:L101-176` |
| L-2 | Preprocessing Otsu | `poc-mobile-ocr-main/src/lib/image.ts:L40-101` |
| L-3 | Wrapper Tesseract | `poc-mobile-ocr-main/src/lib/ocr.ts:L60-115` |
| L-4 | Inferensi ONNX + CTC decode | `poc-mobile-ocr-main/src/lib/ocr-cnn.ts:L51-158` |
| L-5 | Skema Dexie & blob storage | `poc-mobile-ocr-main/src/lib/db.ts:L7-85` |
| L-6 | Sinkronisasi | `poc-mobile-ocr-main/src/lib/sync.ts:L12-68` |
| L-7 | Konfigurasi PWA/Workbox | `poc-mobile-ocr-main/vite.config.ts:L9-61` |
| L-8 | Model CRNN & CTC layer | `poc-training-data-mobile-ocr-main/train.py:L93-171` |
| L-9 | Evaluasi metrik | `poc-training-data-mobile-ocr-main/evaluate.py:L100-126` |
| L-10 | Ekspor ONNX | `poc-training-data-mobile-ocr-main/export_onnx.py:L26-136` |
| L-11 | Agregator voting R35 | `poc-ocr-timbangan-master/src/ocr/pipelines/r35-tuned-trim.js:L256-352` |
| L-12 | Export dataset ZIP | `poc-mobile-ocr-main/src/lib/training.ts:L65-161` |
| Lainnya | Surat izin penelitian, transkrip wawancara, formulir persetujuan, contoh dataset, hasil black-box lengkap | — |

## 9c. Checklist data di luar kode

- [ ] **Dataset foto nyata** display timbangan target: ≥ 500 citra (target 1.000), stratifikasi panjang digit, ≥ 3 merek, variasi cahaya/sudut/jarak (protokol `06` §6e E3). Ground truth diverifikasi 2 orang.
- [ ] **Test set independen** (tidak dipakai training/tuning), dipisah per sesi/timbangan.
- [ ] Daftar **merek/tipe timbangan & kapasitas/resolusi** (jumlah desimal) di lokasi.
- [ ] **Wawancara** operator & supervisor: proses saat ini, jumlah transaksi/hari, jenis kesalahan, kebutuhan audit.
- [ ] **Observasi** alur penimbangan (waktu per karung saat ini) sebagai baseline.
- [ ] **Uji lapangan**: waktu per transaksi dengan aplikasi, tingkat retake, pengalaman offline.
- [ ] **Pengukuran on-device**: model HP, RAM, versi Chrome/Android; latensi Tesseract vs CNN; waktu muat model; penggunaan storage.
- [ ] Hasil **black-box testing** BB-01..25 + screenshot.
- [ ] (Opsional) **SUS/UAT** operator.
- [ ] Artefak training: `training.csv`, `history.json`, `evaluation_report.json`, `confusion_matrix.png`, `failures.csv`, `onnx_validation.json` untuk setiap model.
- [ ] **Izin**: surat izin perusahaan, persetujuan operator (foto & data), izin penggunaan citra Kaggle/fixture.
- [ ] URL deploy Netlify (untuk demo sidang).

## 9d. Pertanyaan untuk dosen pembimbing

1. Dari tiga jenis (pengembangan sistem / eksperimen ML / gabungan), mana yang sesuai kompetensi prodi dan beban SKS saya? Apakah cakupan Judul C terlalu luas?
2. Apakah repository ini (dibangun oleh tim/perusahaan) boleh menjadi objek skripsi, dan bagaimana menyatakan kontribusi pribadi saya secara jelas?
3. Jika target 80% tidak tercapai, apakah hasil negatif/parsial tetap dapat diterima selama metodologinya benar?
4. Berapa jumlah minimum data nyata dan citra uji yang dianggap memadai untuk validitas?
5. Metrik utama apa yang sebaiknya dijadikan acuan: exact-match, CER, atau error berat absolut (kg)?
6. Apakah metodologi campuran Prototyping + CRISP-DM dapat diterima, atau harus memilih satu?
7. Apakah backend cukup disimulasikan (mock), atau wajib membangun server sinkronisasi sungguhan?
8. Apakah fitur cloud fallback (Mistral) dibahas sebagai pembanding/upper bound, atau dikeluarkan dari ruang lingkup karena melanggar asumsi offline?
9. Perlukah uji statistik (mis. McNemar untuk membandingkan dua engine pada citra yang sama)?
10. Apakah perbandingan dengan Google ML Kit (app terpisah, platform berbeda) sah secara metodologis, atau harus satu platform?
11. Bagaimana memperlakukan data sintetis — sebagai baseline saja atau bagian dari kontribusi (sim-to-real)?
12. Apakah perlu uji usability (SUS) dengan operator nyata sebagai bagian evaluasi sistem?
13. Format sitasi & jumlah minimal referensi jurnal (nasional/internasional, 5–10 tahun terakhir)?
14. Bagaimana menangani etika & izin data (foto lokasi kerja, identitas operator)?
15. Apakah perbaikan bug yang ditemukan (Permute, pembulatan desimal, preprocessing) boleh dijadikan bagian kontribusi/ablation?

## 9e. Timeline pengerjaan (estimasi 16 minggu — sesuaikan kalender akademik)

| Minggu | Kegiatan | Output bab |
|---|---|---|
| 1–2 | Finalisasi judul, izin lokasi, studi literatur awal | Bab I draf, 2.1 kerangka |
| 2–4 | Wawancara/observasi; protokol pengumpulan data; perbaiki bug kritis (pembulatan desimal, `ocr_model`, anchoring GT) di cabang terpisah | Bab I final, 3.2–3.3 |
| 3–6 | Pengumpulan dataset nyata via Mode Training (bertahap, ≥ 500 citra) | 4.3 |
| 4–6 | Landasan teori lengkap | Bab II |
| 6–8 | Eksperimen E1–E2 (baseline, CRNN nyata, varian Permute, fine-tune) | 4.4.1–4.4.4 |
| 8–9 | Eksperimen E3–E4 (kondisi, kalibrasi) | 4.4.5–4.4.6 |
| 9–10 | Deploy model terbaik ke PWA, pengukuran on-device, black-box, (SUS) | 4.1, 4.2, 4.5 |
| 10–12 | Penulisan Bab III final & Bab IV | Bab III–IV |
| 12–13 | Pembahasan & Bab V | 4.6, Bab V |
| 13–14 | Revisi pembimbing | semua |
| 15–16 | Persiapan seminar/sidang (slide, demo offline) | — |

Risiko jadwal terbesar: akses ke timbangan & operator untuk data nyata (minggu 3–6). Siapkan rencana cadangan: dataset publik 7-segmen + foto timbangan sendiri. [INFERENSI]
