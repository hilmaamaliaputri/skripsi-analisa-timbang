import Dexie, { type Table } from 'dexie'
import type { Transaksi } from '@/types/transaksi'
import type { TrainingSample } from '@/types/training'

const IMAGE_CACHE_NAME = 'analisa-images-v1'

class AnalisaDB extends Dexie {
  transaksi!: Table<Transaksi, string>
  training_samples!: Table<TrainingSample, string>

  constructor() {
    super('analisa-timbang')
    this.version(1).stores({
      transaksi: 'id, nomor_kode_transaksi, sync_status, captured_at',
    })
    this.version(2).stores({
      transaksi: 'id, nomor_kode_transaksi, sync_status, captured_at',
      training_samples: 'id, ocr_model, scale_brand, created_at',
    })
  }
}

export const db = new AnalisaDB()

// ─── Transaksi queries ───
export async function saveTransaksi(t: Transaksi): Promise<string> {
  await db.transaksi.put(t)
  return t.id
}

export async function getTransaksi(id: string): Promise<Transaksi | undefined> {
  return db.transaksi.get(id)
}

export async function listTransaksi(): Promise<Transaksi[]> {
  return db.transaksi.orderBy('captured_at').reverse().toArray()
}

export async function listPendingTransaksi(): Promise<Transaksi[]> {
  return db.transaksi.where('sync_status').anyOf('pending', 'failed').toArray()
}

export async function updateSyncStatus(
  id: string,
  patch: Partial<Pick<Transaksi, 'sync_status' | 'sent_at' | 'retry_count' | 'last_error'>>,
): Promise<void> {
  await db.transaksi.update(id, patch)
}

export async function countByStatus() {
  const all = await db.transaksi.toArray()
  return {
    total: all.length,
    pending: all.filter((t) => t.sync_status === 'pending' || t.sync_status === 'failed').length,
    synced: all.filter((t) => t.sync_status === 'synced').length,
  }
}

// ─── Image blob storage via Cache API ───
export async function saveImageBlob(blob: Blob): Promise<string> {
  const id = `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  const url = `/blob/${id}`
  const cache = await caches.open(IMAGE_CACHE_NAME)
  await cache.put(url, new Response(blob, { headers: { 'Content-Type': blob.type || 'image/jpeg' } }))
  return id
}

export async function getImageBlob(id: string): Promise<Blob | null> {
  const cache = await caches.open(IMAGE_CACHE_NAME)
  const res = await cache.match(`/blob/${id}`)
  if (!res) return null
  return res.blob()
}

export async function getImageURL(id: string | null | undefined): Promise<string | null> {
  if (!id) return null
  const blob = await getImageBlob(id)
  if (!blob) return null
  return URL.createObjectURL(blob)
}

export async function deleteImageBlob(id: string): Promise<void> {
  const cache = await caches.open(IMAGE_CACHE_NAME)
  await cache.delete(`/blob/${id}`)
}

export async function getStorageUsage(): Promise<{ usage: number; quota: number }> {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    const est = await navigator.storage.estimate()
    return { usage: est.usage || 0, quota: est.quota || 0 }
  }
  return { usage: 0, quota: 0 }
}
