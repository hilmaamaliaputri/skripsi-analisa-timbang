export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function formatDateID(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}-${mm}-${yyyy}`
}

export function formatTimeID(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function formatDateTimeID(iso: string): string {
  return `${formatDateID(iso)} ${formatTimeID(iso)}`
}

export function formatBerat(kg: number | null): string {
  if (kg === null || kg === undefined) return '—'
  return kg.toFixed(2)
}

export function generateTrxCode(operatorCode: string): string {
  const d = new Date()
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `TRX-${operatorCode}-${stamp}-${rand}`
}

export function getDeviceId(): string {
  const KEY = 'device_id'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = uuid()
    localStorage.setItem(KEY, id)
  }
  return id
}

export const APP_VERSION = '0.1.0'
