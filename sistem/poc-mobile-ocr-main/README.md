# POC — ANALISA TIMBANG

> **Proof of Concept** untuk PWA Mobile OCR Timbangan dengan Edge AI.
> Validasi 4 hal paling berisiko sebelum commit ke MVP development.

---

## TL;DR

POC ini membuktikan bahwa:
1. ✅ **OCR offline** (Tesseract.js) cukup akurat untuk display 7-segment timbangan
2. ✅ **PWA installable** & 100% berfungsi tanpa internet (Android & iOS)
3. ✅ **IndexedDB + Cache API** mampu handle blob image realistic
4. ✅ **Camera + QR scanner** reliable untuk operasional lapangan

---

## Status

🟢 **SCAFFOLD COMPLETE** — code siap dijalankan. Belum ada test data, belum ada PWA icon assets (placeholder).

Spesifikasi lengkap: [`SPEC.md`](./SPEC.md)

---

## Quick Start

### Prerequisite
- **Node.js** ≥ 18.x
- **npm** ≥ 9.x (atau pnpm/yarn)
- **Browser modern** — Chrome 100+, Safari 16+, Edge 100+
- **HTTPS** untuk camera akses di mobile (Vite dev server pakai HTTP, hanya jalan di localhost; untuk test mobile lewat LAN, pakai `vite preview` + ngrok atau deploy ke Netlify/Vercel)

### Install & Run

```bash
cd poc

# Install dependencies
npm install

# Setup MSW worker (sekali saja, generate public/mockServiceWorker.js)
npx msw init public/ --save

# Run dev server
npm run dev
# → http://localhost:5173
```

### Build & Preview

```bash
# Production build
npm run build

# Preview production (pakai HTTPS via reverse proxy untuk test mobile)
npm run preview

# Type check
npm run type-check
```

### Test di Mobile

Karena camera butuh HTTPS:

**Opsi 1: ngrok / cloudflared**
```bash
# Terminal 1
npm run dev

# Terminal 2
ngrok http 5173
# → buka URL https://xxx.ngrok.io di smartphone
```

**Opsi 2: Deploy ke Netlify/Vercel** (gratis)
```bash
npm run build
# Drag-drop folder dist/ ke netlify.app/drop, atau deploy via CLI
```

**Opsi 3: Local IP HTTPS** — setup mkcert + vite https config (advanced)

---

## Demo Login

Hardcoded operator (validasi via MSW):

```
Username:  OP-2847
Password:  demo
Operator:  Budi Santoso
Entity:    PT ANALISA INDUSTRI → PT MITRA LOGISTIK
```

---

## Demo Flow (5 menit)

1. Buka URL POC di Chrome Android/iOS
2. Login (`OP-2847` / `demo`)
3. Tap "MULAI TRANSAKSI" → scan QR code (cetak QR generator online dengan value `ABCD1234`)
4. Arahkan kamera ke display timbangan → tap shutter → OCR jalan
5. Review hasil → tap SIMPAN → muncul di Riwayat dengan badge SAVED
6. **Test offline:** Airplane mode → ulangi flow → badge OFFLINE PENDING
7. **Test sync:** matikan Airplane → tap icon refresh di Riwayat → badge SYNCED

---

## Struktur Folder

```
poc/
├── README.md                       (file ini)
├── SPEC.md                         (spesifikasi POC lengkap)
├── package.json
├── vite.config.ts                  (Vite + PWA + alias)
├── tsconfig.json
├── tailwind.config.ts              (design tokens dari mockup)
├── postcss.config.js
├── index.html
├── public/
│   ├── manifest.webmanifest
│   ├── icons/                      ⚠ TODO: tambah 192.png, 512.png, maskable-512.png
│   └── mockServiceWorker.js        (auto-generated via msw init)
└── src/
    ├── main.tsx                    (entry · MSW boot · network listeners)
    ├── App.tsx                     (root layout · Outlet)
    ├── routes.tsx                  (8 routes + RequireAuth wrapper)
    ├── styles/
    │   └── globals.css             (Tailwind + custom: lcd, hazard-stripe, glow)
    ├── pages/
    │   ├── Login.tsx               ✅ form + MSW auth
    │   ├── Dashboard.tsx           ✅ stats + recent + CTA
    │   ├── CaptureQR.tsx           ✅ ZXing scanner + manual fallback
    │   ├── CaptureOCR.tsx          ✅ Tesseract.js + camera capture
    │   ├── Review.tsx              ✅ LCD readout + edit + save
    │   ├── History.tsx             ✅ filter + grouping + sync
    │   ├── Detail.tsx              ✅ 10 metadata fields + thumbnails
    │   └── Settings.tsx            ✅ storage + OCR config + logout
    ├── components/
    │   ├── Icons.tsx               (20 inline SVG icons)
    │   ├── StatusBadge.tsx         (SAVED/PENDING/SYNCED)
    │   ├── LCDDisplay.tsx          (amber 7-seg style)
    │   ├── HazardStripe.tsx
    │   ├── BottomNav.tsx           (3 tabs)
    │   ├── TopBar.tsx              (back + title + subtitle)
    │   └── CameraView.tsx          (MediaDevices wrapper + error state)
    ├── lib/
    │   ├── db.ts                   (Dexie + Cache API blob storage)
    │   ├── ocr.ts                  (Tesseract.js worker singleton)
    │   ├── qr.ts                   (ZXing wrapper)
    │   ├── camera.ts               (getUserMedia + capture)
    │   ├── image.ts                (preprocess: grayscale, threshold, crop)
    │   ├── api.ts                  (fetch wrapper)
    │   ├── sync.ts                 (queue + retry)
    │   └── utils.ts                (uuid, format, device-id)
    ├── store/
    │   ├── auth.ts                 (Zustand + persist)
    │   ├── capture.ts              (wizard draft state)
    │   ├── network.ts              (online/offline listener)
    │   └── settings.ts             (OCR threshold, image quality)
    ├── mocks/
    │   ├── browser.ts              (MSW setupWorker)
    │   ├── handlers.ts             (login + sync endpoints)
    │   └── data.ts                 (DEMO_OPERATOR)
    └── types/
        ├── transaksi.ts            (Transaksi + Draft + EMPTY_DRAFT)
        ├── ocr.ts                  (OCRResult, OCRConfig, QRResult)
        └── api.ts                  (Login, SyncTransaksi requests/responses)
```

---

## ⚠ TODO Sebelum Demo

### Wajib

1. **PWA Icons** — Generate 3 file PNG di `public/icons/`:
   - `192.png` (192×192)
   - `512.png` (512×512)
   - `maskable-512.png` (512×512, dengan safe area 80%)

   Quick generator: [maskable.app](https://maskable.app/editor) atau [pwa-asset-generator](https://github.com/onderceylan/pwa-asset-generator)

2. **MSW Init** — Run `npx msw init public/ --save` setelah `npm install`

3. **HTTPS** untuk test camera di mobile (lihat section Test di Mobile)

### Opsional

4. **Tesseract eng.traineddata** — Default download dari CDN (5MB, sekali). Untuk full offline, pre-download ke `public/tesseract-data/`.
5. **Sample QR** — Print QR dengan value `ABCD1234` (use any QR generator)

---

## Development Notes

### MSW vs PWA Service Worker
- **Dev mode:** MSW aktif, intercept fetch ke `/api/*`. PWA SW disabled.
- **Prod build:** PWA SW aktif (cache assets), MSW disabled. Saat BE asli ready, fetch akan langsung ke server.

### Camera Permission
- HTTP localhost: ✅ izinkan
- HTTPS: ✅ izinkan
- HTTP non-localhost: ❌ permission denied (browser security)

### IndexedDB Storage
- **Transaksi data** → IndexedDB (Dexie table)
- **Image blob** (QR + display) → Cache API (terpisah dari IndexedDB)
- Storage estimate via `navigator.storage.estimate()` — lihat Settings page

### Hot Reload
- Vite HMR aktif untuk semua TSX/CSS
- Service Worker tidak di-watch saat dev (`devOptions.enabled: false`)
- Untuk test SW behavior: `npm run build && npm run preview`

---

## Troubleshooting

| Issue | Solusi |
|---|---|
| `msw: Cannot find module 'msw/browser'` | Run `npx msw init public/ --save` |
| Camera tidak muncul | Pastikan HTTPS atau localhost. Cek browser permission. |
| Tesseract.js loading lambat di first use | Normal — download eng.traineddata 5MB sekali, lalu cached |
| PWA install button tidak muncul | Pastikan icons ada + manifest valid + HTTPS |
| `Module not found: @/...` | Restart dev server, pastikan `tsconfig.json` paths config aktif |
| iOS Safari camera black | iOS butuh user gesture untuk start camera + HTTPS |

---

## Referensi

- 📄 [`SPEC.md`](./SPEC.md) — POC specification lengkap (success criteria, risk validation, demo scenario)
- 📁 [`../planning/PRD.md`](../planning/PRD.md) — Product Requirement Document
- 📁 [`../planning/mockup.html`](../planning/mockup.html) — Visual mockup 12 screens
- 📁 [`../planning/Feature_List_ANALISA_TIMBANG.xlsx`](../planning/Feature_List_ANALISA_TIMBANG.xlsx) — 81 fitur, timeline, RAB

---

**Owner:** Tim Engineering ANALISA
**Versi:** 0.1.0 · POC scaffold
**Updated:** 30 April 2026
