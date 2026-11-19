"use client"

import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export interface AuthContextValue {
  session: Session | null
  user: User | null

  // true until the stored session has been restored on page load
  loading: boolean
  /** Preserve an invite through OAuth; ordinary sign-in still returns to Garden. */
  signInWithGoogle: (inviteCode?: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)
