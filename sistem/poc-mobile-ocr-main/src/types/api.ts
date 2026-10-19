export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  operator: {
    code: string
    name: string
    entity_pengirim: string
  }
}

export interface SyncTransaksiRequest {
  id: string
  nomor_kode_transaksi: string
  user_operator_code: string
  entity_pengirim: string
  entity_penerima: string
  qr_code_value: string
  berat_kg: number
  ocr_confidence: number
  ocr_manual_edited: boolean
  captured_at: string
  device_id: string
}

export interface SyncTransaksiResponse {
  id: string
  received_at: string
}

export interface ApiError {
  error: string
  code?: string
}
