import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TopBar } from '@/components/TopBar'
import { LCDDisplay } from '@/components/LCDDisplay'
import { StatusBadge } from '@/components/StatusBadge'
import { getTransaksi, getImageURL } from '@/lib/db'
import { syncOne } from '@/lib/sync'
import { useNetwork } from '@/store/network'
import { formatDateTimeID } from '@/lib/utils'
import { IconRefresh, IconQR, IconScale } from '@/components/Icons'
import type { Transaksi } from '@/types/transaksi'

export default function Detail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const online = useNetwork((s) => s.online)
  const [t, setT] = useState<Transaksi | null>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!id) return
    getTransaksi(id).then(async (res) => {
      if (!res) {
        navigate('/history', { replace: true })
        return
      }
      setT(res)
      setQrUrl(await getImageURL(res.qr_image_blob_id))
      setDisplayUrl(await getImageURL(res.display_image_blob_id))
    })
  }, [id, navigate])

  const handleResync = async () => {
    if (!t) return
    setSyncing(true)
    await syncOne(t.id)
    const refreshed = await getTransaksi(t.id)
    if (refreshed) setT(refreshed)
    setSyncing(false)
  }

  if (!t) {
    return (
      <div className="min-h-dvh flex flex-col bg-ink-0">
        <TopBar title="DETAIL TRANSAKSI" subtitle="// AUDIT" back="/history" />
        <div className="flex-1 flex items-center justify-center">
          <div className="font-mono text-xs text-bone-3 tracking-widest">MEMUAT...</div>
        </div>
      </div>
    )
  }

  const isCloud = t.ocr_source === 'cloud-confirmed' || t.ocr_source === 'cloud-mistral'
  const sourceLabel =
    t.ocr_source === 'cloud-confirmed'
      ? t.ocr_manual_edited
        ? 'CLOUD · OPERATOR EDIT'
        : 'CLOUD · OPERATOR CONFIRM'
      : t.ocr_source === 'cloud-mistral'
      ? 'CLOUD · UNCONFIRMED'
      : t.ocr_manual_edited
      ? 'LOCAL · MANUAL'
      : 'LOCAL · OCR'

  const fields: Array<[string, string]> = [
    ['F1 · NO.TRANSAKSI', t.nomor_kode_transaksi],
    ['F2 · OPERATOR', `${t.user_operator_code} / ${t.user_operator_name}`],
    ['F3 · PENGIRIM', t.entity_pengirim],
    ['F4 · PENERIMA', t.entity_penerima],
    ['F5 · QR CODE', t.qr_code_value],
    ['F8 · BERAT', `${t.berat_kg.toFixed(2)} KG`],
    ['F8.1 · SUMBER', sourceLabel],
    ['F9 · CAPTURED_AT', formatDateTimeID(t.captured_at)],
    ['F10 · SENT_AT', t.sent_at ? formatDateTimeID(t.sent_at) : '— PENDING —'],
    [
      'CONFIDENCE',
      isCloud
        ? `LOCAL ${Math.round((t.local_confidence ?? 0) * 100)}% · CLOUD-CONFIRMED`
        : `${Math.round(t.ocr_confidence * 100)}%`,
    ],
    ['DEVICE_ID', t.device_id],
  ]

  return (
    <div className="min-h-dvh flex flex-col bg-ink-0">
      <TopBar title="DETAIL TRANSAKSI" subtitle="// AUDIT" back="/history" />

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-4 flex items-center gap-3">
          <StatusBadge status={t.sync_status} />
          {online && t.sync_status !== 'synced' && (
            <button
              onClick={handleResync}
              disabled={syncing}
              className="ml-auto px-3 h-8 border border-pending/40 bg-pending/10 text-pending font-mono text-[10px] tracking-widest flex items-center gap-1.5"
            >
              <IconRefresh className={`w-3.5 h-3.5 ${syncing ? 'spin-slow' : ''}`} />
              SYNC
            </button>
          )}
        </div>

        <div className="px-5 mt-3">
          <div className="font-mono text-[10px] text-bone-3 tracking-[0.3em] mb-2">// HASIL TIMBANGAN</div>
          <LCDDisplay value={t.berat_kg} unit="kg" size="xl" />
        </div>

        <div className="px-5 mt-4 grid grid-cols-2 gap-3">
          <div className="border border-edge p-2">
            <div className="font-mono text-[9px] text-bone-3 tracking-widest mb-2">QR · {t.qr_code_value}</div>
            <div className="bg-ink-1 h-20 flex items-center justify-center overflow-hidden">
              {qrUrl ? <img src={qrUrl} alt="qr" className="w-full h-full object-cover" /> : <IconQR className="w-8 h-8 text-bone-3" />}
            </div>
          </div>
          <div className="border border-edge p-2">
            <div className="font-mono text-[9px] text-bone-3 tracking-widest mb-2">DISPLAY · 7-SEG</div>
            <div className="bg-ink-1 h-20 flex items-center justify-center overflow-hidden">
              {displayUrl ? <img src={displayUrl} alt="display" className="w-full h-full object-cover" /> : <IconScale className="w-8 h-8 text-bone-3" />}
            </div>
          </div>
        </div>

        {isCloud && (
          <div className="px-5 mt-5">
            <div className="font-mono text-[10px] text-safety tracking-[0.3em] mb-2 flex items-center gap-2">
              <span>// AUDIT TRAIL · CLOUD FALLBACK</span>
              <div className="flex-1 h-px bg-safety/30" />
            </div>
            <div className="bg-safety/10 border border-safety/40">
              <div className="hazard-stripe h-1" />
              <div className="grid grid-cols-2 gap-0">
                <div className="px-3 py-3 border-r border-safety/30">
                  <div className="font-mono text-[9px] text-bone-3 tracking-widest mb-1">LOCAL OCR</div>
                  <div className="font-mono text-sm text-bone-2 line-through">
                    "{t.local_predicted_text || '—'}"
                  </div>
                  <div className="font-mono text-[9px] text-bone-3 mt-1">
                    conf {Math.round((t.local_confidence ?? 0) * 100)}%
                  </div>
                </div>
                <div className="px-3 py-3 bg-safety/5">
                  <div className="font-mono text-[9px] text-safety tracking-widest mb-1">CLOUD (MISTRAL)</div>
                  <div className="font-mono text-sm text-bone-0 font-bold">
                    "{t.cloud_predicted_text || '—'}"
                  </div>
                  <div className="font-mono text-[9px] text-safety mt-1">
                    {t.ocr_manual_edited ? 'OPERATOR EDIT' : 'OPERATOR CONFIRM'}
                  </div>
                </div>
              </div>
              <div className="px-3 py-2 border-t border-safety/30 font-mono text-[9px] text-bone-2 leading-relaxed">
                Final value <span className="text-safety font-bold">{t.berat_kg.toFixed(2)} KG</span> di-verifikasi operator. Local OCR digunakan sebagai bandingan untuk training queue.
              </div>
            </div>
          </div>
        )}

        <div className="px-5 mt-5 mb-4">
          <div className="font-mono text-[10px] text-bone-3 tracking-[0.3em] mb-3 flex items-center gap-2">
            <span>// METADATA</span>
            <div className="flex-1 h-px bg-edge" />
          </div>
          <div className="space-y-0">
            {fields.map(([label, value]) => (
              <div key={label} className="flex items-baseline justify-between py-2 border-b border-edge">
                <span className="font-mono text-[10px] text-bone-3 tracking-widest">{label}</span>
                <span className="font-mono text-xs text-bone-0 text-right truncate ml-3 max-w-[60%]">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
