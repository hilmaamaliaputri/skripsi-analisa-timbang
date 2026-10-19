export interface OCRResult {
  text: string
  confidence: number
  durationMs: number
  rawBlocks?: Array<{
    text: string
    confidence: number
    bbox?: { x: number; y: number; w: number; h: number }
  }>
}

export interface OCRConfig {
  language: string // 'ssd' (7-segment) | 'eng' | 'osd' | dll
  whitelist: string
  pagesegmode: number
  langPath?: string
  /** Preprocess image (grayscale+threshold+invert) sebelum OCR. ssd trained on raw photos → false. */
  preprocess: boolean
  /** Crop center strip ratio (0-1) sebelum OCR. 1.0 = no crop. */
  cropRatio: number
}

export const DEFAULT_OCR_CONFIG: OCRConfig = {
  language: 'ssd',
  whitelist: '0123456789.',
  // PSM 7 = single text line — paling konsisten untuk satu baris digit di display
  pagesegmode: 7,
  langPath: '/tesseract-data',
  preprocess: false,
  cropRatio: 1.0,
}

export interface QRResult {
  text: string
  format: string
  rawBytes?: Uint8Array
}
