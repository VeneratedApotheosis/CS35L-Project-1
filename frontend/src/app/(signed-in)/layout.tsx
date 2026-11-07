import type { ReactNode } from "react"
import { ProtectedRoute } from "@/auth/ProtectedRoute"
import { AppShell } from "@/components/AppShell"
import { ProfileSetup } from "@/auth/ProfileSetup"

export default function SignedInLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>
        <ProfileSetup>{children}</ProfileSetup>
      </AppShell>
    </ProtectedRoute>
  )
}
