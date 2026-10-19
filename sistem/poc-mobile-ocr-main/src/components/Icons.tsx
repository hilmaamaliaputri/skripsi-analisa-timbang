type IconProps = { className?: string; strokeWidth?: number }

const base = 'currentColor'

export const IconQR = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <path d="M14 14h3v3" /><path d="M21 14v.01" /><path d="M21 18v3h-3" /><path d="M14 21v-2" /><path d="M18 18h.01" />
  </svg>
)

export const IconCamera = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

export const IconScale = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 7h18l-2 13H5L3 7z" /><path d="M8 7V5a4 4 0 0 1 8 0v2" /><path d="M9 13l3 3 3-3" />
  </svg>
)

export const IconCheck = ({ className = 'w-5 h-5', strokeWidth = 2.25 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="4 12 10 18 20 6" />
  </svg>
)

export const IconClock = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
)

export const IconWifi = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12.5a10 10 0 0 1 14 0" /><path d="M8.5 15.5a5 5 0 0 1 7 0" /><circle cx="12" cy="19" r="1" fill="currentColor" />
  </svg>
)

export const IconWifiOff = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12.5a10 10 0 0 1 4-2.6" /><path d="M19 12.5a10 10 0 0 0-3-2.4" /><path d="M8.5 15.5a5 5 0 0 1 3-1.4" /><line x1="3" y1="3" x2="21" y2="21" /><circle cx="12" cy="19" r="1" fill="currentColor" />
  </svg>
)

export const IconRefresh = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" /><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
  </svg>
)

export const IconCopy = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

export const IconEdit = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

export const IconSettings = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

export const IconChevR = ({ className = 'w-5 h-5', strokeWidth = 2 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 6 15 12 9 18" />
  </svg>
)

export const IconChevL = ({ className = 'w-5 h-5', strokeWidth = 2 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="15 6 9 12 15 18" />
  </svg>
)

export const IconX = ({ className = 'w-5 h-5', strokeWidth = 2 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="6" y1="6" x2="18" y2="18" /><line x1="6" y1="18" x2="18" y2="6" />
  </svg>
)

export const IconHome = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

export const IconList = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
)

export const IconUser = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
)

export const IconLock = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export const IconCloudUp = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
)

export const IconTrash = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
  </svg>
)

export const IconUpload = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

export const IconLogout = ({ className = 'w-5 h-5', strokeWidth = 1.75 }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={base} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)
