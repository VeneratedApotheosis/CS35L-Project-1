"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/auth/useAuth"
import { badgeKeys, getUnseenBadges, markBadgesSeen, type ApiBadge } from "@/lib/badges"
import { badgeIcon } from "@/views/badges/badgeIcons"
import { BadgeMedal, BadgePills } from "./AchievementBadge"
import { Button } from "./Button"
import { Modal } from "./Modal"
import { Toast } from "./Toast"

interface BadgeNotifier {
  /** Queues badges for their "Badge earned" moment. Safe to call with `undefined` or an empty list. */
  push: (badges: ApiBadge[] | undefined | null) => void
}

// Outside the provider (tests that render one view) pushing does nothing.
const BadgeNotifierContext = createContext<BadgeNotifier>({ push: () => {} })

export const useBadgeNotifier = (): BadgeNotifier => useContext(BadgeNotifierContext)

/** Bronze and Silver get a toast. Gold, Platinum and secret badges get the larger dialog. */
const isBigMoment = (badge: ApiBadge) => badge.secret || badge.tier === "gold" || badge.tier === "platinum"

/**
 * Shows the "Badge earned" moment for new badges, one at a time. Writes that
 * earn badges (a log, a new habit, a name change) push them from their
 * response. On load it also asks for badges earned while the app was closed,
 * such as a habit that expired overnight. Each badge is marked seen once it
 * is shown, so it never shows again on any device. See docs/badges-plan.md.
 */
export function BadgeNotifierProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const client = useQueryClient()
  const [queue, setQueue] = useState<ApiBadge[]>([])
  // Ids already queued, so a badge from both a response and the load check shows once.
  const queued = useRef(new Set<string>())
  const checkedFor = useRef<string | null>(null)

  const push = useCallback((badges: ApiBadge[] | undefined | null) => {
    const fresh = (badges ?? []).filter((badge) => !queued.current.has(badge.id))
    if (fresh.length === 0) return
    for (const badge of fresh) queued.current.add(badge.id)
    setQueue((current) => [...current, ...fresh])
    if (user) void client.invalidateQueries({ queryKey: badgeKeys.book(user.id) })
  }, [client, user])

  // Badges earned since the last visit, once per signed-in user.
  useEffect(() => {
    if (!user || checkedFor.current === user.id) return
    checkedFor.current = user.id
    getUnseenBadges().then((result) => push(result.badges)).catch(() => {})
  }, [user, push])

  const current = queue[0]
  // Marked seen when it is shown, not when it was queued.
  useEffect(() => {
    if (current) markBadgesSeen([current.id]).catch(() => {})
  }, [current])

  const next = useCallback(() => setQueue((items) => items.slice(1)), [])
  const view = useCallback(() => {
    next()
    router.push("/badges")
  }, [next, router])

  const value = useMemo(() => ({ push }), [push])

  return (
    <BadgeNotifierContext.Provider value={value}>
      {children}
      {current && !isBigMoment(current) && (
        <Toast key={current.id} className="toast--raised" message={`Badge earned: ${current.name}.`} onDismiss={next}
          action={{ label: "View badges", onClick: () => router.push("/badges") }} />
      )}
      {current && isBigMoment(current) && (
        <Modal key={current.id} open onClose={next} title={current.secret ? "Secret badge found" : "Badge earned"} description={current.description}>
          <div className="badge-spotlight">
            <BadgeMedal tier={current.tier} size="lg" secret={current.secret} art={{ icon: badgeIcon(current.id) }} />
            <div className="stack-sm">
              <h3 className="text-h2">{current.name}</h3>
              <p><BadgePills tier={current.tier} secret={current.secret} /></p>
            </div>
            <div className="badge-spotlight__actions">
              <Button variant="secondary" onClick={view}>View badges</Button>
              <Button onClick={next}>Nice</Button>
            </div>
          </div>
        </Modal>
      )}
    </BadgeNotifierContext.Provider>
  )
}
