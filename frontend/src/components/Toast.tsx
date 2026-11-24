"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { Button } from "./Button"
import { subscribeModalState } from "./modalState"

export interface ToastProps {
  message: string
  onDismiss: () => void
  variant?: "success" | "error"
  duration?: number
  action?: { label: string; onClick: () => void }
  /** Extra class, such as `toast--raised` to sit above another toast. */
  className?: string
}

// Toasts can be rendered in different parts of the app. Share one stack and
// one visual viewport subscription while at least one toast is mounted.
let stackUsers = 0
let stopViewport: (() => void) | undefined

function acquireStack() {
  let stack = document.getElementById("toast-stack")
  if (!stack) {
    stack = document.createElement("div")
    stack.id = "toast-stack"
    stack.className = "toast-stack"
    document.body.appendChild(stack)
  }
  stackUsers++
  if (stackUsers === 1 && window.visualViewport) {
    const viewport = window.visualViewport
    const update = () => {
      // Use the visible viewport while the keyboard is dismissing too; focus
      // can leave an input before the keyboard has finished closing.
      const inset = viewport.scale === 1 ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0
      stack!.style.setProperty("--keyboard-inset", `${inset}px`)
    }
    viewport.addEventListener("resize", update)
    viewport.addEventListener("scroll", update)
    update()
    stopViewport = () => {
      viewport.removeEventListener("resize", update)
      viewport.removeEventListener("scroll", update)
      stack!.style.removeProperty("--keyboard-inset")
    }
  }
  return stack
}

function releaseStack() {
  stackUsers--
  if (stackUsers === 0) {
    stopViewport?.()
    stopViewport = undefined
  }
}

function subscribeStack(notify: () => void) {
  acquireStack()
  notify()
  return releaseStack
}

const getStack = () => document.getElementById("toast-stack")
const getServerStack = () => null

/** Mount a fresh Toast (or change its key) for each new notification. */
export function Toast({ message, onDismiss, variant = "success", duration = 5000, action, className }: ToastProps) {
  const stack = useSyncExternalStore(subscribeStack, getStack, getServerStack)
  const dismissRef = useRef(onDismiss)
  const cancelTimer = useRef<() => void>(() => {})
  useEffect(() => { dismissRef.current = onDismiss }, [onDismiss])
  useEffect(() => {
    let remaining = duration
    let started = 0
    let timer: number | undefined
    let finished = false
    const cancel = () => {
      if (timer !== undefined) window.clearTimeout(timer)
      timer = undefined
      finished = true
    }
    cancelTimer.current = cancel
    const unsubscribe = subscribeModalState((open) => {
      if (finished) return
      if (open && timer !== undefined) {
        window.clearTimeout(timer)
        timer = undefined
        remaining = Math.max(0, remaining - (performance.now() - started))
      } else if (!open && timer === undefined) {
        started = performance.now()
        timer = window.setTimeout(() => {
          timer = undefined
          finished = true
          dismissRef.current()
        }, remaining)
      }
    })
    return () => { unsubscribe(); cancel() }
  }, [duration])

  const dismiss = () => { cancelTimer.current(); onDismiss() }

  return stack && createPortal(
    <div className={["toast", `toast--${variant}`, className].filter(Boolean).join(" ")}>
      <p className="toast__message" role={variant === "error" ? "alert" : "status"} aria-atomic="true">
        {variant === "error" && <strong>Error: </strong>}{message}
      </p>
      {action && <Button variant="ghost" size="sm" onClick={() => { action.onClick(); dismiss() }}>{action.label}</Button>}
      <Button variant="ghost" size="sm" icon={X} aria-label="Dismiss notification" onClick={dismiss} />
    </div>, stack
  )
}
