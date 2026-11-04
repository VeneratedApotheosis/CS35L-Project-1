import type { LucideIcon, LucideProps } from "lucide-react"

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl"
export type IconTone = "default" | "muted" | "brand"

export interface IconProps extends Omit<LucideProps, "ref" | "size"> {
  /** The lucide icon component to render, e.g. `Calendar`. */
  icon: LucideIcon
  size?: IconSize
  tone?: IconTone
}

/**
 * Thin wrapper around a lucide icon that applies the design-system
 * `.icon` classes from `styles/components/icons.css`. Lucide draws with
 * `currentColor`, so icons inherit the surrounding text color by default.
 */
export function Icon({
  icon: LucideGlyph,
  size = "md",
  tone = "default",
  className,
  ...rest
}: IconProps) {
  const classes = [
    "icon",
    `icon--${size}`,
    tone !== "default" && `icon--${tone}`,
    className,
  ]
    .filter(Boolean)
    .join(" ")

  return <LucideGlyph aria-hidden="true" className={classes} {...rest} />
}
