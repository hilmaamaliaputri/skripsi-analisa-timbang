import { create } from 'zustand'
import type { TransaksiDraft, OCRSource } from '@/types/transaksi'
import { EMPTY_DRAFT } from '@/types/transaksi'

interface CaptureState {
  draft: TransaksiDraft
  cloudModeUsed: string | null
  cloudRawResponse: string | null
  setQR: (value: string, blobId: string) => void
  setDisplay: (blobId: string) => void
  setOCRImage: (blobId: string) => void
  setOCR: (
    berat: number,
    confidence: number,
    capturedAt: string,
    rawText?: string,
    frameCount?: number,
    source?: OCRSource,
  ) => void
  setCloudFallback: (
    cloudText: string,
    localText: string,
    localConf: number,
    mode?: string,
    rawResponse?: string,
  ) => void
  confirmCloudResult: (verifiedBerat: number, manualEdited: boolean) => void
  reset: () => void
}

export const useCapture = create<CaptureState>((set) => ({
  draft: { ...EMPTY_DRAFT },
  cloudModeUsed: null,
  cloudRawResponse: null,
  setQR: (value, blobId) =>
    set((s) => ({ draft: { ...s.draft, qr_code_value: value, qr_image_blob_id: blobId } })),
  setDisplay: (blobId) => set((s) => ({ draft: { ...s.draft, display_image_blob_id: blobId } })),
  setOCRImage: (blobId) => set((s) => ({ draft: { ...s.draft, ocr_image_blob_id: blobId } })),
  setOCR: (berat, confidence, capturedAt, rawText, frameCount, source) =>
    set((s) => ({
      draft: {
        ...s.draft,
        berat_kg: berat,
        ocr_confidence: confidence,
        captured_at: capturedAt,
        ocr_raw_text: rawText ?? null,
        ocr_frame_count: frameCount ?? 1,
        ocr_manual_edited: false,
        ocr_source: source ?? 'local',
      },
    })),
  setCloudFallback: (cloudText, localText, localConf, mode, rawResponse) =>
    set((s) => ({
      draft: {
        ...s.draft,
        cloud_predicted_text: cloudText,
        local_predicted_text: localText,
        local_confidence: localConf,
        ocr_source: 'cloud-mistral',
      },
      cloudModeUsed: mode ?? null,
      cloudRawResponse: rawResponse ?? null,
    })),
  confirmCloudResult: (verifiedBerat, manualEdited) =>
    set((s) => ({
      draft: {
        ...s.draft,
        berat_kg: verifiedBerat,
        ocr_manual_edited: manualEdited,
        ocr_source: 'cloud-confirmed',
      },
    })),
  reset: () => set({ draft: { ...EMPTY_DRAFT }, cloudModeUsed: null, cloudRawResponse: null }),
}))
