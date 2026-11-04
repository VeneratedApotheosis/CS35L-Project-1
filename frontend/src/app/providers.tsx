"use client"

import type { ReactNode } from "react"
import { AuthProvider } from "@/auth/AuthProvider"
import { ThemeProvider } from "@/styles/ThemeProvider"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  )
}
