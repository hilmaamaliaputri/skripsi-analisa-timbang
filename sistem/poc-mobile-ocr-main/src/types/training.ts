/**
 * Training Sample — pasangan (image, ground truth) untuk train custom OCR model.
 * Saat MODE TRAINING aktif, capture flow akan menyimpan ke tabel training_samples
 * (bukan transaksi) dengan operator memasukkan ground truth.
 */
export interface TrainingSample {
  id: string
  // Cropped image yang akan jadi input model (area display saja)
  cropped_blob_id: string
  // Foto utuh untuk audit
  full_blob_id: string | null
  // Hasil OCR di POC (untuk benchmark vs CNN nanti)
  ocr_predicted_text: string | null
  ocr_predicted_berat: number | null
  ocr_confidence: number | null
  ocr_model: string // 'ssd' | 'letsgodigital' | 'eng'
  // GROUND TRUTH dari operator (exception ke no-manual rule, ditandai training)
  ground_truth: string
  ground_truth_berat: number
  // Metadata
  scale_brand: string | null // mis. 'GRAM-S5i', 'CAS-PR-II'
  notes: string | null
  operator_code: string
  device_id: string
  app_version: string
  created_at: string
}
