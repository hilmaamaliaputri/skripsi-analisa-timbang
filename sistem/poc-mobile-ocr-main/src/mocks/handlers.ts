import { http, HttpResponse, delay } from 'msw'
import { DEMO_OPERATOR } from './data'
import type { LoginRequest, SyncTransaksiRequest } from '@/types/api'

export const handlers = [
  http.get('/api/ping', () => HttpResponse.json({ ok: true, ts: new Date().toISOString() })),

  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as LoginRequest
    await delay(400)
    if (body.username === DEMO_OPERATOR.code && body.password === DEMO_OPERATOR.password) {
      return HttpResponse.json({
        token: 'mock-jwt-poc-' + Date.now(),
        operator: {
          code: DEMO_OPERATOR.code,
          name: DEMO_OPERATOR.name,
          entity_pengirim: DEMO_OPERATOR.entity_pengirim,
        },
      })
    }
    return HttpResponse.json({ error: 'Kredensial tidak valid' }, { status: 401 })
  }),

  http.post('/api/transactions', async ({ request }) => {
    const body = (await request.json()) as SyncTransaksiRequest
    await delay(800 + Math.random() * 600)

    // Simulate occasional failure (5%) to test retry logic
    if (Math.random() < 0.05) {
      return HttpResponse.json({ error: 'Server timeout' }, { status: 503 })
    }

    return HttpResponse.json({
      id: body.id,
      received_at: new Date().toISOString(),
    })
  }),
]
