"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { BadgeMedal, tierLabels, type BadgeTier } from "@/components/AchievementBadge"
import { Card } from "@/components/Card"
import { Icon } from "@/components/Icon"
import { Sprout } from "lucide-react"
import { AchievementsPanel } from "./badges/AchievementsPanel"
import { FinishedHabitsPanel } from "./badges/FinishedHabitsPanel"
import {
  placeholderCategories, placeholderHabitBadges, placeholderSecretBadges,
  type PlaceholderAchievement, type PlaceholderCategory, type PlaceholderHabitBadge,
} from "./badges/placeholderBadges"

type Tab = "achievements" | "habits"
const tiers: BadgeTier[] = ["bronze", "silver", "gold", "platinum"]

/** The same list with every badge set back to locked, for the new-user look. */
function withNothingEarned(categories: PlaceholderCategory[]): PlaceholderCategory[] {
  return categories.map((category) => ({
    ...category,
    badges: category.badges.map((badge): PlaceholderAchievement => ({
      ...badge, state: "locked", earnedOn: undefined, progress: undefined,
    })),
  }))
}

/**
 * The Badges page (#253). MOCK: it reads placeholder data from
 * ./badges/placeholderBadges.ts because the badges backend is not built.
 * Add ?demo=empty to the address to see the new-user empty state.
 */
export default function Badges() {
  const empty = useSearchParams().get("demo") === "empty"
  const [tab, setTab] = useState<Tab>("achievements")

  const categories = empty ? withNothingEarned(placeholderCategories) : placeholderCategories
  const secretBadges: PlaceholderAchievement[] = empty ? [] : placeholderSecretBadges
  const habitBadges: PlaceholderHabitBadge[] = empty ? [] : placeholderHabitBadges

  // Unfound secret badges are never counted, so the total only grows when one is found.
  const all = [...categories.flatMap((category) => category.badges), ...secretBadges]
  const earned = all.filter((badge) => badge.state === "earned")
  const nextUp = all
    .filter((badge) => badge.state === "in_progress" && badge.progress)
    .sort((a, b) => b.progress!.count / b.progress!.target - a.progress!.count / a.progress!.target)[0]

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "achievements", label: "Achievements", count: earned.length },
    { id: "habits", label: "Finished habits", count: habitBadges.length },
  ]

  return (
    <main className="stack-lg">
      <header className="stack-sm">
        <h1 className="text-h1">Badges</h1>
        <p className="text-body text-secondary">Everything you have earned by showing up for your habits.</p>
      </header>

      <Card className="badge-summary">
        <div className="badge-summary__top">
          <div className="stack-sm">
            <h2 className="text-h2">{earned.length} of {all.length} earned</h2>
            <p className="text-body-sm text-secondary">
              {earned.length === 0 ? "Log your first activity to earn your first badge." : "Every badge you earn stays yours."}
            </p>
          </div>
          <div className="badge-summary__tiers" aria-label="Earned badges by tier">
            {tiers.map((tier) => (
              <div key={tier} className="badge-summary__tier">
                <BadgeMedal tier={tier} size="sm" state={earned.some((badge) => badge.tier === tier) ? "earned" : "locked"}
                  art={{ icon: Sprout }} />
                <div className="stack-sm badge-summary__tier-text">
                  <strong>{earned.filter((badge) => badge.tier === tier).length}</strong>
                  <span className="text-caption text-muted">{tierLabels[tier]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {nextUp?.progress && (
          <div className="badge-next">
            <BadgeMedal tier={nextUp.tier} state="in_progress" size="sm" art={nextUp.art} progress={nextUp.progress.count / nextUp.progress.target} />
            <p className="text-body-sm">
              <span className="text-secondary">Next up: </span><strong>{nextUp.name}</strong>
              <span className="text-secondary">, {nextUp.progress.target - nextUp.progress.count} to go.</span>
            </p>
          </div>
        )}
        {earned.length === 0 && (
          <p className="badge-next text-body-sm text-secondary"><Icon icon={Sprout} size="sm" tone="brand" />Badges appear here as you earn them. Plant a habit and water it to begin.</p>
        )}
      </Card>

      <div className="badge-tabs" role="tablist" aria-label="Badge types">
        {tabs.map(({ id, label, count }) => (
          <button key={id} type="button" role="tab" id={`badge-tab-${id}`} aria-selected={tab === id} aria-controls={`badge-panel-${id}`}
            tabIndex={tab === id ? 0 : -1} className="badge-tab"
            onClick={() => setTab(id)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
              event.preventDefault()
              const next: Tab = id === "achievements" ? "habits" : "achievements"
              setTab(next)
              document.getElementById(`badge-tab-${next}`)?.focus()
            }}>
            {label}<span className="badge-tab__count">{count}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`badge-panel-${tab}`} aria-labelledby={`badge-tab-${tab}`} tabIndex={0} className="badge-panel">
        {tab === "achievements"
          ? <AchievementsPanel categories={categories} secretBadges={secretBadges} />
          : <FinishedHabitsPanel habits={habitBadges} />}
      </div>
    </main>
  )
}
