"use client"

import { useState, type ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"

function AccountQueries({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

/** Discard the previous account's cache whenever the signed-in user changes. */
export function QueryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  return <AccountQueries key={user?.id ?? "signed-out"}>{children}</AccountQueries>
}
