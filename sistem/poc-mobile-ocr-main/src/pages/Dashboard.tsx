import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useAuth } from '@/store/auth'
import { useNetwork } from '@/store/network'
import { db, countByStatus, getImageURL } from '@/lib/db'
import { useCapture } from '@/store/capture'
import { BottomNav } from '@/components/BottomNav'
import { HazardStripe } from '@/components/HazardStripe'
import { LCDDisplay } from '@/components/LCDDisplay'
import { StatusDot } from '@/components/StatusBadge'
import { IconQR, IconChevR, IconWifi, IconWifiOff } from '@/components/Icons'
import { formatTimeID } from '@/lib/utils'

export default function Dashboard() {
  const navigate = useNavigate()
  const operator = useAuth((s) => s.operator)
  const online = useNetwork((s) => s.online)
  const resetCapture = useCapture((s) => s.reset)

  const stats = useLiveQuery(() => countByStatus(), [], { total: 0, pending: 0, synced: 0 })
  const recent = useLiveQuery(
    () => db.transaksi.orderBy('captured_at').reverse().limit(5).toArray(),
    [],
    [],
  )

  const initials = operator?.name
    .split(' ')
    .map((s) => s[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'OP'

  const startCapture = () => {
    resetCapture()
    navigate('/capture/qr')
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-edge">
        <div className="w-11 h-11 bg-safety/15 border border-safety/40 flex items-center justify-center">
          <span className="font-display text-lg text-safety">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-display text-base tracking-wide truncate">{operator?.name || '—'}</div>
          <div className="font-mono text-[10px] text-bone-3 tracking-widest truncate">
            {operator?.code} · {operator?.entity_pengirim}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {online ? <IconWifi className="w-4 h-4 text-ok" /> : <IconWifiOff className="w-4 h-4 text-pending" />}
        </div>
      </div>

      <div className="px-5 pt-4 flex-1 overflow-y-auto">
        {!online && (
          <div className="flex items-stretch border border-pending/40 bg-pending/5 mb-4">
            <div className="hazard-stripe w-2" />
            <div className="flex-1 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <IconWifiOff className="w-4 h-4 text-pending" />
                <span className="font-display text-sm tracking-wide text-pending">MODE OFFLINE</span>
                {stats.pending > 0 && (
                  <span className="ml-auto font-mono text-[10px] text-bone-2">{stats.pending} ANTRIAN</span>
                )}
              </div>
              <p className="font-mono text-[10px] text-bone-2 mt-0.5">Data tersimpan lokal · auto-sync saat online</p>
            </div>
          </div>
        )}

        <div className="flex items-baseline justify-between">
          <div>
            <div className="font-mono text-[10px] text-bone-3 tracking-[0.3em]">SHIFT POC</div>
            <div className="font-display text-2xl mt-0.5">DASHBOARD</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-ink-1 border border-edge p-3">
            <div className="font-mono text-[9px] text-bone-3 tracking-widest mb-2">TOTAL</div>
            <div className="font-display text-3xl text-bone-0 leading-none">{stats.total}</div>
          </div>
          <div className="bg-ink-1 border border-pending/40 p-3 relative">
            {stats.pending > 0 && (
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-pending glow-pending pulse" />
            )}
            <div className="font-mono text-[9px] text-pending tracking-widest mb-2">PENDING</div>
            <div className="font-display text-3xl text-pending leading-none">{stats.pending}</div>
          </div>
          <div className="bg-ink-1 border border-edge p-3">
            <div className="font-mono text-[9px] text-synced tracking-widest mb-2">SYNCED</div>
            <div className="font-display text-3xl text-bone-0 leading-none">{stats.synced}</div>
          </div>
        </div>

        <button onClick={startCapture} className="mt-5 relative w-full overflow-hidden">
          <div className="bg-safety relative h-[88px] flex items-center px-5 gap-4">
            <div className="w-14 h-14 bg-obsidian flex items-center justify-center">
              <IconQR className="w-8 h-8 text-safety" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-display text-2xl text-obsidian tracking-wider leading-none">MULAI TRANSAKSI</div>
              <div className="font-mono text-[10px] text-obsidian/70 tracking-widest mt-1.5">SCAN QR → CAPTURE → REVIEW</div>
            </div>
            <IconChevR className="w-6 h-6 text-obsidian" />
          </div>
          <HazardStripe />
        </button>

        <div className="mt-5 flex items-center justify-between">
          <span className="font-mono text-[10px] text-bone-3 tracking-[0.3em]">// TRANSAKSI TERAKHIR</span>
          <button
            onClick={() => navigate('/history')}
            className="font-mono text-[10px] text-safety"
          >
            LIHAT SEMUA →
          </button>
        </div>

        <div className="mt-3 space-y-2 mb-4">
          {recent && recent.length === 0 && (
            <div className="bg-ink-1 border border-edge px-4 py-6 text-center">
              <div className="font-mono text-[10px] text-bone-3 tracking-widest">BELUM ADA TRANSAKSI</div>
              <div className="font-mono text-[10px] text-bone-3 mt-1">Tap MULAI TRANSAKSI di atas</div>
            </div>
          )}
          {recent?.map((t) => (
            <button
              key={t.id}
              onClick={() => navigate(`/history/${t.id}`)}
              className={`w-full flex items-center gap-3 bg-ink-1 px-3 py-2.5 text-left border-l-2 ${
                t.sync_status === 'synced' ? 'border-synced' : 'border-pending'
              }`}
            >
              <div className="font-mono text-[10px] text-bone-3 tabular-nums">{formatTimeID(t.captured_at)}</div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-xs text-bone-0 truncate">{t.qr_code_value}</div>
                <div className="font-mono text-[9px] text-bone-3 truncate">{t.entity_penerima}</div>
              </div>
              <div className="lcd text-base">
                {t.berat_kg.toFixed(2)}
                <span className="text-[10px] ml-0.5">kg</span>
              </div>
              <StatusDot status={t.sync_status} />
            </button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
