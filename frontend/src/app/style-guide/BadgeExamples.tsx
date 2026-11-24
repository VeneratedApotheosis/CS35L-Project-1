"use client"

import { useState } from "react"
import {
  Crown, Droplets, Flame, Flower2, Hand, Leaf, Medal, Repeat, Sparkles, Sprout, Star, Sunrise, Target, TreeDeciduous, Trophy,
} from "lucide-react"
import { BadgeCard, BadgeMedal, tierLabels, type BadgeArt, type BadgeCardProps, type BadgeState, type BadgeTier } from "@/components/AchievementBadge"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { Modal } from "@/components/Modal"
import { Toast } from "@/components/Toast"

/** Local demo data drawn from docs/badges-ideas.md. Nothing here is saved or earned for real. */
const sampleBadges: (BadgeCardProps & { id: string })[] = [
  { id: "seed-money", name: "Seed Money", description: "Create your first habit.", tier: "bronze", state: "earned", art: { icon: Sprout }, earnedOn: "Nov 12" },
  { id: "first-drop", name: "First Drop of Water", description: "Log your first activity.", tier: "bronze", state: "earned", art: { icon: Droplets }, earnedOn: "Nov 12" },
  { id: "green-thumb", name: "Green Thumb", description: "Reach plant stage 2 on any habit.", tier: "bronze", state: "earned", art: { icon: Leaf }, earnedOn: "Nov 14" },
  { id: "full-bloom", name: "Full Bloom", description: "Reach plant stage 4 on any habit.", tier: "bronze", state: "earned", art: { icon: Flower2 }, earnedOn: "Nov 19" },
  { id: "habit-forming", name: "Habit Forming", description: "Reach a streak of 4.", tier: "bronze", state: "earned", art: { icon: Repeat }, earnedOn: "Nov 21" },
  { id: "gold-standard", name: "Gold Standard", description: "Earn a Gold on a habit.", tier: "silver", state: "earned", art: { icon: Medal }, earnedOn: "Nov 22" },
  { id: "triple-gold", name: "Triple Gold", description: "Earn Gold on 3 habits.", tier: "gold", state: "earned", art: { icon: Crown }, earnedOn: "Nov 23" },
  { id: "complete-collection", name: "Complete Collection", description: "Finish a habit with every plant type.", tier: "platinum", state: "earned", art: { icon: Flower2 }, earnedOn: "Nov 23" },
  { id: "early-bird", name: "Early Bird", description: "Log an activity before 6 AM.", tier: "bronze", state: "earned", art: { icon: Sunrise }, secret: true, earnedOn: "Nov 18" },
  { id: "ten-taps", name: "Ten Taps", description: "Log 10 activities in total.", tier: "bronze", state: "in_progress", art: { icon: Hand }, progress: { count: 7, target: 10 } },
  { id: "century-club", name: "Century Club", description: "Log 100 activities in total.", tier: "silver", state: "in_progress", art: { icon: Target }, progress: { count: 64, target: 100 } },
  { id: "half-year", name: "Half-Year Hero", description: "Reach a streak of 26.", tier: "gold", state: "in_progress", art: { icon: Flame }, progress: { count: 9, target: 26 } },
  { id: "perfect-score", name: "Perfect Score", description: "Finish a habit at 100% progress and 100% consistency.", tier: "gold", state: "locked", art: { icon: Star } },
  { id: "evergreen", name: "Evergreen", description: "Reach a streak of 52.", tier: "platinum", state: "locked", art: { icon: TreeDeciduous } },
  { id: "leap-of-faith", name: "Leap of Faith", description: "Log an activity on February 29th.", tier: "gold", state: "earned", art: { icon: Sparkles }, secret: true, earnedOn: "Nov 20" },
]

const tiers: BadgeTier[] = ["bronze", "silver", "gold", "platinum"]
const states: { state: BadgeState; label: string }[] = [
  { state: "earned", label: "Earned" },
  { state: "in_progress", label: "In progress" },
  { state: "locked", label: "Locked" },
]
const tierIcons: Record<BadgeTier, BadgeArt> = {
  bronze: { icon: Sprout }, silver: { icon: Medal }, gold: { icon: Crown }, platinum: { icon: Trophy },
}

/** The medal on its own: every tier in every state, plus the three sizes. */
export function BadgeMedalExamples() {
  return (
    <div className="stack-lg">
      <Card className="stack-lg">
        {states.map(({ state, label }) => (
          <div key={state} className="stack-sm">
            <p className="text-eyebrow text-muted">{label}</p>
            <div className="badge-lineup">
              {tiers.map((tier) => (
                <figure key={tier}>
                  <BadgeMedal tier={tier} state={state} art={tierIcons[tier]} progress={0.65} />
                  <figcaption className="text-caption">{tierLabels[tier]}</figcaption>
                </figure>
              ))}
              {state === "earned" && (
                <figure>
                  <BadgeMedal tier="bronze" secret art={{ icon: Sparkles }} />
                  <figcaption className="text-caption">Secret</figcaption>
                </figure>
              )}
            </div>
          </div>
        ))}
      </Card>
      <Card className="stack-sm">
        <p className="text-eyebrow text-muted">Sizes</p>
        <div className="badge-lineup">
          <figure>
            <BadgeMedal tier="gold" size="sm" art={{ icon: Crown }} />
            <figcaption className="text-caption">Small</figcaption>
          </figure>
          <figure>
            <BadgeMedal tier="gold" art={{ icon: Crown }} />
            <figcaption className="text-caption">Medium</figcaption>
          </figure>
          <figure>
            <BadgeMedal tier="gold" size="lg" art={{ icon: Crown }} />
            <figcaption className="text-caption">Large</figcaption>
          </figure>
        </div>
      </Card>
    </div>
  )
}

type Filter = "all" | BadgeState

/** The Badges page: a summary, filters and the grid. Filters work on the local demo list. */
export function BadgesPageExample() {
  const [filter, setFilter] = useState<Filter>("all")
  const earned = sampleBadges.filter((badge) => badge.state === "earned")
  const shown = filter === "all" ? sampleBadges : sampleBadges.filter((badge) => badge.state === filter)
  const secrets = sampleBadges.filter((badge) => badge.secret)
  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "earned", label: "Earned" },
    { value: "in_progress", label: "In progress" },
    { value: "locked", label: "Locked" },
  ]

  return (
    <div className="stack-lg">
      <Card className="badge-summary">
        <div className="badge-summary__top">
          <div className="stack-sm">
            <h3 className="text-h2">{earned.length} of {sampleBadges.length} earned</h3>
            <p className="text-body-sm text-secondary">
              {secrets.length} secret {secrets.length === 1 ? "badge" : "badges"} found
            </p>
          </div>
          <div className="badge-summary__tiers">
            {tiers.map((tier) => (
              <div key={tier} className="badge-summary__tier">
                <BadgeMedal tier={tier} size="sm" art={tierIcons[tier]} />
                <div className="stack-sm" style={{ gap: 0 }}>
                  <strong>{earned.filter((badge) => badge.tier === tier).length}</strong>
                  <span className="text-caption text-muted">{tierLabels[tier]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="badge-card__progress">
          <div className="badge-card__bar" role="progressbar" aria-label="Badges earned" aria-valuemin={0} aria-valuemax={sampleBadges.length} aria-valuenow={earned.length}>
            <span style={{ width: `${(earned.length / sampleBadges.length) * 100}%` }} />
          </div>
        </div>
      </Card>

      <div className="badge-filters" role="group" aria-label="Show badges">
        {filters.map(({ value, label }) => (
          <Button key={value} size="sm" variant={filter === value ? "primary" : "secondary"} aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {label}
          </Button>
        ))}
      </div>

      <div className="badge-grid">
        {shown.map(({ id, ...badge }) => <BadgeCard key={id} {...badge} />)}
      </div>
    </div>
  )
}

/** What earning one feels like: a toast for most, a larger moment for the rare and secret ones. */
export function BadgeMomentExamples() {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)
  const [dialog, setDialog] = useState<"secret" | "platinum" | null>(null)

  return (
    <Card className="stack-md">
      <p className="text-body-sm text-secondary">
        Bronze and Silver badges show a toast. Gold, Platinum and secret badges open a dialog with the big medal.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => setToast({ id: Date.now(), message: "Badge earned: First Drop of Water." })}>Bronze toast</Button>
        <Button variant="secondary" onClick={() => setDialog("platinum")}>Platinum dialog</Button>
        <Button variant="secondary" onClick={() => setDialog("secret")}>Secret badge dialog</Button>
      </div>

      <Modal open={dialog === "platinum"} onClose={() => setDialog(null)} title="Badge earned" description="You finished a habit with every plant type.">
        <div className="badge-spotlight">
          <BadgeMedal tier="platinum" size="lg" art={{ icon: Flower2 }} />
          <div className="stack-sm">
            <h3 className="text-h2">Complete Collection</h3>
            <p className="text-body-sm text-secondary">Finish a habit with every plant type.</p>
            <p><span className="badge-pill" data-tier="platinum"><span className="badge-pill__dot" />Platinum</span></p>
          </div>
          <Button onClick={() => setDialog(null)}>Nice</Button>
        </div>
      </Modal>

      <Modal open={dialog === "secret"} onClose={() => setDialog(null)} title="Secret badge found" description="You found a secret badge.">
        <div className="badge-spotlight">
          <BadgeMedal tier="gold" size="lg" secret art={{ icon: Sparkles }} />
          <div className="stack-sm">
            <h3 className="text-h2">Leap of Faith</h3>
            <p className="text-body-sm text-secondary">Log an activity on February 29th.</p>
            <p>
              <span className="badge-pill" data-tier="gold"><span className="badge-pill__dot" />Gold</span>{" "}
              <span className="badge-pill badge-pill--secret">Secret</span>
            </p>
          </div>
          <Button onClick={() => setDialog(null)}>Nice</Button>
        </div>
      </Modal>

      {toast && <Toast key={toast.id} message={toast.message} onDismiss={() => setToast(null)} />}
    </Card>
  )
}
