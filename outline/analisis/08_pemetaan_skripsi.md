# 08 — Pemetaan ke Skripsi (Tugas Akhir Informatika Universitas Siliwangi)

> **Konteks final:** Program Studi/Jurusan Teknik Informatika, Fakultas Teknik, Universitas Siliwangi (S1). Mahasiswa: Hilma Amalia Putri.
> Arahan dosen: **bukan "rancang bangun"**, melainkan **"implementasi metode … terhadap …" dengan output aplikasi**.
> Acuan format: *Pedoman Pelaksanaan KP dan TA Jurusan Teknik Informatika Unsil 2017* (selanjutnya "Pedoman").
> Kelompok keahlian yang paling sesuai: **Informatika dan Sistem Inteligen (ISI)** (Pedoman §3.1.2 butir b).
> Bentuk penelitian menurut Pedoman §3.1.3.d: "Pengembangan sistem" + unsur "Studi komparasi" (pembanding metode).

## 8a. Alternatif judul (pola "Implementasi Metode … untuk/pada …")

### Judul 1 — DIREKOMENDASIKAN
**IMPLEMENTASI METODE CONVOLUTIONAL RECURRENT NEURAL NETWORK (CRNN) DAN CONNECTIONIST TEMPORAL CLASSIFICATION (CTC) UNTUK PENGENALAN ANGKA DISPLAY SEVEN SEGMENT PADA APLIKASI PENCATATAN TIMBANGAN DIGITAL BERBASIS PROGRESSIVE WEB APP**

| Aspek | Isi |
|---|---|
| Metode inti | CRNN (CNN + BiLSTM) dengan CTC loss dan greedy CTC decoding |
| Objek | Citra display seven segment timbangan digital (LED/LCD) |
| Output aplikasi | PWA offline: scan QR karung → foto display → pengenalan angka on-device (ONNX Runtime Web) → simpan & sinkron |
| Peran Google Vision | (1) **fallback** saat confidence rendah, (2) **alat bantu pelabelan** data nyata (auto-collect), (3) **pembanding** (acuan cloud) |
| Pembanding lain | Tesseract OCR (sudah ada di aplikasi) sebagai baseline metode konvensional |
| Kelebihan | Sesuai arahan dosen (fokus metode + output aplikasi); kode sudah ~90% siap; metode jelas & dapat diukur (akurasi, CER) |
| Risiko | Perlu mengumpulkan data foto nyata (≥ 500); akurasi bisa di bawah 80% — tetap sah jika dianalisis dengan benar |

### Judul 2 — Variasi komparatif
**IMPLEMENTASI DAN PERBANDINGAN METODE CRNN-CTC DAN TESSERACT OCR DALAM PENGENALAN ANGKA DISPLAY SEVEN SEGMENT TIMBANGAN DIGITAL BERBASIS PROGRESSIVE WEB APP**
Fokus perbandingan dua metode pada data uji yang sama. Kelebihan: hasil pasti ada meskipun salah satu metode buruk. Risiko: dosen bisa menilai "perbandingan" lebih cocok untuk jenis studi komparasi; porsi aplikasi mengecil.

### Judul 3 — Variasi hybrid
**IMPLEMENTASI METODE CRNN-CTC ON-DEVICE DENGAN GOOGLE CLOUD VISION SEBAGAI FALLBACK UNTUK PENGENALAN ANGKA DISPLAY TIMBANGAN DIGITAL BERBASIS PROGRESSIVE WEB APP**
Menonjolkan arsitektur hybrid (lokal + cloud). Kelebihan: memanfaatkan fitur Vision yang baru dimigrasi. Risiko: Google Vision bukan "metode" yang dikembangkan mahasiswa (layanan pihak ketiga), sehingga kontribusi metode bisa dipertanyakan; ada biaya & isu privasi.

**Saran:** ajukan Judul 1; gunakan Tesseract dan Google Vision sebagai pembanding di Bab IV (menjawab pertanyaan penguji "kenapa tidak pakai OCR yang sudah ada?").

## 8b. Poin argumen latar belakang

1. Pencatatan berat manual rawan salah tulis (mis. 1.0 vs 10), tidak ada foto bukti untuk audit, dan tidak real-time (slide 3 presentasi proyek).
2. Lokasi penimbangan sering bersinyal lemah → solusi harus tetap berjalan tanpa internet (`SPEC.md:L66`).
3. Display timbangan memakai karakter seven segment yang berbeda dari huruf cetak; OCR umum (Tesseract) gagal: 0 dari 12 percobaan benar persis, titik desimal hilang, confidence tinggi pada hasil salah (`SPEC.md:L778-815`).
4. Metode deep learning CRNN-CTC mampu mengenali deret karakter tanpa segmentasi per digit dan dapat dijalankan di perangkat melalui ONNX Runtime Web.
5. Kendala utama adalah minimnya data nyata; penelitian ini memanfaatkan aplikasi itu sendiri (Mode Training + auto-collect Google Vision) untuk mengumpulkan data.
6. Data dampak (jumlah transaksi per hari, tingkat salah catat) **belum ada** → perlu wawancara/observasi singkat di lokasi penimbangan, atau latar belakang ditulis dari literatur.

## 8c. Rumusan masalah, batasan, tujuan, manfaat (urutan sesuai Pedoman §4.1.3: 1.2 Rumusan → 1.3 Batasan → 1.4 Tujuan → 1.5 Manfaat)

**1.2 Rumusan Masalah**
1. Bagaimana mengimplementasikan metode CRNN-CTC untuk mengenali angka pada citra display seven segment timbangan digital?
2. Bagaimana menerapkan model hasil pelatihan ke dalam aplikasi Progressive Web App agar pengenalan dapat berjalan di perangkat (offline)?
3. Berapa tingkat akurasi (exact match accuracy dan CER) metode CRNN-CTC dibandingkan Tesseract OCR dan Google Cloud Vision pada data uji citra nyata?

**1.3 Batasan Masalah** (penomoran huruf/angka, bukan bullet — Pedoman §4.2.1 butir 8)
1. Karakter yang dikenali: angka 0–9 dan titik desimal, maksimum 8 karakter dalam satu baris.
2. Citra berasal dari display seven segment timbangan digital (LED/LCD) yang difoto dengan kamera ponsel pada area bingkai tetap.
3. Data latih terdiri atas data sintetis dan data foto nyata yang dikumpulkan sendiri; citra hasil generasi AI tidak dipakai sebagai data uji.
4. Aplikasi berbentuk PWA yang diuji pada browser Google Chrome Android.
5. Sinkronisasi ke server menggunakan server tiruan (mock); pembangunan backend tidak termasuk ruang lingkup.
6. Google Cloud Vision hanya digunakan sebagai fallback, alat bantu pelabelan, dan pembanding.

**1.4 Tujuan Penelitian** (1:1 dengan rumusan)
1. Mengimplementasikan metode CRNN-CTC untuk mengenali angka pada citra display seven segment timbangan digital.
2. Menerapkan model ke dalam aplikasi PWA sehingga pengenalan berjalan di perangkat tanpa koneksi internet.
3. Mengukur dan membandingkan akurasi CRNN-CTC dengan Tesseract OCR dan Google Cloud Vision pada data uji citra nyata.

**1.5 Manfaat Penelitian**
1. Bagi pengguna/operator: pencatatan berat lebih cepat, disertai foto bukti, dan tetap dapat dilakukan tanpa sinyal.
2. Bagi keilmuan: gambaran empiris kinerja CRNN-CTC untuk display seven segment dan penerapannya di browser.
3. Bagi penelitian selanjutnya: pipeline pelatihan dan aplikasi pengumpulan data yang dapat dikembangkan.

## 8d. Metodologi penelitian (untuk subbab 1.6 dan Bab III)

Pedoman meletakkan **1.6 Metodologi Penelitian** di Bab I dan rincian langkahnya di **Bab III Metodologi**.

**Rekomendasi: tahapan penelitian eksperimen berbasis CRISP-DM untuk metode, dan Prototyping untuk aplikasi.**

| Tahap | Kegiatan | Bukti di repo |
|---|---|---|
| 1. Identifikasi masalah & studi literatur | kegagalan OCR umum, kebutuhan offline | `SPEC.md` |
| 2. Pengumpulan data | data sintetis (`generate_synthetic.py`), foto nyata via Mode Training + auto-collect Google Vision | `lib/training.ts`, `Review.tsx` |
| 3. Pra-pemrosesan data | validasi, split 80/10/10, augmentasi 4× | `prepare.py` |
| 4. Implementasi metode | pelatihan CRNN-CTC | `train.py` |
| 5. Evaluasi model | exact match, CER, akurasi titik desimal, confusion matrix | `evaluate.py` |
| 6. Implementasi ke aplikasi | ekspor ONNX → PWA | `export_onnx.py`, `ocr-cnn.ts` |
| 7. Pengujian aplikasi | black-box + uji offline + perbandingan metode di perangkat | `06_pengujian_evaluasi.md` |

Alasan: kebutuhan berubah di tengah proyek (target 70% → 80%, larangan input manual), sehingga pola waterfall tidak cocok; proyek berkembang lewat purwarupa berulang (skema DB v1→v2, setting v1→v8, "Round" 25→40 pada app RN).

## 8e. Topik landasan teori & kata kunci pencarian (Bab II)

Sitasi di naskah memakai format (Nama akhir, tahun) sesuai Pedoman §2.3.1; daftar pustaka diurutkan alfabetis (boleh mengacu IEEE/Harvard untuk hal yang tidak diatur).

| Topik | Kata kunci Indonesia | Kata kunci Inggris |
|---|---|---|
| Timbangan digital & seven segment | display tujuh segmen, timbangan digital | seven segment display recognition, digital scale reading |
| Citra digital & pra-pemrosesan | citra grayscale, normalisasi citra, Otsu | image preprocessing, grayscale conversion, Otsu thresholding |
| OCR | pengenalan karakter optik | optical character recognition |
| Tesseract OCR | Tesseract, mode segmentasi halaman | Tesseract LSTM, page segmentation mode |
| CNN | jaringan saraf konvolusi | convolutional neural network |
| LSTM & BiLSTM | LSTM dua arah | bidirectional long short-term memory |
| CTC | CTC loss | connectionist temporal classification |
| CRNN | CRNN pengenalan teks | convolutional recurrent neural network text recognition |
| Augmentasi & data sintetis | augmentasi data, data sintetis | data augmentation, synthetic training data |
| Evaluasi | akurasi, CER, jarak Levenshtein | exact match accuracy, character error rate, edit distance |
| ONNX & inferensi di browser | inferensi di perangkat | ONNX, onnxruntime-web, WebAssembly inference, edge AI |
| Google Cloud Vision | OCR berbasis cloud | Google Cloud Vision text detection |
| PWA | aplikasi web progresif | progressive web app, service worker, offline-first, IndexedDB |
| QR Code | kode QR | QR code decoding |
| Pengujian | pengujian black box | black-box testing |

## 8f. Kontribusi / nilai kebaruan (untuk ditulis hati-hati, setelah studi literatur)

1. Penerapan CRNN-CTC yang dijalankan sepenuhnya di browser (PWA offline) untuk membaca display timbangan.
2. Mekanisme pengumpulan data nyata di dalam aplikasi, termasuk pelabelan terbantu Google Vision + konfirmasi operator.
3. Perbandingan tiga pendekatan (Tesseract, CRNN-CTC on-device, Google Vision) pada data uji yang sama.
4. Analisis perbaikan arsitektur (urutan sekuens/Permute) dan kesesuaian pra-pemrosesan pelatihan–aplikasi.
