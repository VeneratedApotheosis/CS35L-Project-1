"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Icon } from "./Icon"

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"
export type ButtonSize = "sm" | "md" | "lg"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Stretch to fill the container width. */
  full?: boolean
  /** Optional leading lucide icon. */
  icon?: LucideIcon
  iconPosition?: "start" | "end"
  children?: ReactNode
}

/**
 * Button styled entirely with the design-system classes from
 * `styles/components/buttons.css`. Variants, sizes, and width come from
 * `.button--*` modifiers; icons are rendered via the shared `Icon` wrapper.
 */
export function Button({
  variant = "primary",
  size = "md",
  full = false,
  icon,
  iconPosition = "start",
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "button",
    `button--${variant}`,
    `button--${size}`,
    full && "button--full",
    className,
  ]
    .filter(Boolean)
    .join(" ")

  const glyph = icon && <Icon icon={icon} size="sm" />

  return (
    <button type={type} className={classes} {...rest}>
      {iconPosition === "start" && glyph}
      {children != null && <span>{children}</span>}
      {iconPosition === "end" && glyph}
    </button>
  )
}
