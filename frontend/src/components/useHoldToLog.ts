"use client"

import { useEffect, useRef, useState, type PointerEvent, type MouseEvent } from "react"

/** Keep ordinary clicks intact; consume the click generated after a completed hold. */
export function useHoldToLog(action?: () => void) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const origin = useRef<{ x: number; y: number } | null>(null)
  const consumed = useRef(false)
  function cancel() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    origin.current = null
    setHolding(false)
  }
  useEffect(() => {
    window.addEventListener("blur", cancel)
    window.addEventListener("scroll", cancel, true)
    return () => {
      if (timer.current) clearTimeout(timer.current)
      window.removeEventListener("blur", cancel)
      window.removeEventListener("scroll", cancel, true)
    }
  }, [])
  return {
    holding,
    handlers: {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        cancel()
        consumed.current = false
        if (!action || event.button !== 0 || event.isPrimary === false) return
        origin.current = { x: event.clientX, y: event.clientY }
        setHolding(true)
        timer.current = setTimeout(() => {
          consumed.current = true
          cancel()
          action()
        }, 1000)
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        if (origin.current && Math.hypot(event.clientX - origin.current.x, event.clientY - origin.current.y) > 10) cancel()
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      onBlur: cancel,
      onContextMenu(event: MouseEvent<HTMLElement>) { if (action) event.preventDefault() },
      onDragStart(event: MouseEvent<HTMLElement>) { if (action) { event.preventDefault(); cancel() } },
      onClickCapture(event: MouseEvent<HTMLElement>) {
        if (consumed.current && event.detail !== 0) {
          event.preventDefault()
          event.stopPropagation()
          consumed.current = false
        }
      },
    },
  }
}
