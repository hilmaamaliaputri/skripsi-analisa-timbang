import JSZip from 'jszip'
import { db, getImageBlob, saveImageBlob } from './db'
import type { TrainingSample } from '@/types/training'

export async function saveTrainingSample(
  sample: Omit<TrainingSample, 'id' | 'created_at'>,
): Promise<string> {
  const id = crypto.randomUUID()
  const full: TrainingSample = {
    ...sample,
    id,
    created_at: new Date().toISOString(),
  }
  await db.training_samples.put(full)
  return id
}

export async function listTrainingSamples(): Promise<TrainingSample[]> {
  return db.training_samples.orderBy('created_at').reverse().toArray()
}

export async function countTrainingSamples(): Promise<{
  total: number
  byModel: Record<string, number>
}> {
  const all = await db.training_samples.toArray()
  const byModel: Record<string, number> = {}
  for (const s of all) {
    byModel[s.ocr_model] = (byModel[s.ocr_model] || 0) + 1
  }
  return { total: all.length, byModel }
}

export async function deleteTrainingSample(id: string): Promise<void> {
  const sample = await db.training_samples.get(id)
  if (!sample) return
  // Cleanup image blobs
  const { deleteImageBlob } = await import('./db')
  if (sample.cropped_blob_id) await deleteImageBlob(sample.cropped_blob_id).catch(() => {})
  if (sample.full_blob_id) await deleteImageBlob(sample.full_blob_id).catch(() => {})
  await db.training_samples.delete(id)
}

export async function clearAllTrainingSamples(): Promise<number> {
  const all = await db.training_samples.toArray()
  for (const s of all) {
    const { deleteImageBlob } = await import('./db')
    if (s.cropped_blob_id) await deleteImageBlob(s.cropped_blob_id).catch(() => {})
    if (s.full_blob_id) await deleteImageBlob(s.full_blob_id).catch(() => {})
  }
  await db.training_samples.clear()
  return all.length
}

/**
 * Export training dataset sebagai ZIP file.
 * Structure:
 *   training_dataset.zip
 *   ├── README.md             (dataset info)
 *   ├── labels.csv            (id,filename,ground_truth,berat,ocr_predicted,confidence,model,brand,operator,timestamp)
 *   ├── images/
 *   │   ├── crop_<id>.jpg    (image yang di-OCR)
 *   │   └── full_<id>.jpg    (foto utuh untuk audit)
 */
export async function exportTrainingZip(
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const samples = await listTrainingSamples()
  const zip = new JSZip()
  const imagesFolder = zip.folder('images')!

  // CSV header
  const csvHeader =
    'id,crop_filename,full_filename,ground_truth,berat_kg,ocr_predicted,ocr_confidence,ocr_model,scale_brand,notes,operator,device_id,timestamp\n'
  const csvRows: string[] = [csvHeader]

  let i = 0
  for (const s of samples) {
    onProgress?.(i, samples.length)

    const cropName = `crop_${s.id}.jpg`
    const fullName = s.full_blob_id ? `full_${s.id}.jpg` : ''

    if (s.cropped_blob_id) {
      const blob = await getImageBlob(s.cropped_blob_id)
      if (blob) imagesFolder.file(cropName, blob)
    }
    if (s.full_blob_id) {
      const blob = await getImageBlob(s.full_blob_id)
      if (blob) imagesFolder.file(fullName, blob)
    }

    // CSV escape — wrap in quotes & escape inner quotes
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return ''
      const str = String(v)
      return `"${str.replace(/"/g, '""')}"`
    }
    csvRows.push(
      [
        esc(s.id),
        esc(cropName),
        esc(fullName),
        esc(s.ground_truth),
        esc(s.ground_truth_berat),
        esc(s.ocr_predicted_text || ''),
        esc(s.ocr_confidence ?? ''),
        esc(s.ocr_model),
        esc(s.scale_brand || ''),
        esc(s.notes || ''),
        esc(s.operator_code),
        esc(s.device_id),
        esc(s.created_at),
      ].join(',') + '\n',
    )
    i++
  }

  zip.file('labels.csv', csvRows.join(''))
  zip.file(
    'README.md',
    [
      '# ANALISA TIMBANG — Training Dataset Export',
      '',
      `Generated: ${new Date().toISOString()}`,
      `Total samples: ${samples.length}`,
      '',
      '## Structure',
      '- `labels.csv` — ground truth + metadata per sample',
      '- `images/crop_<id>.jpg` — cropped display area (input untuk train CNN)',
      '- `images/full_<id>.jpg` — foto utuh (audit / re-crop)',
      '',
      '## CSV Schema',
      '| Column | Description |',
      '|---|---|',
      '| id | UUID lokal sample |',
      '| crop_filename | Nama file image cropped |',
      '| full_filename | Nama file foto utuh (opsional) |',
      '| ground_truth | String yang DIBACA OPERATOR (target untuk train) |',
      '| berat_kg | Berat dalam kg (parsed dari ground_truth) |',
      '| ocr_predicted | Hasil OCR Tesseract saat capture (untuk benchmark) |',
      '| ocr_confidence | Confidence Tesseract (0-1) |',
      '| ocr_model | Model yang dipakai (ssd/letsgodigital/eng) |',
      '| scale_brand | Merek timbangan (opsional) |',
      '| notes | Catatan operator (opsional) |',
      '| operator | Kode operator yang capture |',
      '| device_id | UUID perangkat |',
      '| timestamp | ISO8601 |',
      '',
      '## Untuk Training CNN',
      '1. Ekstrak ZIP ini ke folder kerja',
      '2. Pakai `labels.csv` sebagai dataset metadata',
      '3. Image input: `images/crop_*.jpg` (sudah cropped ke area display)',
      '4. Target output: kolom `ground_truth` di CSV',
      '5. Train/val split rekomendasi: 80/20 stratified per panjang digit',
    ].join('\n'),
  )

  onProgress?.(samples.length, samples.length)
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Helper untuk save sample dari Review screen — ambil blob dari Cache API,
 * buat copy fresh blob_id biar terpisah dari transaksi (ada lifecycle berbeda).
 */
export async function copyBlobForTraining(sourceBlobId: string): Promise<string | null> {
  const blob = await getImageBlob(sourceBlobId)
  if (!blob) return null
  return saveImageBlob(blob)
}
