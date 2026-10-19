import type { SyncStatus } from '@/types/transaksi'

interface Props {
  status: SyncStatus
  size?: 'sm' | 'md'
}

export function StatusDot({ status }: { status: SyncStatus }) {
  if (status === 'synced') return <span className="inline-block w-2 h-2 rounded-full bg-synced glow-synced" />
  if (status === 'syncing') return <span className="inline-block w-2 h-2 rounded-full bg-pending glow-pending pulse" />
  if (status === 'failed') return <span className="inline-block w-2 h-2 rounded-full bg-err pulse" />
  return <span className="inline-block w-2 h-2 rounded-full bg-pending glow-pending" />
}

const STYLES: Record<SyncStatus, { label: string; cls: string; dot: string }> = {
  pending: {
    label: 'OFFLINE',
    cls: 'bg-pending/10 border-pending/50 text-pending',
    dot: 'bg-pending glow-pending',
  },
  syncing: {
    label: 'SYNCING',
    cls: 'bg-pending/10 border-pending/50 text-pending',
    dot: 'bg-pending glow-pending pulse',
  },
  synced: {
    label: 'SYNCED',
    cls: 'bg-synced/10 border-synced/50 text-synced',
    dot: 'bg-synced glow-synced',
  },
  failed: {
    label: 'GAGAL',
    cls: 'bg-err/10 border-err/50 text-err',
    dot: 'bg-err',
  },
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const s = STYLES[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono tracking-widest border ${s.cls} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-1 text-[10px]'
      }`}
    >
      <span className={`w-1.5 h-1.5 ${s.dot}`} />
      {s.label}
    </span>
  )
}
