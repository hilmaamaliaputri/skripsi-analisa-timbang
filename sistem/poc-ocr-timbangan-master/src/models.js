// Registry semua OCR model yang tersedia di app.
// Setiap entry punya: id, label, badge accuracy, badge speed, runner function.

export const MODELS = [
  {
    id: "r35",
    // Data teknis asli (untuk debug/dev/analytics)
    label: "R35",
    name: "Tuned Trim Mega",
    accuracy: "4/7 EXACT",
    speed: "~19s/7",
    description: "Production winner. Conditional ×2.5 boost untuk body_kg XX.YY format. Reproducible 5/5 runs.",
    file: "ocr/pipelines/r35-tuned-trim.js",
    recommended: true,
    // Label user-friendly (untuk UI dropdown)
    displayName: "Akurat & Cepat",
    displayBadge: "Direkomendasikan",
    displayAccuracy: "Akurasi tinggi",
    displaySpeed: "Cepat (~3s/gambar)",
    displayDescription: "Pilihan terbaik untuk penggunaan harian. Sudah teruji konsisten dan stabil.",
  },
  {
    id: "r30",
    label: "R30",
    name: "Production Lean",
    accuracy: "3/7 + 1 close",
    speed: "~19.7s/7",
    description: "Fastest. Image copy 7 = 50.783 (close, bukan EXACT).",
    file: "ocr/pipelines/r30-production-lean.js",
    displayName: "Hemat Waktu",
    displayBadge: null,
    displayAccuracy: "Akurasi sedang",
    displaySpeed: "Tercepat (~2.8s/gambar)",
    displayDescription: "Cocok kalau yang penting cepat. Hasil decimal kadang kurang presisi.",
  },
  {
    id: "r25",
    label: "R25",
    name: "PNG Extent",
    accuracy: "4/7 EXACT",
    speed: "~29s/7",
    description: "PNG breakthrough lama. Unreliable (ML Kit jitter, R27 flicker).",
    file: "ocr/pipelines/r25-png-extent.js",
    displayName: "Mode Tajam",
    displayBadge: "Eksperimental",
    displayAccuracy: "Akurasi tinggi (kurang stabil)",
    displaySpeed: "Lebih lambat (~4s/gambar)",
    displayDescription: "Pakai PNG lossless. Bagus untuk display tipis, tapi hasilnya kadang berubah-ubah.",
  },
  {
    id: "r39",
    label: "R39",
    name: "Non-Destructive Fallback",
    accuracy: "4/7 EXACT",
    speed: "~42.7s/7",
    description: "Preserve R35 + iter149 aggressive recovery untuk null cases.",
    file: "ocr/pipelines/r39-non-destructive.js",
    displayName: "Akurat Maksimal",
    displayBadge: null,
    displayAccuracy: "Akurasi tinggi",
    displaySpeed: "Lambat (~6s/gambar)",
    displayDescription: "Sama dengan Akurat & Cepat, tambah upaya ekstra untuk display kecil. Lebih lambat.",
  },
];

export const DEFAULT_MODEL_ID = "r35";
