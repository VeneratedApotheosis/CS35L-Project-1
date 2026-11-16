export interface ProgressBarProps {
  /** A descriptive accessible label, e.g. "Reading this week". */
  label: string
  /** Optional shorter caption; the accessible label stays descriptive. */
  caption?: string
  /** Logged activities; may exceed the target. */
  count: number
  /** Whole-number goal from 1 to 50. */
  target: number
  className?: string
}

// Keep small goals readable in narrow cards; larger goals use a continuous fill.
const MAX_SEGMENTED_TARGET = 10

/** Segmented small goals and continuous large goals; the count stays uncapped. */
export function ProgressBar({ label, caption, count, target, className }: ProgressBarProps) {
  if (!Number.isInteger(target) || target < 1 || target > 50) {
    throw new RangeError("ProgressBar target must be an integer from 1 to 50")
  }
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError("ProgressBar count must be a non-negative integer")
  }

  const completed = Math.min(count, target)
  const segmented = target <= MAX_SEGMENTED_TARGET

  return (
    <div className={["habit-progress", className].filter(Boolean).join(" ")}>
      <div className="habit-progress__caption text-body-sm" aria-hidden="true">
        <span>{caption ?? label}</span>
        <span className="habit-progress__count">{count}/{target}</span>
      </div>
      <div
        className={segmented
          ? "habit-progress__track habit-progress__track--segmented"
          : "habit-progress__track"}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={completed}
        aria-valuetext={`${count} of ${target} activities${count >= target ? ", goal met" : ""}`}
        style={segmented ? { gridTemplateColumns: `repeat(${target}, minmax(0, 1fr))` } : undefined}
      >
        {segmented ? Array.from({ length: target }, (_, step) => (
          <span
            key={step}
            aria-hidden="true"
            className={step < completed
              ? "habit-progress__step habit-progress__step--complete"
              : "habit-progress__step"}
          />
        )) : (
          <span
            aria-hidden="true"
            className="habit-progress__fill"
            style={{ width: `${(completed / target) * 100}%` }}
          />
        )}
      </div>
    </div>
  )
}
