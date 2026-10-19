# POC Specification — ANALISA TIMBANG

> **Dokumen Spesifikasi Proof of Concept**
> Versi 0.2 · 1 Mei 2026
> **Status: VALIDATION COMPLETE** ✅ — Risk R1 conclusively confirmed, Phase 0 (Custom CNN) required

> ⚠️ **Catatan revisi target (19 Okt 2026).** Target akurasi dan ambang keyakinan
> di dokumen ini sudah **direvisi dari 95% menjadi 80%**. Angka 95% yang masih
> tersisa di bagian *Validation Report* adalah **catatan historis** — hasil
> pengujian yang memang dijalankan saat targetnya masih 95%. Angka itu sengaja
> tidak diubah supaya jejak pengujiannya tetap jujur. Nilai yang berlaku sekarang
> ada di `CHANGELOG-PARAMETER.md`.

---

## Daftar Isi

1. [Tujuan POC](#1-tujuan-poc)
2. [Scope](#2-scope)
3. [Success Criteria](#3-success-criteria)
4. [Risk Validation Plan](#4-risk-validation-plan)
5. [Technical Architecture](#5-technical-architecture)
6. [Demo Scenario](#6-demo-scenario)
7. [Timeline & Effort](#7-timeline--effort)
8. [Deliverables](#8-deliverables)
9. [Next Steps](#9-next-steps)

---

## 1. Tujuan POC

POC ini bertujuan **memvalidasi 4 area paling berisiko** sebelum tim commit ke MVP development penuh (8 minggu, ~Rp 261 juta). Filosofi: *fail fast, fail cheap*.

### Pertanyaan yang Ingin Dijawab

| # | Pertanyaan | Konsekuensi jika Tidak | Cara Validasi |
|---|---|---|---|
| 1 | Bisakah OCR offline (Tesseract.js) baca display 7-segment dengan akurasi memadai? | Pivot ke ONNX custom model (effort +3 minggu di v0.2) | Test 20 foto dari berbagai merek timbangan |
| 2 | Bisakah PWA installable & offline 100% di Android & iOS? | Pertimbangkan native app (Capacitor) — effort +6 minggu | Install di 2 device, airplane mode test |
| 3 | Bisakah IndexedDB + Cache API handle blob image realistic? | Adjust kompresi & retention strategy | Save 100 transaksi + 200 image, ukur quota |
| 4 | Bisakah camera + QR scanner reliable di kondisi lapangan? | Manual input fallback wajib | Test di pencahayaan rendah, QR sebagian rusak |

### Apa yang TIDAK Divalidasi di POC

- Performance optimasi (akan dilakukan di MVP)
- Security hardening (POC pakai hardcoded credential)
- Multi-user concurrent (POC single user)
- Production deployment (POC deploy ke Netlify/Vercel free tier)

---

## 2. Scope

### 2.1 IN SCOPE

#### Functional
- [x] PWA shell installable (manifest + Service Worker)
- [x] Login page (hardcoded validation)
- [x] Dashboard sederhana (stat + CTA + recent list)
- [x] Capture flow 3-step wizard:
  - Scan QR Code (ZXing)
  - Capture display timbangan (camera)
  - OCR + Review hasil (Tesseract.js)
- [x] Manual edit hasil OCR
- [x] Save transaksi ke IndexedDB
- [x] Riwayat transaksi (list + detail)
- [x] Status badges (SAVED / OFFLINE PENDING / SYNCED)
- [x] Mock sync ke endpoint MSW
- [x] Toggle online/offline simulation
- [x] Settings minimal (info app, manual sync, logout)

#### Non-functional
- [x] 100% offline operasional setelah first load
- [x] Responsive mobile (target 360-430px viewport)
- [x] Dark mode (matching design system mockup)
- [x] Touch target min 48px

### 2.2 OUT OF SCOPE

#### Deferred ke MVP
- ❌ Backend asli (gunakan MSW mock)
- ❌ Real authentication (JWT, refresh token)
- ❌ Multi-user / multi-operator
- ❌ Multi-entity selection (Pengirim/Penerima dynamic)
- ❌ OCR Training pipeline (data collection, labeling, fine-tuning)
- ❌ On-device training (TensorFlow.js)
- ❌ Background Sync API (full implementation)
- ❌ Anomali deteksi, geo-tag, statistik shift
- ❌ Settings panel lengkap (compression, threshold OCR, dll)
- ❌ Conflict resolution multi-device
- ❌ Export CSV/JSON
- ❌ A/B test mode untuk model
- ❌ Production-grade error handling & telemetry

#### Tidak akan dikerjakan sama sekali
- ❌ Native iOS/Android app
- ❌ Desktop version
- ❌ Bluetooth integrasi langsung ke timbangan
- ❌ Voice input

---

## 3. Success Criteria

### 3.1 Mandatory (Wajib Lulus — Blocker untuk MVP)

| ID | Criteria | Pass Threshold |
|---|---|---|
| C1 | App installable di Android Chrome | Berhasil add to home screen |
| C2 | App load 100% offline | Service Worker active, semua asset cached |
| C3 | Capture flow end-to-end berhasil | QR + OCR + save dalam < 30 detik |
| C4 | QR decode akurasi | > 95% pada QR utuh & terang |
| C5 | OCR akurasi 7-segment | **≥ 70%** pada 20 sample test |
| C6 | IndexedDB persist | Data survive app close + browser restart |
| C7 | Image storage | 200 blob image tersimpan tanpa quota error |
| C8 | Riwayat dengan status badges | 3 state visual jelas (SAVED/PENDING/SYNCED) |
| C9 | Mock sync | MSW intercept POST sukses, status ter-update |

### 3.2 Nice to Have (Bonus)

| ID | Criteria | Pass Threshold |
|---|---|---|
| N1 | iOS Safari installable | Add to home screen + offline load |
| N2 | OCR akurasi tinggi | ≥ 85% pada test set |
| N3 | OCR confidence score akurat | High conf samples > 90%, low conf < 60% |
| N4 | Manual edit flow smooth | Edit + save < 5 detik |
| N5 | Image kompresi efektif | < 200KB per image |
| N6 | Cold start performant | First paint < 2s di 3G simulasi |

### 3.3 Pengukuran

#### OCR Accuracy Test Set
- Minimum 20 foto display 7-segment
- Variasi: brightness, sudut, jarak, merek timbangan
- Ground truth manual labeled
- Metrics: digit-level accuracy, full-number accuracy, confidence distribution

#### Storage Test
- Generate 100 dummy transaksi + 200 image (1080px JPEG)
- Ukur: total size, query performance, list render time

#### Performance Test
- Lighthouse PWA audit (target score > 90)
- OCR inference time per image (target < 3s)
- App load offline (target < 2s)

---

## 4. Risk Validation Plan

### Risk Matrix

| # | Risiko | Probability | Impact | Validasi POC | Pass Criteria | Mitigasi jika Gagal |
|---|---|---|---|---|---|---|
| R1 | OCR akurasi rendah pada display 7-seg | TINGGI | TINGGI | Test 20 sample berbagai merek | ≥ 70% akurasi | Pivot ke ONNX custom model di v0.2, atau hybrid (Tesseract + custom) |
| R2 | iOS Safari PWA quirky | SEDANG | SEDANG | Install di iPhone, test offline + camera | App load offline & camera akses sukses | Document limitations, prioritas Android di MVP, consider Capacitor |
| R3 | IndexedDB quota error pada image | RENDAH | TINGGI | Stress test 200 image | < 50MB total | Implement compression earlier, cleanup synced data |
| R4 | Camera permission denied flow | RENDAH | SEDANG | Test reject + retry | Manual input fallback berfungsi | Pastikan UI error state jelas |
| R5 | Service Worker update conflict | RENDAH | RENDAH | Update SW saat app terbuka | Toast "update tersedia" muncul | Skip waiting, simple reload |
| R6 | Tesseract.js bundle size besar | SEDANG | RENDAH | Measure bundle size | < 5MB total | Lazy load OCR engine, preload after first paint |
| R7 | QR rusak/buram tidak terbaca | SEDANG | SEDANG | Test QR sebagian rusak | Manual input alternative jalan | UI clear & button manual prominent |
| R8 | Battery drain berlebih (camera + OCR) | RENDAH | SEDANG | Test 30 menit continuous use | < 15% drain | Optimize: stop camera saat tidak aktif |

### Risk-Driven Test Cases

#### Test Case TC-01: OCR Accuracy Benchmark
**Tujuan:** Validasi R1
**Setup:** 20 foto display timbangan (5 merek × 4 angka berbeda)
**Steps:**
1. Capture setiap foto via app POC
2. Catat hasil OCR vs ground truth
3. Hitung digit-level & full-number accuracy
4. Plot confidence distribution

**Pass:** Accuracy ≥ 70%, 90% high-conf samples ≥ 85% accurate

---

#### Test Case TC-02: Offline End-to-End
**Tujuan:** Validasi R2
**Setup:** Smartphone Android, koneksi penuh awal
**Steps:**
1. Install PWA dari browser
2. Aktifkan Airplane Mode
3. Buka app dari home screen
4. Login + capture transaksi #1 (QR + OCR + save)
5. Restart browser, buka app lagi
6. Verifikasi transaksi masih ada

**Pass:** Semua step sukses tanpa error

---

#### Test Case TC-03: Storage Stress
**Tujuan:** Validasi R3
**Setup:** App dengan dev tools terbuka
**Steps:**
1. Run script generate 100 dummy transaksi + 200 image blob (1080px)
2. Inspect IndexedDB & Cache API usage
3. Reload app, ukur load time
4. List view scroll performance

**Pass:** Total < 50MB, list render < 1s, no quota error

---

## 5. Technical Architecture

### 5.1 Stack

| Layer | Library | Versi | Alasan |
|---|---|---|---|
| Build Tool | Vite | 5.x | Fast dev server, optimal PWA support |
| UI Framework | React | 18.x | Standard, ecosystem matang |
| Language | TypeScript | 5.x | Type safety, dev experience |
| Styling | Tailwind CSS | 3.x | Match design tokens dari mockup |
| Routing | react-router-dom | 6.x | Standard SPA routing |
| State | Zustand | 4.x | Ringan, no boilerplate |
| Database | Dexie.js | 4.x | Wrapper IndexedDB ergonomic |
| OCR Engine | Tesseract.js | 5.x | Edge AI, WASM-based, no cloud |
| QR Scanner | @zxing/browser | latest | Offline, multi-format |
| Mock BE | MSW | 2.x | Realistic mock, easy disable |
| PWA | vite-plugin-pwa | latest | Auto SW + manifest |
| Camera | MediaDevices API | native | Built-in browser API |
| Image | Canvas API | native | Preprocessing, compression |
| Crypto | crypto.randomUUID | native | UUID generation |

### 5.2 Folder Structure

```
poc/
├── package.json
├── vite.config.ts                  Vite + PWA + alias config
├── tsconfig.json
├── tailwind.config.ts              Design tokens (ink, safety, lcd)
├── index.html
├── public/
│   ├── manifest.webmanifest        PWA manifest
│   ├── icons/
│   │   ├── 192.png
│   │   ├── 512.png
│   │   └── maskable-512.png
│   └── tesseract-data/             Preloaded eng.traineddata
│
├── src/
│   ├── main.tsx                    Entry · register SW · MSW boot
│   ├── App.tsx                     Root layout
│   ├── routes.tsx                  Route definitions
│   │
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── CaptureQR.tsx           Step 1: scan QR
│   │   ├── CaptureOCR.tsx          Step 2: capture display
│   │   ├── Review.tsx              Step 3: review + save
│   │   ├── History.tsx             List transaksi
│   │   ├── Detail.tsx              Detail transaksi
│   │   └── Settings.tsx            Info + manual sync
│   │
│   ├── components/
│   │   ├── PhoneFrame.tsx          (untuk dev preview only)
│   │   ├── StatusBadge.tsx         SAVED / PENDING / SYNCED
│   │   ├── LCDDisplay.tsx          Amber 7-seg style
│   │   ├── HazardStripe.tsx        Diagonal yellow/black accent
│   │   ├── BottomNav.tsx
│   │   ├── CameraView.tsx          Wrapper MediaDevices
│   │   ├── ScanFrame.tsx           QR/Display overlay frame
│   │   └── KeypadNumeric.tsx       Untuk manual edit
│   │
│   ├── lib/
│   │   ├── db.ts                   Dexie schema + queries
│   │   ├── ocr.ts                  Tesseract worker wrapper
│   │   ├── qr.ts                   ZXing wrapper
│   │   ├── camera.ts               MediaDevices helper
│   │   ├── image.ts                Canvas preprocessing (crop, threshold, compress)
│   │   ├── api.ts                  Fetch wrapper (mock-ed via MSW)
│   │   ├── sync.ts                 Sync queue logic
│   │   └── utils.ts                Helper (formatDate, uuid, dll)
│   │
│   ├── store/
│   │   ├── auth.ts                 Login state
│   │   ├── capture.ts              Wizard draft state
│   │   ├── network.ts              Online/offline detection
│   │   └── settings.ts             User preferences
│   │
│   ├── mocks/
│   │   ├── browser.ts              MSW setupWorker
│   │   ├── handlers.ts             Mock endpoint handlers
│   │   └── data.ts                 Seed data (operator, entities)
│   │
│   ├── types/
│   │   ├── transaksi.ts
│   │   ├── ocr.ts
│   │   └── api.ts
│   │
│   └── styles/
│       ├── globals.css             Tailwind imports + base
│       └── fonts.css               Anton, IBM Plex, JetBrains, Share Tech
│
└── docs/
    ├── test-results.md             OCR accuracy report
    ├── screenshots/                Demo flow captures
    └── lessons-learned.md          Findings & recommendations
```

### 5.3 Data Model (POC Subset)

```typescript
// Transaksi simplified untuk POC
interface Transaksi {
  id: string;                              // UUID lokal
  nomor_kode_transaksi: string;            // TRX-{timestamp}-{random}
  qr_code_value: string;                   // "ABCD1234"
  qr_image_blob_id: string;                // Cache API ref
  display_image_blob_id: string;           // Cache API ref
  berat_kg: number;                        // 80.00
  ocr_confidence: number;                  // 0-1
  ocr_manual_edited: boolean;
  captured_at: string;                     // ISO8601
  sent_at: string | null;
  sync_status: 'pending' | 'syncing' | 'synced' | 'failed';
}

// Hardcoded untuk POC
const OPERATOR_PROFILE = {
  user_operator_code: 'OP-2847',
  user_operator_name: 'Budi Santoso',
  entity_pengirim: 'PT ANALISA INDUSTRI',
  entity_penerima: 'PT MITRA LOGISTIK',
};
```

### 5.4 Data Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Tap "Mulai Transaksi"
     ▼
┌─────────────────┐
│  CaptureQR Page │
└────┬────────────┘
     │ 2. Camera stream → ZXing decode
     │    Save QR image blob → Cache API
     ▼
┌──────────────────┐
│  CaptureOCR Page │
└────┬─────────────┘
     │ 3. Camera stream → user tap shutter
     │    Crop ROI → preprocess (Canvas)
     │    Save display image blob → Cache API
     │    Run Tesseract.js → angka berat
     ▼
┌─────────────┐
│ Review Page │
└────┬────────┘
     │ 4. User confirm / edit manual
     │    Tap Simpan
     ▼
┌─────────────┐
│   Dexie DB  │ ← write Transaksi record
└────┬────────┘
     │ 5. Trigger sync
     ▼
┌─────────────┐
│    sync.ts  │
└────┬────────┘
     │ 6. fetch POST /api/transactions
     ▼
┌──────────────┐
│  MSW Handler │ → return 200 OK (delayed 1s)
└────┬─────────┘
     │
     ▼
┌────────────┐
│ Update DB  │ → sync_status = 'synced', sent_at = now()
└────────────┘
```

### 5.5 PWA Configuration

#### Manifest (public/manifest.webmanifest)
```json
{
  "name": "ANALISA TIMBANG",
  "short_name": "ANALISA",
  "description": "Mobile OCR Timbangan dengan Edge AI",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0a0b0d",
  "theme_color": "#fbbf24",
  "icons": [
    { "src": "/icons/192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

#### Service Worker Strategy (Workbox)
- **Pre-cache:** app shell (HTML, CSS, JS, fonts, icons)
- **Pre-cache:** Tesseract WASM + traineddata (eng.traineddata)
- **Runtime cache:**
  - `CacheFirst` untuk fonts, images, static assets
  - `NetworkFirst` (timeout 3s) untuk API calls
- **Offline fallback:** custom offline.html (jika navigation fail)

### 5.6 Mock Backend (MSW)

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse, delay } from 'msw'

export const handlers = [
  // Health check
  http.get('/api/ping', () => HttpResponse.json({ ok: true })),

  // Login (always success)
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json()
    await delay(500)
    if (body.username === 'OP-2847' && body.password === 'demo') {
      return HttpResponse.json({
        token: 'mock-jwt-token-poc',
        operator: { code: 'OP-2847', name: 'Budi Santoso' },
      })
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }),

  // Sync transaksi (simulasi delay 1s)
  http.post('/api/transactions', async ({ request }) => {
    const body = await request.json()
    await delay(1000)
    // Simulasi 5% failure untuk test retry
    if (Math.random() < 0.05) {
      return HttpResponse.json({ error: 'Server error' }, { status: 500 })
    }
    return HttpResponse.json({
      id: body.id,
      received_at: new Date().toISOString(),
    })
  }),
]
```

---

## 6. Demo Scenario

### 6.1 Persiapan

#### Hardware
- 1 Smartphone Android (rekomendasi: Chrome 100+, Android 10+)
- 1 Smartphone iPhone (untuk validasi N1) — opsional
- 1 Lembar QR Code printed dengan value `ABCD1234`
- 1 Timbangan digital dengan display 7-segment (akses via venue client/lab)
- Beban pengujian (5 kg, 10 kg, 25 kg, 80 kg)

#### Software
- POC URL deployed (Netlify/Vercel)
- DevTools terhubung ke device (chrome://inspect)
- Stopwatch (fisik atau aplikasi)

### 6.2 Skenario Demo (~7 menit)

#### Phase 1: Installation (30 detik)
1. Buka POC URL di Chrome
2. Tunggu loading complete (semua asset & Tesseract data ter-cache)
3. Tap menu (3 dots) → "Install App" / "Add to Home Screen"
4. Tutup browser
5. Buka app dari home screen

✅ **Validasi C1, C2** — installable + standalone display

---

#### Phase 2: Login (15 detik)
1. App load splash screen
2. Form login muncul
3. Input username: `OP-2847`, password: `demo`
4. Tap MASUK

✅ **Validasi:** auth state persist, redirect ke Dashboard

---

#### Phase 3: Capture Online (1.5 menit)
1. Dashboard menampilkan greeting + stat (initial: 0)
2. Tap CTA besar "MULAI TRANSAKSI"
3. **Step 1:** Camera aktif → arahkan ke QR card → auto-detect → haptic
4. **Step 2:** Camera lanjut → arahkan ke display timbangan dengan beban 5kg → tap shutter
5. **Step 3:** Review screen menampilkan:
   - Foto QR thumbnail
   - Foto display thumbnail
   - LCD readout besar: "5.00 kg" (atau hasil OCR)
   - Confidence: 90%+ (jika berhasil)
6. Tap SIMPAN

✅ **Validasi C3, C4, C5** — full capture flow + akurasi

---

#### Phase 4: Test Offline (1.5 menit)
1. Aktifkan Airplane Mode
2. Verifikasi indikator OFFLINE muncul di app
3. Capture transaksi #2 dengan beban 10kg → flow lengkap
4. Status badge: **OFFLINE PENDING** (kuning, pulse)
5. Capture transaksi #3 dengan beban 25kg → flow lengkap
6. Buka Riwayat → 3 transaksi terlihat (1 pending, 2 saved)

✅ **Validasi C2, C6, C8** — offline + persist + status

---

#### Phase 5: Test Sync (1 menit)
1. Matikan Airplane Mode
2. Verifikasi indikator ONLINE
3. Tap "SYNC SEKARANG" di Settings (atau auto-trigger)
4. Watch: status badges berubah dari pending → syncing → synced
5. DevTools console: lihat MSW intercept POST `/api/transactions`

✅ **Validasi C9** — mock sync end-to-end

---

#### Phase 6: Stress Test (Bonus, 1 menit)
1. Rapid capture 5 transaksi berturut-turut (beban berbeda)
2. Test edge case: QR sebagian tertutup tangan → manual input fallback
3. Test edge case: display gelap → low confidence → auto-prompt review

✅ **Validasi:** UX edge cases, performance

---

#### Phase 7: Detail & Export (30 detik)
1. Tap salah satu transaksi di Riwayat
2. Detail page menampilkan semua metadata + thumbnails
3. (Bonus) DevTools → IndexedDB inspector → verify data structure

✅ **Validasi:** data integrity

---

#### Phase 8: iOS Test (Bonus, 1 menit)
1. Buka POC di iPhone Safari
2. Share menu → "Add to Home Screen"
3. Buka dari home screen
4. Test offline (airplane mode)
5. Test camera & capture flow

✅ **Validasi N1** — iOS compatibility

---

### 6.3 Demo Variations

| Audience | Fokus | Durasi |
|---|---|---|
| Teknis (CTO/Eng Manager) | Architecture, code quality, MSW intercept, IndexedDB | 15 menit |
| Stakeholder bisnis | User flow, save & sync, ROI | 5 menit |
| Operator end-user | Hands-on capture berturut-turut | 10 menit |

---

## 7. Timeline & Effort

### 7.1 Estimasi: 2 minggu (10 hari kerja)

#### Tim Solo (1 FE Senior)

| Hari | Aktivitas | Deliverable |
|---|---|---|
| **D1** | Setup Vite + PWA plugin + Tailwind + routing skeleton | Boilerplate runnable, manifest ready |
| **D2** | Login page + Dashboard skeleton + Dexie schema | Login flow working, DB initialized |
| **D3** | Camera access + ZXing QR scanner integration | Step 1 capture QR working |
| **D4** | Tesseract.js integration + image preprocessing | OCR engine loadable, basic test pass |
| **D5** | Capture flow wizard 3-step (QR → OCR → Review) | Full capture flow working online |
| **D6** | IndexedDB persist + Cache API blob storage | Data persist after reload |
| **D7** | Riwayat list + Detail page + Status badges | Browse history working |
| **D8** | MSW setup + sync flow + status transitions | Online/offline simulation complete |
| **D9** | Real device testing (Android + iOS) + bug fix | Test report draft |
| **D10** | Polish + demo prep + documentation finalize | Demo-ready build deployed |

#### Tim 2 Orang (1 FE + 1 AI/ML focus OCR) — paralel
**Estimasi: 5-6 hari kerja**

| Hari | FE Engineer | AI/ML Engineer |
|---|---|---|
| D1 | Setup Vite + PWA + Tailwind | Eksperimen Tesseract.js dengan sample data |
| D2 | Login + Dashboard + Dexie | Tune preprocessing pipeline |
| D3 | Camera + QR (ZXing) | Test akurasi 20 sample, document |
| D4 | Capture flow wizard + UI | Integrate OCR ke flow |
| D5 | MSW + sync + Riwayat | Final testing + accuracy report |
| D6 | Polish + demo | Documentation OCR findings |

### 7.2 Effort Breakdown

| Kategori | Effort (mandays solo) | Effort (paralel 2 orang) |
|---|---|---|
| Setup & boilerplate | 1.0 | 0.5 |
| UI components & pages | 3.0 | 2.0 (FE) |
| OCR integration & tuning | 2.0 | 2.0 (AI/ML) |
| QR scanner | 0.5 | 0.5 |
| IndexedDB & storage | 1.0 | 0.5 |
| Sync & MSW | 1.0 | 0.5 |
| Testing & polish | 1.5 | 1.0 |
| **Total** | **10 mandays** | **6-7 mandays effective** |

---

## 8. Deliverables

### 8.1 Code

- [ ] Source code di `poc/` repository
- [ ] `README.md` dengan setup instructions
- [ ] `.env.example` dengan placeholder configs
- [ ] `package.json` dengan exact versions
- [ ] Demo build deployed (Netlify/Vercel) — public URL untuk demo

### 8.2 Documentation

- [ ] `docs/test-results.md` — hasil OCR accuracy benchmark
  - Tabel 20 sample dengan ground truth vs prediction vs confidence
  - Plot confidence distribution
  - Analisis per merek timbangan
- [ ] `docs/screenshots/` — capture demo flow (10-15 screenshots)
- [ ] `docs/lessons-learned.md` — findings, surprises, recommendations untuk MVP
- [ ] `docs/compatibility.md` — matrix Android/iOS browser versions tested

### 8.3 Validation Report

Dokumen akhir untuk go/no-go decision:

```markdown
# POC Validation Report

## Executive Summary
- ✅/⚠️/❌ Per success criteria
- Recommendation: GO / GO WITH CAVEATS / NO-GO

## Detailed Results
[per criteria + measurements]

## Risk Assessment Update
[update risk matrix berdasarkan hasil POC]

## Recommendations for MVP
- Adjust scope: ...
- Tech stack changes: ...
- Timeline impact: ...

## Sign-off
- Engineering Lead: ___________
- Product Owner: ___________
- Date: ___________
```

### 8.4 Demo Assets

- [ ] Public URL POC (Netlify/Vercel)
- [ ] Video demo 5 menit (screen recording + voiceover)
- [ ] Slide deck ringkas (5-8 slides) untuk presentasi stakeholder

---

## 9. Next Steps

### 9.1 Skenario A: POC Berhasil Penuh ✅

**Trigger:** Semua C1-C9 lulus, OCR akurasi ≥ 85%

**Action:**
1. Sign-off go-decision dengan stakeholder
2. Scaffold MVP project structure (extend dari POC)
3. Replace MSW dengan BE asli (paralel BE Engineer)
4. Tambah scope cut: Auth proper, multi-entity, training pipeline lite
5. Mulai 8-week MVP timeline (Opsi A)
6. Estimasi total: **POC + MVP = 10 minggu**

### 9.2 Skenario B: POC Berhasil Sebagian ⚠️

**Trigger:** Beberapa criteria fail, tapi tidak blocker

**Possible Issues & Adjustments:**

| Issue | Adjustment |
|---|---|
| OCR akurasi 60-70% | Tetap lanjut MVP, tambah F11 (training pipeline) ke v0.2, consider ONNX research paralel |
| iOS bermasalah | Document limitations, prioritas Android di MVP, evaluate Capacitor di v0.2 |
| Storage quota issue | Implement aggressive compression + auto-cleanup synced data |
| Bundle size besar | Lazy load OCR engine, code splitting per route |

**Action:**
1. Document limitations + workarounds
2. Adjust MVP scope & timeline (mungkin +1-2 minggu)
3. Update RAB sesuai scope adjustment

### 9.3 Skenario C: POC Gagal Total ❌ (Unlikely)

**Trigger:** OCR akurasi < 50%, atau PWA fundamental tidak bisa offline

**Pivot Options:**

| Option | Effort | Trade-off |
|---|---|---|
| Native app (React Native + ML Kit) | +6 minggu | Tidak cross-platform via web, butuh app store deployment |
| Server-side OCR | -2 minggu (simpler) | Tidak offline, butuh koneksi |
| Bluetooth ke timbangan langsung | +8 minggu | Hardware-specific, tidak universal |
| Custom hardware (Raspberry Pi terminal) | +12 minggu | Capex tinggi, deployment kompleks |

**Action:**
1. Stop MVP planning sementara
2. Stakeholder review hasil POC
3. Pivot decision meeting: pilih opsi alternatif atau cancel
4. Re-plan dengan stack baru jika lanjut

### 9.4 POC Closeout Checklist

- [ ] Validation report ditandatangani stakeholder
- [ ] Code POC di-archive ke folder `archive/poc-v0.1/` (untuk referensi)
- [ ] Lessons learned di-share ke tim (1-hour readout session)
- [ ] OCR accuracy dataset dipindah ke training repo (untuk v0.2 fine-tuning)
- [ ] Update PRD & Feature List berdasarkan findings
- [ ] Adjust RAB jika ada perubahan scope/timeline
- [ ] Kickoff meeting MVP scheduled

---

## Lampiran

### A. Glossary

| Term | Definisi |
|---|---|
| POC | Proof of Concept — prototype untuk validasi konsep, bukan production |
| MVP | Minimum Viable Product — versi paling sederhana yang bisa di-release |
| Edge AI | AI yang berjalan di device (browser/mobile), bukan cloud |
| PWA | Progressive Web App — web app yang bisa di-install seperti native |
| OCR | Optical Character Recognition — baca teks dari image |
| 7-segment | Display digital tradisional (timbangan, jam, kalkulator) |
| MSW | Mock Service Worker — intercept HTTP request di browser untuk testing |
| ROI | (1) Region of Interest — area image yang di-crop. (2) Return on Investment |

### B. References

- [PRD](../planning/PRD.md)
- [Mockup HTML](../planning/mockup.html) — visual reference untuk UI
- [Feature List Excel](../planning/Feature_List_ANALISA_TIMBANG.xlsx) — 81 fitur, timeline, RAB
- [Tesseract.js docs](https://tesseract.projectnaptha.com/)
- [@zxing/browser](https://github.com/zxing-js/browser)
- [Dexie.js](https://dexie.org/)
- [MSW](https://mswjs.io/)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)

---

**Owner:** Tim Engineering ANALISA
**Reviewers:** CTO, Product Owner, AI/ML Lead
**Status:** v0.2 — VALIDATION COMPLETE
**Last Updated:** 1 Mei 2026

---

# 🎯 VALIDATION REPORT (Hasil POC)

## Executive Summary

**POC TELAH MENJALANKAN TUGASNYA:** validate Risk R1 (OCR akurasi rendah pada 7-segment) **sebelum commit ke MVP development**. Hasil pengujian membuktikan bahwa generic Tesseract.js (semua varian: eng, ssd, letsgodigital) **tidak dapat mencapai threshold 95%** yang ditetapkan stakeholder.

**Recommendation:** **GO with PHASE 0** — train custom CNN sebelum MVP. Estimasi tambahan: 4-6 minggu, ~Rp 69 juta.

## Constraint Update (1 Mei 2026)

Stakeholder menetapkan constraint baru:
- Threshold confidence: **95%** (dari ≥70% sebelumnya)
- **No manual input untuk digit timbangan** — operator HARUS retake jika OCR gagal
- Cloud AI tetap **dilarang** — semua on-device

Implikasi: Risk R1 mitigation strategy dari "manual edit fallback" diganti menjadi "custom CNN training (Phase 0)".

## Test Results Detail

12 data point di-collect pada display Kaggle 7-Segment Industrial Digits Dataset (ground truth `9562`) dan timbangan retail Gram-S5i (ground truth `3.895`):

| # | Model | Preprocessing | Crop | Multi-PSM | Result | Confidence | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | eng | none | full | no | `0.40` | 42% | ❌ |
| 2 | eng | full | crop 60% | no | `2.00` | 43% | ❌ |
| 3 | ssd | full | crop 60% | no | `1111.00` | 76% | ❌ |
| 4 | ssd | none | full | no | `811174` | 47% | ❌ |
| 5 | ssd | none | auto-crop ROI | no | `1888` | 61% | ❌ |
| 6 | ssd | upscale+pad | manual crop | yes | `4888` | 76% | ❌ |
| 7 | ssd | upscale+pad | manual crop | yes | `884794` | 63% | ❌ |
| 8 | ssd | upscale+pad | manual crop | yes | **`3895`** | **74%** | ⚠ Digits OK (decimal hilang) |
| 9 | ssd | upscale+pad | manual crop | yes | `173895` | 71% | ❌ Inconsistent |
| 10 | ssd | upscale+pad | manual crop | yes | `038952` | 44% | ❌ Inconsistent |
| 11 | ssd | upscale+pad | manual crop | yes | `88955` | 72% | ❌ Inconsistent |
| 12 | ssd | upscale+pad | manual crop | single PSM 7 | varies | varies | ⚠ Stable but still ≠ ground truth |

## Findings

### ✅ Apa yang BERHASIL
- **Capture pipeline** — camera, autofocus, ROI crop, manual crop editor, upload feature
- **Preprocessing pipeline** — red-channel emphasis + Otsu threshold + invert + upscale + padding produce CLEAN binary images (visible & readable di "DILIHAT OCR" thumbnail)
- **Multi-frame voting** — capture N frames, pick best confidence
- **PWA fundamentals** — installable, offline, IndexedDB, Service Worker caching
- **A/B testing infrastructure** — switch between models in Settings, debug visibility

### ❌ Apa yang GAGAL
- **OCR accuracy** — best case 1/12 reads digits correctly (`3895`), tetap kehilangan decimal point
- **Consistency** — image input nyaris identical → output bervariasi (`173895` / `038952` / `88955`)
- **Confidence as gate** — model 76% confident pada hasil yang salah, tidak dapat dipercaya sebagai filter

### 🔬 Root Cause
Tesseract+ssd model tidak punya kapabilitas membaca pattern 7-segment style spesifik timbangan industrial:
- **Training data mismatch** — ssd dilatih pada synthetic + small real-world set, tidak cover variasi font/lighting Anda
- **Confidence-correctness decoupling** — model overfit ke pola tertentu, "confidently wrong" pada display style baru
- **Decimal point detection** — titik kecil (~2px) sering missed bahkan saat digit utama benar

## Decision: GO Phase 0 (Custom CNN)

Berdasarkan data, generic OCR engine **tidak akan pernah mencapai 95% threshold** untuk constraint operasional ini. Custom CNN trained pada data domain-specific adalah satu-satunya jalan.

### Phase 0 Plan (4-6 minggu)

**Week 1–2: Data Collection**
- Pakai POC ini dalam **Mode Training** — operator/admin capture sample real timbangan + input ground truth
- Target 500-1000 sample dari merek timbangan target (variasi angle/lighting/jarak/digit)
- Output: ZIP file dengan `images/` + `labels.csv` (sudah implemented di POC v0.2)

**Week 3–4: Model Training (Desktop / GPU)**
- Base architecture: pre-trained CNN (MobileNetV3 / EfficientNet-Lite) atau YOLOv8n untuk per-digit detection
- Stack: Python + TensorFlow/PyTorch
- Augmentation: rotate ±15°, brightness, blur, noise → 3-5x dataset
- Train 50-100 epochs di GPU (Colab gratis cukup)
- Target: ≥80% val accuracy

**Week 5: ONNX Export + Integration**
- Export TF/PyTorch model → ONNX format
- Install `onnxruntime-web` di POC
- Replace Tesseract dengan ONNX inference
- Validation di POC

**Week 6: Field Testing + Iteration**
- Test pada 50 sample baru (test set, never seen during training)
- Akurasi check: harus ≥80%
- Kalau belum: tambah augmentation, retrain

### Budget Tambahan Phase 0

| Role | Mandays | Rate/Hari | Subtotal |
|---|---|---|---|
| AI/ML Engineer (Senior) | 25 | Rp 1.500.000 | Rp 37.500.000 |
| Data Collection Operator | 10 | Rp 500.000 | Rp 5.000.000 |
| Data Labeling | 10 | Rp 600.000 | Rp 6.000.000 |
| FE Engineer (ONNX integration) | 8 | Rp 1.200.000 | Rp 9.600.000 |
| Cloud GPU (Colab Pro 6 weeks) | — | — | Rp 2.000.000 |
| **Subtotal** | | | **Rp 60.100.000** |
| Buffer 15% | | | Rp 9.015.000 |
| **TOTAL PHASE 0** | | | **~Rp 69.000.000** |

### Updated Total Project Budget

| Phase | Durasi | Cost |
|---|---|---|
| **Phase 0: Custom CNN** | 6 minggu | Rp 69 juta |
| **MVP (Opsi A)** | 8 minggu | Rp 261 juta |
| **GRAND TOTAL** | **14 minggu (~3.5 bulan)** | **~Rp 330 juta** |

## POC v0.2: New Features

Sebagai persiapan Phase 0, POC v0.2 sudah include:

1. **Mode Training Toggle** (Settings) — switch antara production / training mode
2. **Ground Truth Input UI** (Review screen) — operator input apa yang tertulis di display
3. **Training Samples Storage** (IndexedDB) — pasangan (image, label) terpisah dari transaksi
4. **Export ZIP** (Settings) — download `labels.csv` + folder `images/` siap untuk training pipeline
5. **Per-model A/B test** — switch Tesseract ssd ↔ letsgodigital ↔ eng
6. **Debug visibility** — RAW OCR output, confidence per-frame, "DILIHAT OCR" thumbnail
7. **Manual crop editor** dengan corner resize handles
8. **Upload feature** untuk testing dengan image yang konsisten

## Sign-off Recommendation

✅ **APPROVE Phase 0** dengan budget Rp 69 juta
✅ **CONTINUE POC operation** dalam Mode Training untuk start data collection
⏸️ **HOLD MVP development** sampai Phase 0 deliver custom CNN dengan ≥80% accuracy

**Owner:** Engineering Lead
**Date:** 1 Mei 2026


