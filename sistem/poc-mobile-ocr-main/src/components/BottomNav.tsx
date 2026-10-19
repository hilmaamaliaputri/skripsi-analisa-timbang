import { NavLink } from 'react-router-dom'
import { IconHome, IconList, IconSettings } from './Icons'

const items = [
  { to: '/dashboard', label: 'HOME', Icon: IconHome },
  { to: '/history', label: 'RIWAYAT', Icon: IconList },
  { to: '/settings', label: 'PENGATURAN', Icon: IconSettings },
]

export function BottomNav() {
  return (
    <nav className="grid grid-cols-3 border-t border-edge bg-ink-1 flex-shrink-0">
      {items.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `py-3 flex flex-col items-center gap-1 border-t-2 ${
              isActive
                ? 'border-safety bg-safety/5 text-safety'
                : 'border-transparent text-bone-2'
            }`
          }
        >
          <Icon className="w-5 h-5" />
          <span className="font-mono text-[9px] tracking-widest">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
