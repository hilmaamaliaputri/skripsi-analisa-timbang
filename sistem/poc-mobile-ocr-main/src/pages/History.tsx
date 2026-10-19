import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/db'
import { BottomNav } from '@/components/BottomNav'
import { TopBar } from '@/components/TopBar'
import { StatusDot } from '@/components/StatusBadge'
import { formatDateID, formatTimeID } from '@/lib/utils'
import { syncAll } from '@/lib/sync'
import { useNetwork } from '@/store/network'
import { IconRefresh } from '@/components/Icons'

type Filter = 'all' | 'pending' | 'synced'

export default function History() {
  const navigate = useNavigate()
  const online = useNetwork((s) => s.online)
  const [filter, setFilter] = useState<Filter>('all')
  const [syncing, setSyncing] = useState(false)

  const all = useLiveQuery(() => db.transaksi.orderBy('captured_at').reverse().toArray(), [], [])

  const filtered = useMemo(() => {
    if (!all) return []
    if (filter === 'all') return all
    if (filter === 'pending') return all.filter((t) => t.sync_status === 'pending' || t.sync_status === 'failed')
    return all.filter((t) => t.sync_status === 'synced')
  }, [all, filter])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    for (const t of filtered) {
      const date = formatDateID(t.captured_at)
      const arr = map.get(date) || []
      arr.push(t)
      map.set(date, arr)
    }
    return Array.from(map.entries())
  }, [filtered])

  const counts = useMemo(() => {
    if (!all) return { all: 0, pending: 0, synced: 0 }
    return {
      all: all.length,
      pending: all.filter((t) => t.sync_status === 'pending' || t.sync_status === 'failed').length,
      synced: all.filter((t) => t.sync_status === 'synced').length,
    }
  }, [all])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncAll()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-ink-0">
      <TopBar
        title="RIWAYAT"
        subtitle="// AUDIT"
        right={
          online && counts.pending > 0 ? (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="w-10 h-10 border border-edge bg-ink-1 flex items-center justify-center"
              aria-label="sync"
            >
              <IconRefresh className={`w-5 h-5 text-safety ${syncing ? 'spin-slow' : ''}`} />
            </button>
          ) : null
        }
      />

      <div className="px-5 mt-3 flex gap-1.5 overflow-hidden flex-shrink-0">
        {(['all', 'pending', 'synced'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 h-8 font-mono text-[10px] tracking-widest flex items-center gap-1.5 ${
              filter === f
                ? f === 'pending'
                  ? 'bg-pending text-obsidian'
                  : f === 'synced'
                  ? 'bg-synced text-obsidian'
                  : 'bg-safety text-obsidian'
                : 'border border-edge text-bone-1'
            }`}
          >
            {f === 'pending' && <span className="w-1.5 h-1.5 bg-pending" />}
            {f === 'synced' && <span className="w-1.5 h-1.5 bg-synced" />}
            {f.toUpperCase()} · {counts[f]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-2">
        {grouped.length === 0 && (
          <div className="bg-ink-1 border border-edge px-4 py-12 text-center">
            <div className="font-mono text-[10px] text-bone-3 tracking-widest">TIDAK ADA TRANSAKSI</div>
          </div>
        )}

        {grouped.map(([date, items]) => (
          <div key={date} className="mb-4">
            <div className="font-mono text-[10px] text-bone-3 tracking-[0.3em] mb-2 flex items-center gap-3">
              <span className="text-safety">●</span>
              <span>{date}</span>
              <div className="flex-1 h-px bg-edge" />
              <span>{items.length}</span>
            </div>
            <div className="space-y-1.5">
              {items.map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/history/${t.id}`)}
                  className={`w-full bg-ink-1 px-3 py-3 text-left flex items-center gap-3 border-l-2 ${
                    t.sync_status === 'synced'
                      ? 'border-synced'
                      : t.sync_status === 'failed'
                      ? 'border-err'
                      : 'border-pending'
                  }`}
                >
                  <div className="font-mono text-[11px] text-bone-3 tabular-nums">{formatTimeID(t.captured_at)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-bone-0 truncate">{t.qr_code_value}</div>
                    <div className="font-mono text-[9px] text-bone-3 truncate">{t.entity_penerima}</div>
                  </div>
                  <div className="lcd text-lg">
                    {t.berat_kg.toFixed(2)}
                    <span className="text-[10px] ml-0.5">kg</span>
                  </div>
                  <StatusDot status={t.sync_status} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  )
}
