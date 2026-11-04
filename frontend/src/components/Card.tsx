import type { HTMLAttributes, ReactNode } from "react"

export type CardVariant = "default" | "elevated" | "muted"

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  children?: ReactNode
}

/**
 * Surface container using the design-system classes from
 * `styles/components/cards.css`. `elevated` adds a popover shadow,
 * `muted` uses the secondary surface color.
 */
export function Card({
  variant = "default",
  className,
  children,
  ...rest
}: CardProps) {
  const classes = [
    "card",
    variant !== "default" && `card--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
