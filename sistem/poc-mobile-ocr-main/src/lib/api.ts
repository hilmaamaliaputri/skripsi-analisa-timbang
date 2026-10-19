import type {
  LoginRequest,
  LoginResponse,
  SyncTransaksiRequest,
  SyncTransaksiResponse,
} from '@/types/api'
import { DEMO_OPERATOR } from '@/mocks/data'

// POC uses in-process mock (works on HTTP non-localhost where MSW SW can't register).
// Saat BE asli ready, set VITE_API_URL → fetch real endpoint.
const API_BASE = import.meta.env.VITE_API_URL || ''
const USE_MOCK = !API_BASE

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function http<TReq, TRes>(method: string, path: string, body?: TReq): Promise<TRes> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

// ─── Mock implementations ───
async function mockLogin(req: LoginRequest): Promise<LoginResponse> {
  await sleep(400)
  if (req.username === DEMO_OPERATOR.code && req.password === DEMO_OPERATOR.password) {
    return {
      token: 'mock-jwt-poc-' + Date.now(),
      operator: {
        code: DEMO_OPERATOR.code,
        name: DEMO_OPERATOR.name,
        entity_pengirim: DEMO_OPERATOR.entity_pengirim,
      },
    }
  }
  throw new Error('Kredensial tidak valid')
}

async function mockSync(req: SyncTransaksiRequest): Promise<SyncTransaksiResponse> {
  await sleep(800 + Math.random() * 600)
  if (Math.random() < 0.05) throw new Error('Server timeout (simulasi 5%)')
  return { id: req.id, received_at: new Date().toISOString() }
}

// ─── Public API ───
export const api = {
  async login(req: LoginRequest): Promise<LoginResponse> {
    if (USE_MOCK) return mockLogin(req)
    return http<LoginRequest, LoginResponse>('POST', '/api/auth/login', req)
  },

  async syncTransaksi(req: SyncTransaksiRequest): Promise<SyncTransaksiResponse> {
    if (USE_MOCK) return mockSync(req)
    return http<SyncTransaksiRequest, SyncTransaksiResponse>('POST', '/api/transactions', req)
  },

  async ping(): Promise<{ ok: boolean }> {
    if (USE_MOCK) {
      await sleep(50)
      return { ok: true }
    }
    return http<undefined, { ok: boolean }>('GET', '/api/ping')
  },
}
