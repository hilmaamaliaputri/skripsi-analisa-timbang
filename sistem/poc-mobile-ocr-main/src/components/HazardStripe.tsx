interface Props {
  height?: number
  className?: string
}

export function HazardStripe({ height = 6, className = '' }: Props) {
  return <div className={`hazard-stripe ${className}`} style={{ height }} />
}
