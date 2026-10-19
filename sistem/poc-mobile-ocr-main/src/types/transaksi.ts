export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export type OCRSource = 'local' | 'cloud-mistral' | 'cloud-confirmed'

export interface Transaksi {
  id: string
  nomor_kode_transaksi: string
  user_operator_code: string
  user_operator_name: string
  entity_pengirim: string
  entity_penerima: string
  qr_code_value: string
  qr_image_blob_id: string
  display_image_blob_id: string
  ocr_image_blob_id: string
  berat_kg: number
  ocr_confidence: number
  ocr_manual_edited: boolean
  ocr_raw_text: string | null
  ocr_frame_count: number
  // Audit cloud fallback — null jika tidak pakai cloud
  ocr_source: OCRSource
  cloud_predicted_text: string | null
  local_predicted_text: string | null
  local_confidence: number | null
  captured_at: string
  sent_at: string | null
  sync_status: SyncStatus
  retry_count: number
  last_error: string | null
  device_id: string
  app_version: string
}

export interface TransaksiDraft {
  qr_code_value: string | null
  qr_image_blob_id: string | null
  display_image_blob_id: string | null
  ocr_image_blob_id: string | null // image yang dilihat OCR (preprocessed)
  berat_kg: number | null
  ocr_confidence: number | null
  ocr_manual_edited: boolean
  captured_at: string | null
  ocr_raw_text: string | null // raw OCR output (sebelum parseBerat)
  ocr_frame_count: number // jumlah frame multi-frame voting
  ocr_source: OCRSource // 'local' = engine biasa · 'cloud-*' = Mistral fallback
  cloud_predicted_text: string | null // text dari Mistral (sebelum operator confirm)
  local_predicted_text: string | null // text dari local (untuk audit)
  local_confidence: number | null
}

export const EMPTY_DRAFT: TransaksiDraft = {
  qr_code_value: null,
  qr_image_blob_id: null,
  display_image_blob_id: null,
  ocr_image_blob_id: null,
  berat_kg: null,
  ocr_confidence: null,
  ocr_manual_edited: false,
  captured_at: null,
  ocr_raw_text: null,
  ocr_frame_count: 0,
  ocr_source: 'local',
  cloud_predicted_text: null,
  local_predicted_text: null,
  local_confidence: null,
}
