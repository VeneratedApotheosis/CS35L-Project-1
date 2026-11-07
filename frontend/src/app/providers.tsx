"use client"

import type { ReactNode } from "react"
import { AuthProvider } from "@/auth/AuthProvider"
import { ThemeProvider } from "@/styles/ThemeProvider"
import { QueryProvider } from "@/lib/QueryProvider"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <QueryProvider>{children}</QueryProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
