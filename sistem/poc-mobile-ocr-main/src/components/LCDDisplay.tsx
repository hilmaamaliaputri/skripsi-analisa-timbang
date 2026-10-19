interface Props {
  value: number | string | null
  unit?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showDecimal?: boolean
}

export function LCDDisplay({ value, unit = 'kg', size = 'lg', showDecimal = true }: Props) {
  const display = (() => {
    if (value === null || value === undefined) return '——.——'
    if (typeof value === 'number') return showDecimal ? value.toFixed(2) : String(Math.round(value))
    return value
  })()

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-7xl',
  }[size]

  const unitSize = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
    xl: 'text-base',
  }[size]

  return (
    <div className="lcd-bg relative flex items-baseline justify-center gap-2 px-4 py-3 overflow-hidden">
      <div className={`lcd ${sizeClasses} tabular-nums tracking-wider`}>{display}</div>
      <div className={`lcd ${unitSize} pb-1`}>{unit}</div>
      <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-l border-t border-safety/30" />
      <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-r border-t border-safety/30" />
      <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-l border-b border-safety/30" />
      <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-r border-b border-safety/30" />
    </div>
  )
}
