# Deployment Guide — Pakai Model ONNX di POC PWA

> **Audience:** Frontend Engineer yang akan integrate model hasil training ke POC PWA.
>
> **Prerequisite:** File `model.onnx` hasil [`export_onnx.py`](./export_onnx.py) dengan validation PASS (≥95% test accuracy).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  POC PWA (browser, on-device)                       │
│                                                     │
│   1. Camera capture → Manual crop → Image Blob      │
│   2. Image preprocessing (resize, normalize)        │
│   3. ONNX Runtime Web inference (Custom CNN)        │
│   4. CTC decoding → "3.895"                         │
│   5. Confidence check (≥80% threshold)              │
│   6. Save → IndexedDB → sync                        │
│                                                     │
│  Constraint: 100% offline · no cloud AI            │
└─────────────────────────────────────────────────────┘
```

---

## Step 1: Copy ONNX File ke POC

```bash
# Dari root mobile-ocr/
mkdir -p poc/public/models/
cp training/models/cnn_v1/model.onnx poc/public/models/cnn_v1.onnx

# Verify
ls -lh poc/public/models/cnn_v1.onnx
# -rw-r--r--  1 user  staff  45M  May 15 10:00 cnn_v1.onnx
```

POC akan auto-cache via Workbox PWA Service Worker → tetap offline-first.

---

## Step 2: Install ONNX Runtime Web di POC

```bash
cd poc/
npm install onnxruntime-web
```

Update `vite.config.ts` untuk handle ONNX Runtime WASM files:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [/* ... existing plugins ... */],
  optimizeDeps: {
    exclude: ['onnxruntime-web'],  // jangan bundle (gunakan WASM langsung)
  },
  // ... existing config
})
```

---

## Step 3: Update PWA Workbox untuk Cache ONNX + WASM

`poc/vite.config.ts` — workbox config:

```typescript
VitePWA({
  workbox: {
    globPatterns: ['**/*.{js,css,html,png,svg,woff2,wasm,traineddata,onnx}'],
    maximumFileSizeToCacheInBytes: 60 * 1024 * 1024,  // 60 MB (cover 45 MB ONNX)
    runtimeCaching: [
      // ... existing rules
      {
        urlPattern: /\.onnx$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'onnx-models',
          expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 365 },
        },
      },
    ],
  },
}),
```

---

## Step 4: Buat Wrapper `ocr-cnn.ts`

Buat file baru `poc/src/lib/ocr-cnn.ts`:

```typescript
/**
 * Custom CNN OCR via ONNX Runtime Web.
 * Replace Tesseract.js untuk production accuracy ≥80%.
 */
import * as ort from 'onnxruntime-web'
import type { OCRResult } from '@/types/ocr'
import { blobToImage } from './image'

// Vocabulary harus match training/config.py
const VOCAB = '0123456789.'
const NUM_CLASSES = VOCAB.length + 1  // +1 untuk CTC blank
const BLANK_INDEX = VOCAB.length

const IMG_HEIGHT = 64
const IMG_WIDTH = 256

let sessionPromise: Promise<ort.InferenceSession> | null = null

/** Lazy-load ONNX model. Cache session setelah pertama kali load. */
async function getSession(modelPath: string = '/models/cnn_v1.onnx'): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    console.debug('[OCR-CNN] Loading model:', modelPath)
    sessionPromise = ort.InferenceSession.create(modelPath, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    })
    sessionPromise.then(() => console.debug('[OCR-CNN] Model loaded'))
  }
  return sessionPromise
}

/**
 * Preprocess image: grayscale, resize aspect-aware, normalize 0-1.
 * Match preprocessing di training/train.py:load_image()
 */
async function preprocessImage(blob: Blob): Promise<Float32Array> {
  const img = await blobToImage(blob)

  const canvas = document.createElement('canvas')
  canvas.width = IMG_WIDTH
  canvas.height = IMG_HEIGHT
  const ctx = canvas.getContext('2d')!
  // White background (matches padding di training preprocessing)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, IMG_WIDTH, IMG_HEIGHT)

  // Aspect-aware fit
  const ratio = img.width / img.height
  const targetH = IMG_HEIGHT
  const newW = Math.min(IMG_WIDTH, Math.round(targetH * ratio))
  const offsetX = Math.round((IMG_WIDTH - newW) / 2)
  ctx.drawImage(img, offsetX, 0, newW, targetH)

  const imageData = ctx.getImageData(0, 0, IMG_WIDTH, IMG_HEIGHT)
  const data = imageData.data
  const tensor = new Float32Array(IMG_HEIGHT * IMG_WIDTH * 1)

  // Convert RGB → grayscale + normalize 0-1
  for (let i = 0; i < IMG_HEIGHT * IMG_WIDTH; i++) {
    const r = data[i * 4]
    const g = data[i * 4 + 1]
    const b = data[i * 4 + 2]
    // Standard luminance (sama dengan cv2.IMREAD_GRAYSCALE)
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    tensor[i] = gray / 255.0
  }

  return tensor
}

/**
 * Greedy CTC decoder:
 *   1. Argmax per timestep
 *   2. Collapse consecutive duplicates
 *   3. Remove blanks
 */
function ctcDecode(
  logits: Float32Array,
  T: number,
  classes: number,
): { text: string; confidence: number } {
  const argmax: number[] = []
  const probs: number[] = []

  for (let t = 0; t < T; t++) {
    let bestIdx = 0
    let bestProb = -Infinity
    for (let c = 0; c < classes; c++) {
      const p = logits[t * classes + c]
      if (p > bestProb) {
        bestProb = p
        bestIdx = c
      }
    }
    argmax.push(bestIdx)
    probs.push(bestProb)
  }

  // Collapse consecutive + remove blanks
  const chars: string[] = []
  const charProbs: number[] = []
  let prev = -1
  for (let t = 0; t < T; t++) {
    const c = argmax[t]
    if (c !== prev && c < BLANK_INDEX) {
      chars.push(VOCAB[c])
      charProbs.push(probs[t])
    }
    prev = c
  }

  const text = chars.join('')
  const confidence =
    charProbs.length > 0 ? charProbs.reduce((a, b) => a + b, 0) / charProbs.length : 0

  return { text, confidence }
}

/**
 * Recognize image via Custom CNN ONNX.
 * Drop-in replacement untuk recognizeBlob di lib/ocr.ts (Tesseract version).
 */
export async function recognizeBlobCNN(blob: Blob): Promise<OCRResult> {
  const start = performance.now()

  const session = await getSession()
  const inputData = await preprocessImage(blob)
  const inputTensor = new ort.Tensor('float32', inputData, [1, IMG_HEIGHT, IMG_WIDTH, 1])

  const inputName = session.inputNames[0]
  const output = await session.run({ [inputName]: inputTensor })
  const outputName = session.outputNames[0]
  const logits = output[outputName].data as Float32Array
  const dims = output[outputName].dims  // [1, T, classes]
  const T = dims[1] as number
  const C = dims[2] as number

  const { text, confidence } = ctcDecode(logits, T, C)

  const durationMs = performance.now() - start
  console.debug('[OCR-CNN] result:', { text, confidence, durationMs })

  return { text, confidence, durationMs }
}

/** Preload model in background (mis. saat splash screen). */
export async function preloadCNN(): Promise<void> {
  await getSession()
}
```

---

## Step 5: Switch dari Tesseract ke CNN

Edit `poc/src/pages/CaptureOCR.tsx`:

```typescript
// SEBELUM
import { recognizeBlob, parseBerat, preloadOCR } from '@/lib/ocr'

// SESUDAH
import { recognizeBlobCNN as recognizeBlob, preloadCNN as preloadOCR } from '@/lib/ocr-cnn'
import { parseBerat } from '@/lib/ocr'  // tetap pakai parser yang sama
```

Sisanya tidak perlu diubah — `recognizeBlobCNN` punya signature identik dengan `recognizeBlob`.

### Update Settings (Optional)

Jika ingin user bisa switch antara CNN ↔ Tesseract untuk A/B test:

`poc/src/store/settings.ts`:

```typescript
export type OCREngine = 'cnn' | 'tesseract'

interface SettingsState {
  // ... existing
  ocrEngine: OCREngine
  setOcrEngine: (e: OCREngine) => void
}

// Default: 'cnn' (production), fallback 'tesseract' untuk debug
ocrEngine: 'cnn',
setOcrEngine: (e) => set({ ocrEngine: e }),
```

`poc/src/pages/CaptureOCR.tsx`:

```typescript
const ocrEngine = useSettings((s) => s.ocrEngine)

const recognize = ocrEngine === 'cnn' ? recognizeBlobCNN : recognizeBlobTesseract
const result = await recognize(blob)
```

---

## Step 6: Build & Test Lokal

```bash
cd poc/
npm run build
npm run preview  # serve production build di localhost
```

Test scenario:
1. Buka di Chrome (atau via ngrok untuk mobile test)
2. Login → Mulai Transaksi
3. Capture display
4. Lihat console log `[OCR-CNN] result: {...}`
5. Compare hasil vs Tesseract (jika masih punya)

**Expected:**
- Inference time: 30-100ms (vs 1500ms untuk Tesseract)
- Confidence: 90-99% (vs 40-80% untuk Tesseract)
- Akurasi: ≥80% pada display target

---

## Step 7: Deploy ke Netlify

```bash
cd poc/
npm run build
# Drag dist/ ke netlify.app/drop
# atau:
netlify deploy --build --prod
```

PWA Service Worker akan precache model.onnx (45 MB) saat first load. Subsequent: instant.

---

## A/B Testing Strategy (untuk Multi-Version)

Jika train v2 model dan ingin compare dengan v1 production:

```
poc/public/models/
├── cnn_v1.onnx         (current production)
└── cnn_v2.onnx         (kandidat baru)
```

`ocr-cnn.ts` — paramaterize model path:

```typescript
export async function recognizeBlobCNN(
  blob: Blob,
  modelVersion: 'v1' | 'v2' = 'v1',
): Promise<OCRResult> {
  const session = await getSession(`/models/cnn_${modelVersion}.onnx`)
  // ... rest sama
}
```

**Production rollout:**
1. Deploy v2 dengan flag `useV2 = false` (semua user pakai v1)
2. Toggle untuk subset operator: `useV2 = (operator.code in BETA_OPERATORS)`
3. Monitor 1-2 minggu: compare success rate, confidence distribution
4. Jika v2 ≥ v1 → promote v2 sebagai default
5. Setelah 1 bulan stabil → hapus v1 file

---

## Performance Benchmarks (Expected)

| Metric | Tesseract.js (POC awal) | Custom CNN | Improvement |
|---|---|---|---|
| Full-string accuracy | 0% (5/5 wrong) | ≥ 80% | ∞ |
| Confidence reliability | Tidak konsisten (76% wrong) | Reliable indicator | ✓ |
| Inference time | 1500-3000ms | 30-100ms | **30× faster** |
| Model size | 11 MB (ssd) | 45 MB | 4× larger |
| First load impact | +11 MB precache | +45 MB precache | Acceptable |

---

## Troubleshooting Deployment

| Issue | Solution |
|---|---|
| Model tidak load | Cek path `/models/cnn_v1.onnx` di Network tab |
| `onnxruntime is not defined` | `npm install onnxruntime-web` lupa |
| WASM not loading | Tambah `Cross-Origin-Opener-Policy: same-origin` di Netlify headers |
| Inference slow di mobile | Pakai `executionProviders: ['webgl']` (jika support) |
| Output text kosong | Check vocab match antara training & inference (`config.py` vs `ocr-cnn.ts`) |
| Confidence selalu rendah | Model belum trained cukup, atau preprocessing mismatch |

### Network Headers untuk Netlify

`poc/netlify.toml` — untuk WASM threading support:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Cross-Origin-Embedder-Policy = "require-corp"
    Cross-Origin-Opener-Policy = "same-origin"
```

---

## Verifikasi Preprocessing Match

**CRITICAL:** Preprocessing di `ocr-cnn.ts` (browser) HARUS match di `train.py:load_image()` (Python). Perbedaan kecil → akurasi turun drastis.

Validasi cepat:
```bash
# Di Python
python predict.py --model models/cnn_v1/best.h5 --image samples/test01.jpg
# Hasil: "3.895" confidence 0.95

# Di POC browser, sample image yang sama
# Console log: [OCR-CNN] result: { text: "3.895", confidence: 0.94, ... }
```

Jika hasil berbeda significantly → ada preprocessing mismatch. Common issues:
- Wrong color space (RGB vs grayscale conversion formula)
- Different resize algorithm (cv2 INTER_AREA vs canvas drawImage)
- Different padding/cropping
- Different normalization (0-1 vs 0-255)

---

## Update CaptureOCR.tsx Lengkap (Final State)

Untuk reference, ini contoh final `handleShutter`:

```typescript
const handleShutter = async () => {
  if (!videoRef.current || busy) return
  setBusy(true)

  try {
    const N = multiFrameCount  // dari settings, default 3
    const frames: Blob[] = []

    for (let i = 0; i < N; i++) {
      setStatusText(`CAPTURING ${i + 1}/${N}...`)
      const blob = await captureROIToBlob(videoRef.current, {
        widthRatio: ROI_WIDTH_RATIO,
        heightRatio: ROI_HEIGHT_RATIO,
        quality: 0.92,
      })
      frames.push(blob)
      if (i < N - 1) await sleep(350)
    }

    setStatusText(`OCR INFERENCE ${N} frames...`)

    // CNN inference (replace Tesseract)
    const results = await Promise.all(
      frames.map(async (b, idx) => {
        const r = await recognizeBlobCNN(b)
        return { idx, blob: b, result: r, berat: parseBerat(r.text) }
      }),
    )

    const valid = results.filter((r) => r.berat !== null)
    if (valid.length === 0) {
      setStatusText('OCR GAGAL · ULANGI')
      setBusy(false)
      return
    }

    valid.sort((a, b) => b.result.confidence - a.result.confidence)
    const best = valid[0]

    const blobId = await saveImageBlob(best.blob)
    setDisplay(blobId)
    setOCR(best.berat!, best.result.confidence, nowISO(), best.result.text, valid.length)

    navigate('/capture/review')
  } catch (e) {
    console.error(e)
    setStatusText('ERROR · ' + (e instanceof Error ? e.message : 'unknown'))
    setBusy(false)
  }
}
```

---

## Production Checklist

Sebelum production deploy:

- [ ] Model trained dengan ≥80% test accuracy (verify `evaluation_report.json`)
- [ ] ONNX validation PASS (`onnx_validation.json` max diff < 1e-4)
- [ ] Model file di `poc/public/models/cnn_v1.onnx`
- [ ] `npm install onnxruntime-web` done
- [ ] `vite.config.ts` updated (workbox + optimizeDeps)
- [ ] `ocr-cnn.ts` created
- [ ] CaptureOCR.tsx switched dari Tesseract → CNN
- [ ] Build sukses (`npm run build`)
- [ ] Smoke test di localhost passed
- [ ] Mobile test via ngrok/Netlify deploy passed
- [ ] Backend ready untuk receive transaksi (jika MVP, bukan POC)
- [ ] Monitoring & error logging in place
- [ ] Rollback plan tersedia (revert ke Tesseract via flag jika emergency)

---

## Lihat Juga

- 📄 [TRAINING.md](./TRAINING.md) — Cara train model
- 📄 [README.md](./README.md) — Overview & architecture
- 📁 [`../poc/SPEC.md`](../poc/SPEC.md) — POC validation report
- 🔗 [ONNX Runtime Web docs](https://onnxruntime.ai/docs/api/js/) — official reference
- 🔗 [PWA + WASM threading](https://developer.chrome.com/blog/enabling-shared-array-buffer/)
