import { useId, type ReactNode } from "react"

export interface GardenSectionProps {
  title: string
  /** Quiet text after the title, e.g. a count. */
  meta?: string
  /** Something at the top right, e.g. a button. */
  action?: ReactNode
  children: ReactNode
}

/** One section of the Garden in its own card: the title at the top left, the section's content below. */
export function GardenSection({ title, meta, action, children }: GardenSectionProps) {
  const heading = useId()
  return (
    <section aria-labelledby={heading} className="garden-section">
      <header className="garden-section__head">
        <h2 id={heading} className="garden-section__title">{title}</h2>
        {meta && <span className="garden-section__meta">{meta}</span>}
        {action && <div className="garden-section__action">{action}</div>}
      </header>
      <div className="garden-section__body">{children}</div>
    </section>
  )
}
