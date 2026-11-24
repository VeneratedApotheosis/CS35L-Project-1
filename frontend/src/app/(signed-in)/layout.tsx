import type { ReactNode } from "react"
import { ProtectedRoute } from "@/auth/ProtectedRoute"
import { AppShell } from "@/components/AppShell"
import { BadgeNotifierProvider } from "@/components/BadgeNotifier"
import { ProfileSetup } from "@/auth/ProfileSetup"

export default function SignedInLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <BadgeNotifierProvider>
        <AppShell>
          <ProfileSetup>{children}</ProfileSetup>
        </AppShell>
      </BadgeNotifierProvider>
    </ProtectedRoute>
  )
}
