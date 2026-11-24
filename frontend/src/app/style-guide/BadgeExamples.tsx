"use client"

import { useMemo, useState } from "react"
import {
  Crown, Flower2, Medal, Sparkles, Sprout, Trophy,
} from "lucide-react"
import { BadgeMedal, tierLabels, type BadgeArt, type BadgeState, type BadgeTier } from "@/components/AchievementBadge"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { Modal } from "@/components/Modal"
import { Toast } from "@/components/Toast"
import { BadgeBook } from "@/views/badges/BadgeBook"
import { buildChapters } from "@/views/badges/bookPages"
import { placeholderChapters, placeholderHabitBadges, placeholderSecretBadges } from "@/views/badges/placeholderBadges"

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

/** The whole book with the placeholder badges. It does not touch the address. */
export function BadgeBookExample() {
  const chapters = useMemo(() => buildChapters(placeholderChapters, placeholderSecretBadges, placeholderHabitBadges), [])
  return <BadgeBook chapters={chapters} initialPage={null} />
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
