"use client"

import { useEffect, useRef } from "react"
import { X } from "lucide-react"
import { Button } from "./Button"

export interface ToastProps {
  message: string
  onDismiss: () => void
  variant?: "success" | "error"
  duration?: number
  action?: { label: string; onClick: () => void }
}

/** Mount a fresh Toast (or change its key) for each new notification. */
export function Toast({ message, onDismiss, variant = "success", duration = 5000, action }: ToastProps) {
  const dismissRef = useRef(onDismiss)
  useEffect(() => { dismissRef.current = onDismiss }, [onDismiss])
  useEffect(() => {
    const timer = window.setTimeout(() => dismissRef.current(), duration)
    return () => window.clearTimeout(timer)
  }, [duration])

  return (
    <div className={`toast toast--${variant}`}>
      <p className="toast__message" role={variant === "error" ? "alert" : "status"} aria-atomic="true">
        {variant === "error" && <strong>Error: </strong>}{message}
      </p>
      {action && <Button variant="ghost" size="sm" onClick={() => { action.onClick(); onDismiss() }}>{action.label}</Button>}
      <Button variant="ghost" size="sm" icon={X} aria-label="Dismiss notification" onClick={onDismiss} />
    </div>
  )
}
