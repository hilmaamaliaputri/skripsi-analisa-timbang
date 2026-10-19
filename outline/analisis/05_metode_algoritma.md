# 05 — Metode & Algoritma Inti

> Fokus: pipeline OCR display 7-segmen. Ada **tiga pendekatan** di repo:
> (1) **Tesseract.js** (PWA), (2) **CRNN-CTC custom → ONNX** (pipeline Python + PWA), (3) **Google ML Kit + aturan & voting** (app React Native).
> Plus (4) **cloud fallback Mistral** (PWA, opsional).

---

## 5a. Pipeline preprocessing citra

### 5a.1 Akuisisi (bersama untuk Tesseract & CNN di PWA)

| Urutan | Langkah | Parameter | Lokasi | Label |
|---|---|---|---|---|
| 1 | Buka kamera belakang | `facingMode: environment`, resolusi ideal 1920×1080 (min 1280×720), `focusMode: continuous` (best effort) | `src/lib/camera.ts:L1-43` | [KODE] |
| 2 | Ambil N frame | N = `multiFrameCount` (default 3, rentang 1–5), jeda 350 ms antarframe | `src/pages/CaptureOCR.tsx:L106-120`, `store/settings.ts:L62` | [KODE] |
| 3 | Crop ROI tetap di tengah | lebar 70% × tinggi 35% frame video, sinkron dengan bracket overlay UI | `CaptureOCR.tsx:L23-24`, `camera.ts:L76-100` | [KODE] |
| 4 | Encode | JPEG kualitas 0,92, resolusi native (tanpa downscale) | `camera.ts:L93-98`, `CaptureOCR.tsx:L116` | [KODE] |
| alt | Crop manual / upload | frame penuh maxWidth 1280, q 0,92 → kotak crop normalisasi (awal x0,15 y0,35 w0,7 h0,3), JPEG q0,95 | `CaptureOCR.tsx:L237`, `ManualCropEditor.tsx:L21,L172-189` | [KODE] |

### 5a.2 Jalur Tesseract (konfigurasi default saat ini)

`DEFAULT_OCR_CONFIG = { language:'ssd', whitelist:'0123456789.', pagesegmode:7, langPath:'/tesseract-data', preprocess:false, cropRatio:1.0 }` — [KODE] `src/types/ocr.ts:L23-31`.

| Urutan | Langkah | Aktif default? | Parameter | Lokasi |
|---|---|---|---|---|
| 1 | `cropCenterStrip` | **Tidak** (hanya jika `cropRatio<1`) | tinggi strip = ratio×H | `lib/ocr.ts:L67-73`, `lib/image.ts:L107-113` |
| 2 | `preprocessForOCR` (red-emphasis → Otsu → invert) | **Tidak** (hanya jika `preprocess=true`; komentar: "ssd trained on raw photos → false") | lihat 5a.3 | `lib/ocr.ts:L75-81`, `types/ocr.ts:L17` |
| 3 | `upscaleWithPadding` | **Ya, selalu** | tinggi min 200 px, padding 12% tiap sisi, latar putih, smoothing 'high', JPEG 0,95 | `lib/ocr.ts:L83-91`, `lib/image.ts:L121-156` |
| 4 | Tesseract recognize | Ya | PSM 7, whitelist, OEM 1 | `lib/ocr.ts:L96-111` |

**Temuan penting [KODE]:** thumbnail "DILIHAT OCR" di layar Review selalu dibuat dari `preprocessForOCR` (`CaptureOCR.tsx:L167-173`), padahal pada konfigurasi default Tesseract **tidak** menerima citra terbinarisasi itu — dan jalur CNN juga tidak. Visual debug ini **tidak merepresentasikan input model sebenarnya**. Ini penting bila dijadikan gambar di skripsi.

### 5a.3 Algoritma `preprocessForOCR` (tersedia, dipakai untuk visualisasi) — `src/lib/image.ts:L40-101`

1. **Grayscale berbobot kanal merah** (LED merah → terang):
   $$ I(x,y) = \min\big(255,\ \mathrm{round}(0{,}7R + 0{,}2G + 0{,}1B)\big) $$
2. **Histogram 256-bin** lalu **ambang Otsu** (maksimisasi varians antar-kelas):
   $$ \sigma_B^2(t) = \omega_0(t)\,\omega_1(t)\,\big[\mu_0(t)-\mu_1(t)\big]^2, \qquad t^\* = \arg\max_t \sigma_B^2(t) $$
   (implementasi memakai jumlah piksel $w_B, w_F$ alih-alih probabilitas — ekuivalen untuk argmax; `L62-84`).
3. **Binarisasi + invers**: $I' = 0$ jika $I > t^\*$, selain itu $255$ (digit terang → hitam di latar putih) (`L87-90`).
4. Encode JPEG 0,95 (lossy — menimbulkan artefak pada citra biner). [INFERENSI]

### 5a.4 Jalur CNN (ONNX di browser) — `src/lib/ocr-cnn.ts:L51-84`

| Urutan | Langkah | Parameter |
|---|---|---|
| 1 | Kanvas 256×64 diisi putih | `IMG_WIDTH=256`, `IMG_HEIGHT=64` (`L18-19,L59-61`) |
| 2 | Resize mempertahankan rasio ke tinggi 64; lebar = **min(256, round(64·rasio))**; diletakkan di tengah | `L64-68` (interpolasi bawaan canvas) |
| 3 | Grayscale BT.601: $Y = 0{,}299R + 0{,}587G + 0{,}114B$ | `L75-81` |
| 4 | Normalisasi $[0,1]$: $x = Y/255$ | `L80` |
| 5 | Tensor NHWC `[1, 64, 256, 1]` float32 | `L142` |

**Pasangan di sisi training** — `train.py:L49-71` (`load_image`): `cv2.IMREAD_GRAYSCALE` → resize tinggi 64 (`INTER_AREA`) → **jika lebar > 256: crop tengah**, jika kurang: pad putih → /255.

**Ketidaksesuaian train–inference [KODE → INFERENSI dampak]:**
| Aspek | Training (Python) | Inference (browser) |
|---|---|---|
| Citra lebih lebar dari 4:1 | crop tengah (rasio dipertahankan) | **dipepatkan** ke 256 px (rasio rusak) |
| Interpolasi | `INTER_AREA` | bilinear canvas |
| Dekode JPEG | libjpeg (OpenCV) | decoder browser |
| Domain citra | crop display rapat (sintetis 320–500 × 100–160 px, rasio 2–5) | ROI 70%×35% frame kamera; pada video potret 1080×1920 rasio ROI ≈ 1,1 → digit hanya mengisi ±72 px dari lebar 256 [INFERENSI] |
Dokumen proyek sendiri menandai kesesuaian ini sebagai **CRITICAL** (`DEPLOYMENT.md:L400-402`), namun tidak ada tes otomatis yang memverifikasinya.

### 5a.5 Augmentasi & pembangkitan data (pipeline Python)

**Generator sintetis** — `generate_synthetic.py`:
- Render 7-segmen dari tabel segmen a–g (`L36-47`), titik desimal = lingkaran (`L70-73`); latar gelap 9 variasi, warna LED 10 variasi (merah/amber/hijau/cyan) (`L83-110`); tinggi digit = 76% tinggi citra, lebar digit 0,55×tinggi, tebal segmen 10% (`L113-135`).
- Derau: rotasi ±7°, perspektif (p=0,25, skew ±5%), kecerahan ×0,6–1,25, kontras (p=0,3, ×0,8–1,3), Gaussian blur (p=0,4, k∈{3,5,7}), motion blur (p=0,15, k∈{5,9}), glare (p=0,2, r 8–20 px), noise Gaussian σ∈[2,12], artefak JPEG (p=0,4, q 60–85) (`L146-214`).
- Nilai label: 9 pola (integer 1–9999 ×3, 1-desimal, 2-desimal ×3, 3-desimal, "0.xx") (`L218-234`).
- Catatan: README dataset menyebut "rotation ±5°" (`data/synthetic_full/README.md:L14`), kode ±7° — dokumentasi tidak sinkron. [KODE]

**Augmentasi training (albumentations)** — `prepare.py:L41-57`, `config.py:L35-39`:
`Rotate(±8°, p=0,7)` → `RandomBrightnessContrast(±0,2, p=0,6)` → `OneOf[Blur(≤3), MotionBlur(≤3)] (p=0,4)` → `GaussNoise(var=(0,03·255)², p=0,4)` → `RandomScale(±0,1, p=0,3)`; **4 varian per citra latih** (hanya split train).

---

## 5b. Pendekatan OCR & kapan dipakai

| Engine | Konfigurasi | Kapan dipakai | Bukti |
|---|---|---|---|
| Tesseract.js 5 | OEM = 1 (LSTM only — argumen kedua `createWorker(lang, 1, …)`), **PSM 7** (single text line), whitelist `0123456789.`, traineddata `ssd` (default, 11 MB) / `letsgodigital` (144 KB) / `eng` (CDN) | **Default** (`ocrEngine='tesseract'`) | `lib/ocr.ts:L34-38,L96-99`, `store/settings.ts:L6-22,L66` |
| CRNN-CTC ONNX | `cnn_synth_v1.onnx`, WASM EP | Bila operator memilih "CNN (BETA)" di Settings | `store/settings.ts:L24,L67`, `Settings.tsx:L328-353` |
| Mistral OCR / Pixtral-12B | prompt khusus 7-segmen, `temperature 0` | **Fallback** bila diaktifkan + online + API key + confidence lokal < `cloudFallbackThreshold` (0,80), atau tombol manual di Review | `CaptureOCR.tsx:L181-213`, `Review.tsx:L77-116` |
| (C) Google ML Kit Text Recognition (on-device) | tanpa konfigurasi; dibungkus 4–9 iterasi preprocessing + voting | App RN terpisah | `poc-ocr-timbangan-master/src/ocr/lib/textRecognition.native.js:L1-6` |

**Hybrid?** [KODE] Tesseract dan CNN **tidak** dijalankan bersamaan/berjenjang — hanya salah satu sesuai setting ("Hybrid mode — switch", `Settings.tsx:L372-374`). Satu-satunya fallback otomatis adalah ke cloud. Alasan PSM 7 tunggal (bukan multi-PSM): "Multi-PSM ditolak karena menambah non-determinism" (`lib/ocr.ts:L93-95`), didukung data uji `SPEC.md:L789-795`.

---

## 5c. Arsitektur model custom (CRNN)

Definisi: `train.py:L93-128` (training) dan `export_onnx.py:L26-69` (versi LSTM *unrolled* untuk ekspor). Hiperparameter: `config.py:L10-32`.

| # | Layer | Konfigurasi | Output (H×W×C / T×F) | Parameter |
|---|---|---|---|---|
| 0 | Input `image` | grayscale, float32 [0,1] | 64×256×1 | 0 |
| 1 | Conv2D-BN-ReLU `conv_0` | 64 filter 3×3, same | 64×256×64 | 640 + 256 |
| | MaxPool 2×2 `pool_0` | | 32×128×64 | 0 |
| 2 | Conv2D-BN-ReLU `conv_1` | 128 | 32×128×128 | 73.856 + 512 |
| | MaxPool 2×2 `pool_1` | | 16×64×128 | 0 |
| 3 | `conv_2` | 256 | 16×64×256 | 295.168 + 1.024 |
| 4 | `conv_3` + MaxPool (1,2) | 256 | 16×32×256 | 590.080 + 1.024 |
| 5 | `conv_4` | 512 | 16×32×512 | 1.180.160 + 2.048 |
| 6 | `conv_5` + MaxPool (1,2) | 512 | 16×16×512 | 2.359.808 + 2.048 |
| 7 | `conv_6` | 512 | 16×16×512 | 2.359.808 + 2.048 |
| 8 | Reshape `(W, H·C)` | **tanpa Permute** | 16×8.192 | 0 |
| 9 | Dense `fc_pre_lstm` ReLU + Dropout 0,25 | 256 | 16×256 | 2.097.408 |
| 10 | BiLSTM `bilstm_1` + Dropout 0,25 | 2×256, `return_sequences` | 16×512 | 1.050.624 |
| 11 | BiLSTM `bilstm_2` + Dropout 0,25 | 2×256 | 16×512 | 1.574.912 |
| 12 | Dense `output` softmax | `NUM_CLASSES + 1` = **13** | 16×13 | 6.669 |
| | **Total** | | | **11.598.093** (non-trainable BN 4.480) |

Perhitungan parameter oleh analis [INFERENSI, dihitung dari rumus]: Conv = $9\,C_{in}C_{out}+C_{out}$; BN = $4C$; LSTM satu arah = $4\,[u(d+u)+u]$. Hasil konsisten dengan klaim "11.6M" (`SYNTHETIC_BASELINE_REPORT.md:L32`) dan ukuran ONNX 46,6 MB ≈ 11,6 M × 4 byte (FP32).

Catatan kritis:
1. **[KODE] Reshape tanpa transpose** (`train.py:L109-111`, `export_onnx.py:L48-50`). Tensor NHWC (H=16, W=16, C=512) di-reshape langsung ke (16, 8192); karena urutan memori *row-major* (h, w, c), setiap "timestep" berisi **satu baris horizontal (h)**, bukan satu kolom (w). Akibatnya urutan sekuens CTC berjalan **atas→bawah**, bukan kiri→kanan seperti CRNN standar (yang memakai `Permute((2,1,3))` sebelum reshape). Kode tidak error karena kebetulan H = W = 16. **[INFERENSI]** Ini kemungkinan besar ikut menjelaskan plateau 60% dan buruknya label panjang (7 karakter 18%). **Rekomendasi eksperimen**: tambahkan `layers.Permute((2,1,3))` lalu latih ulang dan bandingkan (ablation yang sangat layak untuk skripsi). Hal yang sama terjadi di `train_transfer.py:L107-109` (fitur 2×8×576 → 8×1152).
2. **[KODE] Jumlah kelas 13, bukan 12** seperti di dokumentasi (`README.md:L48,L55`). `ctc_batch_cost` Keras memakai **indeks terakhir (12) sebagai blank**, sehingga indeks 11 (`config.BLANK_INDEX`) tidak pernah menjadi target (kelas mati). Decoder Python (`train.py:L184`) dan TS (`ocr-cnn.ts:L119`) sama-sama membuang indeks ≥ 11, jadi hasil tetap konsisten.
3. Panjang sekuens **T = 16**; `MAX_LABEL_LENGTH = 8` (`config.py:L21`). Syarat CTC $T \ge L + \#\text{pengulangan berurutan}$ terpenuhi (maks 15). Komentar `export_onnx.py:L29` ("Sequence length fixed 64") keliru. [KODE]
4. Aktivasi: ReLU (conv, dense), tanh/sigmoid (LSTM default Keras), softmax (output). `use_cudnn=False` agar bisa diekspor (`train.py:L115-118`).

**Model transfer learning** (`train_transfer.py:L47-128`): input 64×256×1 → replikasi 3 kanal → skala $2x-1$ → **MobileNetV3-Small** (ImageNet, `include_top=False`, α=1,0) → fitur (2, 8, 576) → Reshape (8, 1152) → head CRNN yang sama. Total ≈ 3,87 M parameter (`SYNTHETIC_BASELINE_REPORT.md:L66`). Dua fase: warm-up backbone beku, lalu fine-tune seluruhnya.

---

## 5d. Training

| Aspek | Nilai | Bukti | Label |
|---|---|---|---|
| Dataset tersedia di repo | **1.000 citra sintetis** (seed 100), 17 MB | `data/synthetic_full/README.md:L3-5`, `wc -l labels.csv` | [KODE] |
| Distribusi panjang label (dihitung analis) | panjang 2: 1 · 3: 31 · 4: 412 · 5: 121 · 6: 334 · 7: 101 | skrip hitung atas `labels.csv` | [KODE] |
| Label berdesimal | 692 (69,2%); tanpa desimal 308 | idem | [KODE] |
| Frekuensi karakter | '.' 692, '0' 461, '1' 415, '2' 430, '3' 455, '4' 482, '5' 381, '6' 420, '7' 453, '8' 419, '9' 451 | idem | [KODE] |
| Dataset nyata (Mode Training / lapangan) | **TIDAK DITEMUKAN DI REPO** (0 sampel) | tidak ada ZIP `analisa-training-*` | [KODE] |
| Split | 80/10/10, stratifikasi per panjang string; grup < 3 sampel masuk train; `random_state=42` | `config.py:L42-47`, `prepare.py:L128-150` | [KODE] |
| Ukuran split (tercatat) | test = 104 sampel | `SYNTHETIC_BASELINE_REPORT.md:L46` | [KODE] dokumen |
| Ukuran split train/val | ≈ 800/100 + augmentasi 4× → ≈ 4.000 citra train [INFERENSI]; angka pasti **TIDAK DITEMUKAN** (`stats.json` tidak ada) | | [INFERENSI] |
| Epoch / batch / LR | 50 / 32 / 1e-3 | `config.py:L24-26` | [KODE] |
| Optimizer | Adam | `train.py:L264` | [KODE] |
| Loss | CTC (`tf.keras.backend.ctc_batch_cost`) via layer custom `add_loss` | `train.py:L155-171` | [KODE] |
| Callback | `CharAccuracy` (val_full_acc & val_char_acc tiap epoch) → `ModelCheckpoint(best.h5, monitor val_full_acc)` → `EarlyStopping(val_full_acc, patience 10, restore best)` → `ReduceLROnPlateau(val_loss, ×0,5, patience 5, min 1e-6)` → `CSVLogger` | `train.py:L272-296` | [KODE] |
| Regularisasi | Dropout 0,25 ×3, BatchNorm | `config.py:L32` | [KODE] |
| Seed | TF & NumPy 42 | `train.py:L29-30` | [KODE] |
| Hardware & durasi (tercatat) | M2 Pro Metal, ~2,5 jam / 50 epoch | `SYNTHETIC_BASELINE_REPORT.md:L5,L36` | [KODE] dokumen |
| Transfer learning | warm-up 10 epoch lr 1e-3 (patience 5), fine-tune 30 epoch lr 1e-4 | `train_transfer.py:L354-362,L187-264` | [KODE] |

---

## 5e. Decoding & postprocessing

### 5e.1 Greedy CTC (Python `train.py:L175-188`, TS `ocr-cnn.ts:L92-131`)
$$ \hat{\pi}_t = \arg\max_k\, y_t^k,\quad t=1..T;\qquad \hat{\ell} = \mathcal{B}(\hat{\pi}) $$
dengan $\mathcal{B}$ = gabungkan simbol berulang berurutan lalu hapus blank. **Beam search/lexicon: tidak ada.** [KODE]

### 5e.2 Confidence
- CNN: rata-rata probabilitas maksimum pada timestep yang menghasilkan karakter:
  $$ c_{\text{CNN}} = \frac{1}{|\mathcal{E}|}\sum_{t\in\mathcal{E}} \max_k y_t^k $$
  (`ocr-cnn.ts:L126-128`, `predict.py:L43-52`). Tidak dikalibrasi. [KODE]
- Tesseract: `data.confidence / 100` (confidence rata-rata internal Tesseract) (`lib/ocr.ts:L109`). [KODE]
- Cloud: **konstanta 0,80** (`ocr-cloud.ts:L191` — kode masih 0,95, perlu diselaraskan). [KODE]
- Temuan SPEC: Tesseract 76% yakin pada hasil salah → confidence tidak layak sebagai gate (`SPEC.md:L809`). [KODE dokumen]

### 5e.3 Pemilihan frame
Frame dengan `parseBerat ≠ null` diurutkan menurun berdasarkan confidence; ambil teratas (`CaptureOCR.tsx:L145-161`). Meski komentar menyebut "voting" (`L97-99`), ini **max-confidence selection**, bukan majority voting. [KODE]

### 5e.4 Parsing & validasi angka — `parseBerat` (`lib/ocr.ts:L138-144`)
1. Hapus karakter selain `[0-9.]`; 2. `parseFloat` (berhenti pada titik kedua: "3.8.95" → 3,8); 3. **bulatkan ke 2 desimal**: `Math.round(x·100)/100`.
[KODE] + [INFERENSI]: pembulatan 2 desimal membuat pembacaan 3 desimal (mis. "3.895" pada timbangan industri `SPEC.md:L780`) tersimpan sebagai **3,9** (IEEE-754: 3,895×100 = 389,5 → round 390). Tidak ada validasi rentang, jumlah digit desimal, atau format per jenis timbangan. Perlu diverifikasi dengan unit test dan diputuskan: simpan string mentah + angka presisi penuh.

### 5e.5 Ekstraksi hasil cloud — `ocr-cloud.ts:L66-83`
Hapus markdown → regex `-?\d{1,7}[.,]\d{1,3}|-?\d{1,7}` → prioritaskan kandidat berdesimal → koma→titik. Pixtral diminta JSON `{"value":"X.XXX"}` dan di-parse (`L145-154`).

### 5e.6 Postprocessing berbasis aturan (App RN, R35 "Tuned Trim Mega") — `pipelines/r35-tuned-trim.js`
1. Iter136: resize 1280, JPEG q0,3, 4 rotasi (0/90/180/270), skor baris = $\text{digits}\cdot(1+10^{-4}\cdot\text{area})\cdot p_{sub}$ (`L155-176`).
2. Iter137: sama dengan PNG lossless (`L178-199`).
3. Iter138: deteksi bbox baris angka terbesar → crop (pad 15%/50%) → upscale ≥800 px PNG → OCR ulang (`L201-232`).
4. Iter139: multi-resolusi 640/1280/1920 (`L234-250`).
5. Iter140: **agregator voting berbobot** — ekspansi varian "buang digit terakhir" untuk 5 digit; tebak jenis timbangan dari teks adegan (`max…g`, `kg`, `tare`…); tempatkan titik desimal menurut tabel `DECIMAL_STRATEGY` per jenis (body_kg, kitchen_kg, kitchen_g, pocket_g) dengan rentang wajar; bobot ×5 (jenis eksplisit), ×2 (unit cocok), ×1,2 (ada desimal), ×2,5 (varian trim XX.YY body_kg), ×0,7 (penalti 3 desimal), ×1,3/1,3/1,2 per sumber; tally per nilai (4 desimal) → argmax (`L256-352`).
Substitusi huruf→digit: O→0, L/I→1, Z→2, T→7, B→8 (`L12-19`). Filter token label (mode, tare, kg…) (`L11`).
[INFERENSI] Bobot-bobot ini di-tuning langsung pada **7 citra yang sama dengan set uji** (`docs/ANALYSIS_PER_FILE.md`), sehingga berisiko *overfitting* dan tidak dapat digeneralisasi tanpa set uji independen.

---

## 5f. Deployment model

| Aspek | Temuan | Bukti | Label |
|---|---|---|---|
| Ekspor | Rebuild model dengan LSTM `unroll=True`, salin bobot per nama layer, `tf2onnx.convert.from_keras` **opset 13**, input dinamis batch `[None,64,256,1]` | `export_onnx.py:L26-69,L105-136` | [KODE] |
| Validasi ekspor | bandingkan output Keras vs ONNX pada 2 input acak; lulus jika max |Δ| < 1e-4 | `export_onnx.py:L150-173` | [KODE] |
| Hasil validasi tercatat | **max diff 0,94** ("likely OK for argmax") — berarti **tidak lulus** kriteria skrip sendiri | `SYNTHETIC_BASELINE_REPORT.md:L114` | [KODE] dokumen |
| File deploy | `public/models/cnn_synth_v1.onnx`, 46.641.632 B | `ls` | [KODE] |
| Kuantisasi | **Tidak ada** (tidak ada kode int8/fp16; ukuran ≈ FP32) | grep `quantiz` nihil; ukuran | [INFERENSI kuat] |
| Runtime | `onnxruntime-web` EP `wasm`, `graphOptimizationLevel:'all'`, sesi lazy singleton, preload saat halaman capture dibuka, path dapat diganti | `ocr-cnn.ts:L21-45`, `CaptureOCR.tsx:L54-56` | [KODE] |
| Offline | ONNX & WASM ikut precache SW (batas 60 MB) | `vite.config.ts:L29-30` | [KODE] |
| `optimizeDeps.exclude onnxruntime-web` | agar WASM tidak di-bundle ulang Vite | `vite.config.ts:L68-70` | [KODE] |
| Latensi tercatat | Keras 2.195 ms vs ONNX 81 ms (desktop, 2 input dummy, termasuk overhead panggilan pertama); evaluate 29 ms/citra (CPU desktop) | `SYNTHETIC_BASELINE_REPORT.md:L48,L105` | [KODE] dokumen |
| Latensi di HP/browser | **TIDAK DITEMUKAN DI REPO** | | |

---

## 5g. Pseudocode & rumus

### Algoritma 1 — Capture & pengenalan multi-frame (PWA)
```
procedure CAPTURE_AND_RECOGNIZE(video, N, engine, τ_save, τ_cloud)
  F ← ∅
  for i ← 1..N do
      F ← F ∪ { CROP_ROI_JPEG(video, 0.70, 0.35, q=0.92) }
      if i < N then WAIT(350 ms)
  R ← PARALLEL_MAP(f ∈ F : (f, RECOGNIZE(engine, f)))
  V ← { (f, r) ∈ R : PARSE_BERAT(r.text) ≠ null }
  if V = ∅ then return RETAKE
  (f*, r*) ← argmax_{(f,r) ∈ V} r.confidence
  STORE_BLOB(f*)
  if cloudEnabled ∧ online ∧ apiKey ∧ r*.confidence < τ_cloud then
      c ← CLOUD_OCR(f*)                         ▷ operator wajib konfirmasi
  if source = local ∧ r*.confidence < τ_save then LOCK_SAVE
  return (PARSE_BERAT(r*.text), r*.confidence)
```

### Algoritma 2 — RECOGNIZE_CNN
```
function RECOGNIZE_CNN(img)
  canvas ← WHITE(256, 64)
  w ← min(256, round(64 · img.w / img.h));  DRAW(canvas, img, x=(256−w)/2, 0, w, 64)
  X[h,w] ← (0.299R + 0.587G + 0.114B)/255
  Y ← ONNX_RUN(X[1,64,256,1])                 ▷ Y ∈ R^{T×13}, T=16
  π_t ← argmax_k Y[t,k]
  s ← ""; P ← []; prev ← −1
  for t ← 1..T do
      if π_t ≠ prev ∧ π_t < 11 then s ← s ∥ VOCAB[π_t]; P.append(Y[t,π_t])
      prev ← π_t
  return (s, mean(P))
```

### Algoritma 3 — Otsu (lihat 5a.3) dan Algoritma 4 — Pelatihan CRNN
```
procedure TRAIN(D_train, D_val)
  M ← CRNN();  opt ← Adam(1e-3)
  for epoch ← 1..50 do
      for batch (X, y, |y|) in SHUFFLE(D_train, 32) do
          L ← CTC_LOSS(y, M(X), T=16, |y|);  opt.step(∇L)
      acc_full, acc_char ← EVAL_GREEDY(M, D_val)
      SAVE_IF_BEST(acc_full); EARLY_STOP(acc_full, patience=10); REDUCE_LR(val_loss, 0.5, 5)
```

### Rumus
**CTC loss** untuk input $x$, label $\ell$, keluaran softmax $y_t^k$:
$$ p(\ell\mid x) = \sum_{\pi \in \mathcal{B}^{-1}(\ell)} \prod_{t=1}^{T} y_t^{\pi_t}, \qquad \mathcal{L}_{\text{CTC}} = -\ln p(\ell\mid x) $$

**Full-string (exact match) accuracy** (`evaluate.py:L101-103`):
$$ \text{Acc}_{\text{full}} = \frac{1}{N}\sum_{i=1}^{N} \mathbb{1}\left[\hat{\ell}_i = \ell_i\right] $$

**Character accuracy seperti diimplementasikan** — posisi-demi-posisi (`evaluate.py:L106-112`):
$$ \text{Acc}_{\text{char}} = \frac{\sum_i \sum_{j=1}^{\min(|\hat{\ell}_i|,|\ell_i|)} \mathbb{1}[\hat{\ell}_{i,j} = \ell_{i,j}]}{\sum_i |\ell_i|} $$
(catatan: berbeda dengan `CharAccuracy` di training yang memakai penyebut $\sum_i \max(|\hat\ell_i|,|\ell_i|)$ — `train.py:L218-222`; metrik posisional ini **bias** bila ada sisipan/hapusan di awal string).

**Levenshtein / edit distance** (`evaluate.py:L37-52`) dan **CER** yang disarankan untuk skripsi (belum dihitung di kode):
$$ d(i,j) = \min\{ d(i-1,j)+1,\ d(i,j-1)+1,\ d(i-1,j-1)+[a_i\neq b_j] \},\qquad \text{CER} = \frac{\sum_i d(\hat{\ell}_i,\ell_i)}{\sum_i |\ell_i|} $$

**Skor voting R35** (App RN) untuk nilai kandidat $v$:
$$ S(v) = \sum_{c \in \mathcal{C}} \sum_{s\in\text{scaleTypes}} \mathbb{1}[\text{place}(c,s)=v]\cdot \text{score}_{c,s}\cdot \prod_{m} w_m(c,s), \qquad \hat v = \arg\max_v S(v) $$
