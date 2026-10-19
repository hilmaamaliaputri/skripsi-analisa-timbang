/**
 * Cloud OCR via Mistral OCR API.
 * Dipakai sebagai FALLBACK saat local OCR confidence < threshold.
 *
 * Strategi: Hybrid bootstrap
 *   1. Operator capture → local OCR
 *   2. If confidence rendah + online → trigger Mistral fallback
 *   3. Mistral baca → operator confirm (✓ benar / ✗ edit)
 *   4. (image, verified_text) → simpan ke training queue
 *   5. Periodic retrain local CNN → improve
 *
 * Security note: API key di browser tidak ideal untuk production.
 * Untuk POC/MVP OK. Production sebaiknya proxy via backend.
 */
import type { OCRResult } from '@/types/ocr'

export interface CloudOCRResult extends OCRResult {
  mode: CloudOCRMode
  rawResponse: string
}

const MISTRAL_OCR_URL = 'https://api.mistral.ai/v1/ocr'
const MISTRAL_OCR_MODEL = 'mistral-ocr-latest'
const MISTRAL_CHAT_URL = 'https://api.mistral.ai/v1/chat/completions'
const PIXTRAL_MODEL = 'pixtral-12b-2409'

export type CloudOCRMode = 'ocr' | 'pixtral'

export interface CloudOCRConfig {
  apiKey: string
  mode?: CloudOCRMode
  endpoint?: string
  model?: string
}

const PIXTRAL_PROMPT = `Anda adalah OCR khusus untuk timbangan industri.

Image ini adalah display digital (LED/LCD 7-segment) yang menampilkan berat dalam satuan kg.

INSTRUKSI:
1. Baca angka EXACTLY seperti yang tampil di display, termasuk titik desimal jika ada.
2. Display industrial scale BIASANYA punya 1-3 angka di belakang titik (mis. "3.895", "12.5", "100.0", "0.450").
3. JANGAN abaikan titik desimal — perhatikan dot kecil antara digit (sangat penting!).
4. Jika display menunjukkan "3.895", kembalikan "3.895" (BUKAN "3895" atau "3,895").
5. Abaikan satuan (kg) dan label lain — hanya kembalikan angkanya.

OUTPUT: Kembalikan HANYA angka mentah dalam format JSON:
{"value": "X.XXX"}

Tidak ada penjelasan, tidak ada markdown, hanya JSON.`

async function blobToBase64DataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Extract numeric weight value dari text yang dikembalikan Mistral.
 * Mistral mungkin return: "3.895", "3.895 kg", "Berat: 3.895", "**3.895**" dll.
 * Cleanup ke format murni angka + decimal.
 */
function extractWeightFromText(rawText: string): string {
  if (!rawText) return ''

  // Strip markdown bold/italic
  let cleaned = rawText.replace(/[*_`#]/g, '').trim()

  // Cari pattern angka pertama yang likely berat
  // Patterns: "123.45", "123,45", "123.4", "123", "0.5", etc
  const matches = cleaned.match(/-?\d{1,7}[.,]\d{1,3}|-?\d{1,7}/g)
  if (!matches || matches.length === 0) return ''

  // Pilih candidate paling masuk akal — biasanya yang punya decimal
  const withDecimal = matches.filter((m) => /[.,]/.test(m))
  const candidate = withDecimal.length > 0 ? withDecimal[0] : matches[0]

  // Normalize: koma → titik (Indonesian decimal)
  return candidate.replace(',', '.')
}

/**
 * Pure OCR via mistral-ocr-latest (designed for documents/PDF).
 * Cepat tapi LEMAH untuk 7-segment LCD karena sering hilangkan decimal point.
 */
async function callMistralOCR(dataUrl: string, apiKey: string, endpoint: string, model: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      document: { type: 'image_url', image_url: dataUrl },
    }),
  })
  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Mistral OCR HTTP ${response.status}: ${errText.substring(0, 200)}`)
  }
  const data = await response.json()
  const pages = data.pages || []
  return pages.map((p: { markdown?: string }) => p.markdown || '').join(' ').trim()
}

/**
 * Multimodal via Pixtral dengan prompt eksplisit.
 * Lebih akurat untuk 7-segment LCD karena bisa "reason" tentang format.
 */
async function callPixtral(dataUrl: string, apiKey: string) {
  const response = await fetch(MISTRAL_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: PIXTRAL_MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PIXTRAL_PROMPT },
            { type: 'image_url', image_url: dataUrl },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 100,
    }),
  })
  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`Pixtral HTTP ${response.status}: ${errText.substring(0, 200)}`)
  }
  const data = await response.json()
  const content = data.choices?.[0]?.message?.content || ''

  // Pixtral diminta return JSON {"value": "X.XXX"}
  // Cleanup possible markdown wrapper
  const cleaned = content.replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (parsed.value) return String(parsed.value)
  } catch {
    // fallback: parse raw text
  }
  return content
}

/**
 * Recognize image via Mistral cloud (OCR atau Pixtral).
 * Returns OCRResult compatible dengan Tesseract/CNN engines.
 */
export async function recognizeBlobCloud(
  blob: Blob,
  config: CloudOCRConfig,
): Promise<CloudOCRResult> {
  if (!config.apiKey) {
    throw new Error('Mistral API key belum di-set di Settings')
  }

  const start = performance.now()
  const dataUrl = await blobToBase64DataUrl(blob)
  const mode: CloudOCRMode = config.mode || 'pixtral'

  console.debug('[OCR-CLOUD] Calling Mistral cloud', { mode })

  let rawText = ''
  if (mode === 'pixtral') {
    rawText = await callPixtral(dataUrl, config.apiKey)
  } else {
    const endpoint = config.endpoint || MISTRAL_OCR_URL
    const model = config.model || MISTRAL_OCR_MODEL
    rawText = await callMistralOCR(dataUrl, config.apiKey, endpoint, model)
  }

  const extracted = extractWeightFromText(rawText)
  const durationMs = performance.now() - start

  console.debug('[OCR-CLOUD] result:', { mode, rawText, extracted, durationMs })

  return {
    text: extracted,
    confidence: 0.80,
    durationMs,
    mode,
    rawResponse: rawText,
  }
}

/**
 * Test Mistral API key validity (tanpa actual OCR).
 * Pakai endpoint /models untuk simple ping.
 */
export async function pingMistral(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.mistral.ai/v1/models', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (response.ok) return { ok: true }
    return { ok: false, error: `HTTP ${response.status}` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' }
  }
}
