import { BrowserMultiFormatReader } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'
import type { QRResult } from '@/types/ocr'

let reader: BrowserMultiFormatReader | null = null

function getReader(): BrowserMultiFormatReader {
  if (!reader) {
    // TRY_HARDER: spend lebih banyak waktu per frame supaya QR kecil/blur tetap kebaca.
    // POSSIBLE_FORMATS: batasi ke format yg dipakai → lebih cepat.
    const hints = new Map<DecodeHintType, unknown>()
    hints.set(DecodeHintType.TRY_HARDER, true)
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.QR_CODE,
      BarcodeFormat.DATA_MATRIX,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
    ])

    // Scan setiap 150ms (default ZXing 250ms) — lebih responsif
    reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })
  }
  return reader
}

async function waitForVideoReady(videoEl: HTMLVideoElement): Promise<void> {
  if (videoEl.readyState >= 2) return
  await new Promise<void>((resolve) => {
    const ready = () => {
      videoEl.removeEventListener('canplay', ready)
      videoEl.removeEventListener('loadedmetadata', ready)
      resolve()
    }
    videoEl.addEventListener('canplay', ready)
    videoEl.addEventListener('loadedmetadata', ready)
  })
}

export async function scanQRFromVideo(
  videoEl: HTMLVideoElement,
  onResult: (r: QRResult) => void,
  onError?: (e: Error) => void,
): Promise<() => void> {
  await waitForVideoReady(videoEl)

  console.debug('[QR] starting scanner', {
    readyState: videoEl.readyState,
    videoWidth: videoEl.videoWidth,
    videoHeight: videoEl.videoHeight,
  })

  // Expected exceptions during continuous scanning (per-frame "no code found"):
  // ZXing bundle suffixes class names (NotFoundException2, ChecksumException3, etc.) —
  // pakai prefix match supaya tetap silent terlepas dari versi bundle.
  const SILENT_PREFIXES = ['NotFoundException', 'ChecksumException', 'FormatException']

  const r = getReader()
  try {
    const controls = await r.decodeFromVideoElement(videoEl, (result, err) => {
      if (result) {
        console.debug('[QR] detected:', result.getText())
        onResult({
          text: result.getText(),
          format: String(result.getBarcodeFormat()),
        })
        return
      }
      if (!err) return
      const name = err.name || ''
      if (SILENT_PREFIXES.some((p) => name.startsWith(p))) return
      console.warn('[QR] decode error:', name, err.message)
      onError?.(err as Error)
    })
    return () => {
      try {
        controls.stop()
      } catch (e) {
        console.warn('[QR] stop error:', e)
      }
    }
  } catch (e) {
    console.error('[QR] failed to start scanner:', e)
    onError?.(e as Error)
    return () => {}
  }
}

export async function scanQRFromBlob(blob: Blob): Promise<QRResult | null> {
  const url = URL.createObjectURL(blob)
  try {
    const r = getReader()
    const result = await r.decodeFromImageUrl(url)
    return {
      text: result.getText(),
      format: String(result.getBarcodeFormat()),
    }
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}
