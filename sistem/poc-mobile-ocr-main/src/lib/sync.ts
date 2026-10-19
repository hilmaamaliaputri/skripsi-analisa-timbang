import { listPendingTransaksi, updateSyncStatus, getTransaksi } from './db'
import { api } from './api'
import { nowISO } from './utils'

export interface SyncResult {
  total: number
  succeeded: number
  failed: number
  errors: Array<{ id: string; error: string }>
}

export async function syncOne(id: string): Promise<boolean> {
  const t = await getTransaksi(id)
  if (!t) return false
  await updateSyncStatus(id, { sync_status: 'syncing' })

  try {
    await api.syncTransaksi({
      id: t.id,
      nomor_kode_transaksi: t.nomor_kode_transaksi,
      user_operator_code: t.user_operator_code,
      entity_pengirim: t.entity_pengirim,
      entity_penerima: t.entity_penerima,
      qr_code_value: t.qr_code_value,
      berat_kg: t.berat_kg,
      ocr_confidence: t.ocr_confidence,
      ocr_manual_edited: t.ocr_manual_edited,
      captured_at: t.captured_at,
      device_id: t.device_id,
    })
    await updateSyncStatus(id, {
      sync_status: 'synced',
      sent_at: nowISO(),
      last_error: null,
    })
    return true
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    await updateSyncStatus(id, {
      sync_status: 'failed',
      retry_count: (t.retry_count || 0) + 1,
      last_error: msg,
    })
    return false
  }
}

export async function syncAll(): Promise<SyncResult> {
  const pending = await listPendingTransaksi()
  const result: SyncResult = {
    total: pending.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  }

  for (const t of pending) {
    const ok = await syncOne(t.id)
    if (ok) {
      result.succeeded++
    } else {
      result.failed++
      result.errors.push({ id: t.id, error: t.last_error || 'failed' })
    }
  }

  return result
}
