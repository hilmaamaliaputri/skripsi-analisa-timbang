# Sistem Analisa Timbang

Kode sistem yang sudah berjalan, dalam bentuk tiga sub-proyek terpisah. Masing-masing
punya dependensi sendiri dan dijalankan sendiri.

Semua parameter target di sini sudah diselaraskan ke **80%** — lihat
`../CHANGELOG-PARAMETER.md`.

---

## Tiga sub-proyek

### `poc-mobile-ocr-main/` — PWA utama

Aplikasi yang dipakai operator timbangan. React 18 + TypeScript + Vite.

Alurnya: login → scan QR karung → ambil 1–5 frame dari area display → OCR
on-device → gerbang keyakinan → simpan ke IndexedDB, foto ke Cache API → sinkron
saat online.

Engine OCR bisa dipilih:

- **Tesseract.js** — default. Data bahasa `ssd` atau `letsgodigital`, mode PSM 7
- **CRNN-CTC ONNX** — dijalankan lewat `onnxruntime-web` (WASM)
- **Cloud fallback** — opsional, memakai Mistral OCR

Ada juga Mode Training untuk mengumpulkan pasangan citra + ground truth.

**Menjalankan:**

```bash
cd sistem/poc-mobile-ocr-main
npm install
npm run dev
```

Perintah lain: `npm run build`, `npm run type-check`, `npm run preview`.

### `poc-training-data-mobile-ocr-main/` — pipeline ML

Pipeline pelatihan model CRNN-CTC. Python + TensorFlow 2.15–2.16.

Isinya: generator data sintetis 7-segmen, persiapan data (split 80/10/10,
augmentasi 4×), arsitektur CRNN (7 conv + 2 BiLSTM + CTC, 11.598.093 parameter),
transfer learning MobileNetV3-Small, evaluasi, dan ekspor ONNX.

Urutan menjalankan:

```bash
cd sistem/poc-training-data-mobile-ocr-main
pip install -r requirements.txt

python generate_synthetic.py    # buat data sintetis
python prepare.py               # split + augmentasi
python train.py                 # latih model CRNN
python evaluate.py              # ukur akurasi
python export_onnx.py           # ekspor ke ONNX untuk PWA
```

**Target akurasi** disimpan sebagai satu konstanta di `config.py`:

```python
TARGET_FULL_ACC = 0.80
```

`evaluate.py`, `train.py`, dan `train_transfer.py` membacanya dari sana. Kalau
target berubah lagi, cukup ubah satu baris itu.

### `poc-ocr-timbangan-master/` — app React Native + ML Kit

Jalur eksperimen ketiga. Expo + Google ML Kit, berisi 5 pipeline heuristik dan
voting berbobot.

```bash
cd sistem/poc-ocr-timbangan-master
npm install
npm start          # atau: npm run android
```

---

## Berkas yang tidak disertakan

Dua berkas besar sengaja dikecualikan lewat `.gitignore` supaya repo tetap
ringan dan cepat di-clone.

**`poc-mobile-ocr-main/public/models/cnn_synth_v1.onnx`** (44,5 MB)

: Model CRNN-CTC hasil pelatihan. Untuk mendapatkannya, jalankan pipeline ML
  sampai `export_onnx.py`, lalu salin hasilnya ke folder itu. Tanpa berkas ini,
  pilihan engine "CNN (BETA)" di Settings tidak akan berfungsi — tapi aplikasi
  tetap jalan dengan Tesseract.

**`poc-mobile-ocr-main/public/tesseract-data/ssd.traineddata`** (10,8 MB)

: Data bahasa Tesseract. Unduh dari repositori `tesseract-ocr/tessdata` di
  GitHub, atau biarkan aplikasi mengambilnya dari CDN saat pertama dijalankan.

**`poc-training-data-mobile-ocr-main/models/`**

: Artefak hasil latihan (`.h5`, `evaluation_report.json`, grafik). Kosong karena
  memang belum ada hasil latihan pada data nyata. Jalankan `train.py` untuk
  menghasilkannya.

---

## Di mana nilai 80% berada

Kalau perlu memeriksa atau mengubahnya lagi:

**Di PWA**

- `src/store/settings.ts` — nilai default `ocrThreshold` dan
  `cloudFallbackThreshold`
- `src/pages/Settings.tsx` — batas slider dan teks UI
- `src/lib/ocr-cloud.ts` — konstanta confidence dari jalur cloud

**Di pipeline ML**

- `config.py` — konstanta `TARGET_FULL_ACC`

---

## Catatan

**Kode ini belum diuji jalan setelah revisi parameter.** Perubahannya murni
nilai, tidak menyentuh logika, dan sintaks Python sudah diverifikasi. Tetapi
`node_modules` belum dipasang di sini, jadi aplikasi PWA belum pernah
dijalankan ulang. Jalankan `npm run type-check` setelah `npm install` untuk
memastikan tidak ada yang rusak.

**Sub-proyek ini terpisah, bukan monorepo.** Masing-masing punya `package.json`
atau `requirements.txt` sendiri. Jangan menjalankan `npm install` di folder
`sistem/` — tidak ada berkasnya di sana.
