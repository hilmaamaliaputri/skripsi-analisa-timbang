import { useNavigate } from 'react-router-dom'
import { IconChevL } from './Icons'

interface Props {
  title: string
  subtitle?: string
  back?: boolean | string
  right?: React.ReactNode
}

export function TopBar({ title, subtitle, back, right }: Props) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center px-5 pt-3 pb-3 border-b border-edge flex-shrink-0">
      {back ? (
        <button
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          className="w-10 h-10 border border-edge bg-ink-1 flex items-center justify-center"
          aria-label="back"
        >
          <IconChevL className="w-5 h-5 text-bone-0" />
        </button>
      ) : (
        <div className="w-10" />
      )}
      <div className="flex-1 text-center">
        {subtitle && (
          <div className="font-mono text-[10px] text-safety tracking-[0.3em]">{subtitle}</div>
        )}
        <div className="font-display text-base tracking-wider">{title}</div>
      </div>
      <div className="w-10 flex justify-end">{right}</div>
    </div>
  )
}
