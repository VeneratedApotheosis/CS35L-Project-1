export interface ProgressRingProps {
  label: string
  /** Backend fraction from 0 to 1, or null when a total goal does not exist. */
  value: number | null
}

export function ProgressRing({ label, value }: ProgressRingProps) {
  const percentage = value === null ? null : Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div className="progress-ring" role={percentage === null ? "img" : "progressbar"}
      aria-label={percentage === null ? `${label}: unavailable` : label}
      aria-valuemin={percentage === null ? undefined : 0}
      aria-valuemax={percentage === null ? undefined : 100}
      aria-valuenow={percentage ?? undefined}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="progress-ring__track" cx="50" cy="50" r="44" />
        <circle className="progress-ring__fill" cx="50" cy="50" r="44" pathLength="100"
          strokeDasharray={`${percentage ?? 0} 100`} transform="rotate(-90 50 50)" />
      </svg>
      <span className="progress-ring__value text-h2" aria-hidden="true">{percentage === null ? "—" : `${percentage}%`}</span>
    </div>
  )
}
