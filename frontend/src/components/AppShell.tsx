"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { NavBar } from "./NavBar"

export type PageWidth = "medium" | "wide" | "full"

/** Habit details, and the shared habit page that reuses its layout, are grids of cards. */
const WIDE_PATHS = ["/habit", "/shared-habit"]

/** Which vertical padding a route gets (width and side margins are the same for all). Routes not listed here are medium. See "Page width and margin" in docs/frontend/design.md. */
export function pageWidth(pathname: string | null): PageWidth {
  const path = pathname && pathname !== "/" ? pathname.replace(/\/$/, "") : pathname
  if (path === "/") return "full"
  if (path && WIDE_PATHS.includes(path)) return "wide"
  return "medium"
}

/** Shared layout for signed-in routes; individual screens own their main landmark. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const width = pageWidth(pathname)

  return (
    <div className={width === "medium" ? "app-shell" : `app-shell app-shell--${width}`}>
      <a href="#page-content" className="app-shell__skip">Skip to content</a>
      <NavBar currentPath={pathname} />
      <div id="page-content" tabIndex={-1} className="app-shell__content">
        {children}
      </div>
    </div>
  )
}
