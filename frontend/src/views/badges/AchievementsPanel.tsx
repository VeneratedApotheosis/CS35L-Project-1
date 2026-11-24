"use client"

import { useState } from "react"
import { BadgeCard, type BadgeState } from "@/components/AchievementBadge"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import type { PlaceholderAchievement, PlaceholderCategory } from "./placeholderBadges"

type Filter = "all" | BadgeState

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "earned", label: "Earned" },
  { value: "in_progress", label: "In progress" },
  { value: "locked", label: "Locked" },
]

function Grid({ badges }: { badges: PlaceholderAchievement[] }) {
  return (
    <ul className="badge-grid" role="list">
      {badges.map(({ id, ...badge }) => <li key={id} className="badge-grid__item"><BadgeCard {...badge} /></li>)}
    </ul>
  )
}

/** Every achievement badge, grouped, with a filter. Secret badges are listed only once found, under their own heading. */
export function AchievementsPanel({ categories, secretBadges }: {
  categories: PlaceholderCategory[]
  secretBadges: PlaceholderAchievement[]
}) {
  const [filter, setFilter] = useState<Filter>("all")
  const matches = (badge: PlaceholderAchievement) => filter === "all" || badge.state === filter
  const shownCategories = categories
    .map((category) => ({ ...category, badges: category.badges.filter(matches) }))
    .filter((category) => category.badges.length > 0)
  const shownSecrets = secretBadges.filter(matches)
  const nothing = shownCategories.length === 0 && shownSecrets.length === 0

  return (
    <div className="stack-lg">
      <div className="badge-filters" role="group" aria-label="Show badges">
        {filters.map(({ value, label }) => (
          <Button key={value} size="sm" variant={filter === value ? "primary" : "secondary"} aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {label}
          </Button>
        ))}
      </div>

      {nothing && (
        <Card><p className="text-body text-secondary">No badges here yet. Keep growing and they will show up.</p></Card>
      )}

      {shownCategories.map((category) => (
        <section key={category.id} className="stack-md" aria-labelledby={`badges-${category.id}`}>
          <h2 className="text-h2" id={`badges-${category.id}`}>{category.title}</h2>
          <Grid badges={category.badges} />
        </section>
      ))}

      {shownSecrets.length > 0 && (
        <section className="stack-md" aria-labelledby="badges-secret">
          <div className="stack-sm">
            <h2 className="text-h2" id="badges-secret">Secret badges</h2>
            <p className="text-body-sm text-secondary">Hidden badges you found by surprise. There may be more out there.</p>
          </div>
          <Grid badges={shownSecrets} />
        </section>
      )}
    </div>
  )
}
