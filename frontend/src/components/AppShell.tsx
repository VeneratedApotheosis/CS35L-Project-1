"use client"

import type { ReactNode } from "react"
import { usePathname } from "next/navigation"
import { NavBar } from "./NavBar"

/** Shared layout for signed-in routes; individual screens own their main landmark. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="app-shell">
      <a href="#page-content" className="app-shell__skip">Skip to content</a>
      <NavBar currentPath={pathname} />
      <div id="page-content" tabIndex={-1} className={`app-shell__content${pathname === "/" ? " app-shell__content--garden" : ""}`}>
        {children}
      </div>
    </div>
  )
}
