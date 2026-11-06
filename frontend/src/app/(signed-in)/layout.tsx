import type { ReactNode } from "react"
import { ProtectedRoute } from "@/auth/ProtectedRoute"
import { AppShell } from "@/components/AppShell"

export default function SignedInLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  )
}
