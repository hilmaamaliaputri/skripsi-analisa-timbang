import { createWorker, type Worker } from 'tesseract.js'
import type { OCRResult, OCRConfig } from '@/types/ocr'
import { DEFAULT_OCR_CONFIG } from '@/types/ocr'
import { preprocessForOCR, cropCenterStrip, upscaleWithPadding } from './image'

let workerPromise: Promise<Worker> | null = null
let workerLang: string | null = null

async function getWorker(config: OCRConfig = DEFAULT_OCR_CONFIG): Promise<Worker> {
  // Reload worker kalau language berubah (mis. user switch ssd ↔ letsgodigital)
  if (workerPromise && workerLang !== config.language) {
    console.debug('[OCR] language changed, terminating old worker', { from: workerLang, to: config.language })
    try {
      const old = await workerPromise
      await old.terminate()
    } catch (e) {
      console.warn('[OCR] terminate old worker failed', e)
    }
    workerPromise = null
    workerLang = null
  }

  if (!workerPromise) {
    workerLang = config.language
    workerPromise = (async () => {
      console.debug('[OCR] loading worker', { language: config.language, langPath: config.langPath })
      const opts = config.langPath
        ? {
            langPath: config.langPath,
            // File lokal di /public/tesseract-data/ tidak di-gzip
            gzip: false,
          }
        : undefined
      const w = await createWorker(config.language, 1, opts)
      await w.setParameters({
        tessedit_char_whitelist: config.whitelist,
        tessedit_pageseg_mode: String(config.pagesegmode) as never,
      })
      return w
    })()
  }
  return workerPromise
}

export async function preloadOCR(): Promise<void> {
  await getWorker()
}

/**
 * Recognize a blob via OCR. Pipeline:
 * 1. Crop center strip (60%) — hilangkan tepi yang biasanya bukan display
 * 2. Preprocess: red-emphasis → Otsu → invert (LED-friendly)
 * 3. Run Tesseract recognize
 * 4. Parse number
 *
 * Catatan: Tesseract.js generic accuracy untuk 7-segment LED display
 * memang terbatas. Untuk akurasi production, train custom model
 * (lihat SPEC.md §4 Risk R1) atau gunakan ssd.traineddata khusus 7-seg.
 */
export async function recognizeBlob(blob: Blob, config: OCRConfig = DEFAULT_OCR_CONFIG): Promise<OCRResult> {
  const w = await getWorker(config)
  const start = performance.now()

  // ─── Pipeline preprocessing ───
  let processed = blob

  if (config.cropRatio < 1.0) {
    try {
      processed = await cropCenterStrip(blob, config.cropRatio)
    } catch (e) {
      console.warn('[OCR] crop failed, using original', e)
    }
  }

  if (config.preprocess) {
    try {
      processed = await preprocessForOCR(processed)
    } catch (e) {
      console.warn('[OCR] preprocess failed, using cropped only', e)
    }
  }

  // Upscale + padding (selalu — proven helpful untuk Tesseract)
  try {
    processed = await upscaleWithPadding(processed, {
      targetMinHeight: 200,
      paddingRatio: 0.12,
    })
  } catch (e) {
    console.warn('[OCR] upscale failed', e)
  }

  // ─── Single PSM (stable & deterministic) ───
  // Multi-PSM ditolak karena menambah non-determinism. PSM 7 = single line of text,
  // paling cocok untuk satu baris digit di display 7-segment.
  await w.setParameters({
    tessedit_char_whitelist: config.whitelist,
    tessedit_pageseg_mode: String(config.pagesegmode) as never,
  })

  const url = URL.createObjectURL(processed)
  try {
    const { data } = await w.recognize(url)
    const durationMs = performance.now() - start
    const cleanText = (data.text || '').replace(/\s+/g, '').trim()
    console.debug('[OCR] result:', { text: cleanText, confidence: data.confidence, durationMs, psm: config.pagesegmode })
    return {
      text: cleanText,
      confidence: data.confidence / 100,
      durationMs,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Recognize tanpa preprocessing — untuk debug perbandingan.
 */
export async function recognizeBlobRaw(blob: Blob): Promise<OCRResult> {
  const w = await getWorker()
  const url = URL.createObjectURL(blob)
  const start = performance.now()
  try {
    const { data } = await w.recognize(url)
    const durationMs = performance.now() - start
    const cleanText = (data.text || '').replace(/\s+/g, '').trim()
    return {
      text: cleanText,
      confidence: data.confidence / 100,
      durationMs,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function parseBerat(text: string): number | null {
  const cleaned = text.replace(/[^0-9.]/g, '')
  if (!cleaned) return null
  const num = parseFloat(cleaned)
  if (isNaN(num)) return null
  return Math.round(num * 100) / 100
}

export async function terminateOCR(): Promise<void> {
  if (workerPromise) {
    const w = await workerPromise
    await w.terminate()
    workerPromise = null
  }
}
