# OCR Timbangan

Aplikasi React Native (Expo) untuk membaca angka di display timbangan secara offline. User bisa pilih 1 dari 4 model OCR sesuai kebutuhan (akurasi vs kecepatan).

Engine: [`@react-native-ml-kit/text-recognition`](https://github.com/a7medev/react-native-ml-kit) (ML Kit on-device) + pre/post-processing pipeline yang sudah dioptimasi dari 30 loop iterasi.

## Akurasi

Diuji pada 7 fixture timbangan (lihat [examples/](examples/)):

| Image | GT | Hasil R35 (default) | Catatan |
|---|---|---|---|
| body-scale-68.8kg.png | 68.8 | ✅ 68.8 | Body scale LCD hitam |
| body-scale-50.78kg-led.png | 50.78 | ✅ 50.78 | LED merah body scale |
| industrial-3.895kg.png | 3.895 | ✅ 3.895 | Industri LCD 4-digit |
| kitchen-48.65kg.png | 48.65 | ✅ 48.65 | Kitchen LCD putih |
| body-scale-52.8kg-lcd-pasif.png | 52.8 | ❌ 8 | LCD pasif pink kontras lemah |
| small-led-12.4g.png | 12.4 | ❌ 24 | LED merah 7-seg, digit `1` tipis hilang |
| pocket-scale-3.72g.png | 3.72 | ⚪ miss | Display kecil, banyak label |

**4/7 (57.1%) EXACT**, reproducible 5/5 runs bit-identical. Ceiling MLKit-only di AVD x86_64.

Untuk lebih lanjut: [docs/ANALYSIS_PER_FILE.md](docs/ANALYSIS_PER_FILE.md).

## Model OCR

User bisa pilih via dropdown di app:

| Pilihan UI | Codename | Speed | Karakteristik |
|---|---|---|---|
| **Akurat & Cepat** (default ⭐) | Tuned Trim Mega | ~3s | Production winner, paling stabil |
| Hemat Waktu | Production Lean | ~2.8s | Tercepat, decimal kadang kurang presisi |
| Mode Tajam | PNG Extent | ~4s | PNG lossless, kurang stabil (jitter) |
| Akurat Maksimal | Non-Destructive Fallback | ~6s | Sama dgn Akurat & Cepat + recovery untuk display kecil |

Detail per-pipeline: [docs/PIPELINES_OVERVIEW.md](docs/PIPELINES_OVERVIEW.md).

## Setup

### Prasyarat
- Node 22+ (pakai nvm)
- pnpm 10+
- Android Studio + SDK + AVD (atau hp fisik dengan USB debugging)
- Untuk Linux: `ANDROID_HOME=/path/to/Android/Sdk`

### Install

```bash
nvm use 22
pnpm install
```

### Run di Android

```bash
# 1. Pastikan AVD running atau hp tersambung
adb devices

# 2. Build + install + jalankan
pnpm android
```

Build pertama ~3-5 menit (gradle + native compile). Build berikutnya ~10 detik (UP-TO-DATE).

### Dev mode

```bash
pnpm start                  # Metro bundler
# tap "Open Android" di Expo CLI atau:
adb shell am start -W -a android.intent.action.VIEW \
  -d "exp+ocr-timbangan://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081"
```

Fast refresh otomatis untuk edit JS/JSX.

## Struktur Project

```
ocr-offline/
├── App.js                          # Entry SafeAreaView
├── index.js                        # registerRootComponent
├── app.json                        # Expo config
├── package.json
├── docs/
│   ├── ANALYSIS_PER_FILE.md        # Analisa per-round detail
│   └── PIPELINES_OVERVIEW.md       # Mapping pipeline ↔ round
├── examples/                       # 7 fixture timbangan (PNG)
└── src/
    ├── ScannerScreen.js            # UI utama (dropdown + camera + result)
    ├── models.js                   # Registry 4 model (label teknis + displayName)
    └── ocr/
        ├── runners.js              # modelId → runner function
        ├── lib/
        │   ├── groundTruth.js
        │   ├── textRecognition.native.js   # ML Kit wrapper
        │   └── textRecognition.web.js      # Tesseract fallback
        └── pipelines/
            ├── r25-png-extent.js
            ├── r30-production-lean.js
            ├── r35-tuned-trim.js  ⭐    # PRODUCTION
            ├── r37-lcd-attack.js
            └── r39-non-destructive.js
```

## Cara Pakai (User)

1. Buka app, default model **Akurat & Cepat**
2. Tap dropdown model kalau ingin ganti (4 opsi dengan badge accuracy/speed)
3. Tap **📷 Kamera** untuk foto langsung, atau **🖼 Galeri** untuk pilih dari foto tersimpan
4. Setelah image muncul di preview, tap **▶ Scan**
5. Tunggu ~3-5 detik, hasil muncul di card bawah
6. Tap **▶ Detail iter** untuk lihat per-iter raw reading + timing

## Test dengan Fixture

Push 7 fixture ke AVD:

```bash
for f in examples/*.png; do
  adb push "$f" "/sdcard/Pictures/$(basename "$f")"
done
adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE \
  -d "file:///sdcard/Pictures/"
```

Lalu di app → 🖼 Galeri → pilih fixture → Scan.

## Pipeline Internal (Optional Reading)

Setiap pipeline = chain dari beberapa iter (preprocessing × OCR call × post-processing). Iter terakhir biasanya **vote aggregator** yang absorb ML Kit jitter.

Contoh **R35** (production winner):

| Iter | Method | Strategy |
|---|---|---|
| 136 | `jpeg_baseline` | JPEG Q=0.3 × 4 rotation |
| 137 | `png_baseline` | PNG lossless × 4 rotation |
| 138 | `bbox_png` | detect bbox → crop → PNG re-OCR |
| 139 | `multi_res` | 640/1280/1920 multi-resolution |
| 140 | `tuned_trim_mega` | **Vote aggregator** + trim variant boost ×2.5 |

Innovation kunci R35: untuk 5-digit raw `50783`, expand juga ke 4-digit `5078`. Conditional weight ×2.5 boost kalau hasil match body_kg XX.YY format → menang voting → 50.78 EXACT (bukan 50.783 close).

Detail teknis: [docs/ANALYSIS_PER_FILE.md](docs/ANALYSIS_PER_FILE.md).

## Limitations

3 image konsisten gagal di MLKit-only:
- **LCD pasif kontras lemah**: MLKit hanya pickup digit terakhir
- **LED merah 7-seg**: digit `1` tipis tidak terdeteksi
- **Display sangat kecil**: total miss

Untuk tembus 6/7+ butuh:
- HP fisik dengan NPU (~1 day test) — kemungkinan +1 win
- [RapidOCR mobile](https://github.com/gutenye/ocr-react-native) (~1 week integration) — engine berbeda
- Custom TFLite 7-segment classifier (~1 month + dataset) — true 7/7

## License

Internal Imp Studio.
