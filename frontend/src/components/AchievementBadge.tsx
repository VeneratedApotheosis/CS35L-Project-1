import type { LucideIcon } from "lucide-react"
import { Lock, Sparkles } from "lucide-react"
import { Icon } from "./Icon"

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum"
export type BadgeState = "earned" | "in_progress" | "locked"
export type BadgeSize = "sm" | "md" | "lg"

export const tierLabels: Record<BadgeTier, string> = {
  bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum",
}

/** Scallops around the rim: a plain disc for Bronze, a fuller edge for each tier above. */
const scallops: Record<BadgeTier, number> = { bronze: 0, silver: 10, gold: 14, platinum: 18 }

/** What goes in the middle of a medal: a lucide icon. */
export type BadgeArt = { icon: LucideIcon }

export interface BadgeMedalProps {
  tier: BadgeTier
  state?: BadgeState
  size?: BadgeSize
  /**
   * A secret badge. These only ever show once earned, so they ignore `state`
   * and get their own pink starburst medal instead of the tier's rim.
   */
  secret?: boolean
  art?: BadgeArt
  /** In progress only: how far along, from 0 to 1. Drawn as a ring around the medal. */
  progress?: number
  className?: string
}

const RING_RADIUS = 43
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

/** Points of the secret medal's starburst edge, rounded so the server and browser print the same numbers. */
const STARBURST = Array.from({ length: 24 }, (_, index) => {
  const angle = (index / 24) * Math.PI * 2
  const radius = index % 2 === 0 ? 47 : 40
  return `${(50 + Math.cos(angle) * radius).toFixed(2)},${(50 + Math.sin(angle) * radius).toFixed(2)}`
}).join(" ")

/**
 * The round medal. Purely presentational and decorative: the name, tier and
 * state are always written out next to it (see `BadgeCard`).
 */
export function BadgeMedal({ tier, state = "earned", size = "md", secret = false, art, progress = 0, className }: BadgeMedalProps) {
  const shownState: BadgeState = secret ? "earned" : state
  const count = scallops[tier]
  const classes = ["badge-medal", className].filter(Boolean).join(" ")
  return (
    <div className={classes} data-tier={secret ? "secret" : tier} data-state={shownState} data-size={size} aria-hidden="true">
      <svg viewBox="0 0 100 100" className="badge-medal__base">
        {secret ? (
          <>
            <polygon className="badge-medal__rim" points={STARBURST} strokeLinejoin="round" />
            <circle className="badge-medal__face" cx="50" cy="50" r="33" />
            <ellipse className="badge-medal__shine" cx="33" cy="29" rx="7" ry="3.2" transform="rotate(-38 33 29)" />
            <circle className="badge-medal__shine" cx="24" cy="40" r="1.9" />
            <path className="badge-medal__spark badge-medal__spark--secret" d="M86 6 l2.4 6.6 6.6 2.4 -6.6 2.4 -2.4 6.6 -2.4 -6.6 -6.6 -2.4 6.6 -2.4z" />
            <path className="badge-medal__spark badge-medal__spark--secret" d="M10 70 l1.6 4.4 4.4 1.6 -4.4 1.6 -1.6 4.4 -1.6 -4.4 -4.4 -1.6 4.4 -1.6z" />
          </>
        ) : shownState === "in_progress" ? (
          <>
            {/* Not a medal yet: a flat disc inside a ring that fills with progress. */}
            <circle className="badge-medal__track" cx="50" cy="50" r={RING_RADIUS} />
            <circle
              className="badge-medal__arc"
              cx="50" cy="50" r={RING_RADIUS}
              strokeDasharray={`${(RING_LENGTH * Math.min(1, Math.max(0, progress))).toFixed(2)} ${RING_LENGTH.toFixed(2)}`}
              transform="rotate(-90 50 50)"
            />
            <circle className="badge-medal__face" cx="50" cy="50" r="35" />
          </>
        ) : (
          <>
            <g className="badge-medal__rim">
              <circle cx="50" cy="50" r="44" />
              {Array.from({ length: count }, (_, index) => {
                const angle = (index / count) * Math.PI * 2
                // Rounded so the server and the browser print identical numbers.
                return <circle key={index} cx={(50 + Math.cos(angle) * 43).toFixed(2)} cy={(50 + Math.sin(angle) * 43).toFixed(2)} r="6.5" />
              })}
            </g>
            <circle className="badge-medal__face" cx="50" cy="50" r="34" />
            <ellipse className="badge-medal__shine" cx="33" cy="29" rx="7" ry="3.2" transform="rotate(-38 33 29)" />
            <circle className="badge-medal__shine" cx="24" cy="40" r="1.9" />
            {tier === "platinum" && shownState === "earned" && (
              <path className="badge-medal__spark" d="M86 6 l2.4 6.6 6.6 2.4 -6.6 2.4 -2.4 6.6 -2.4 -6.6 -6.6 -2.4 6.6 -2.4z" />
            )}
          </>
        )}
      </svg>
      <div className="badge-medal__art">
        {art && <Icon icon={art.icon} className="badge-medal__icon" />}
      </div>
      {shownState === "locked" && (
        <span className="badge-medal__lock"><Icon icon={Lock} size="xs" /></span>
      )}
    </div>
  )
}

export interface BadgeCardProps {
  name: string
  description: string
  tier: BadgeTier
  state: BadgeState
  art: BadgeArt
  /**
   * A secret badge. Secret badges are only listed once earned, so the state is
   * always earned and they are never shown as locked or in progress.
   */
  secret?: boolean
  /** In progress only. */
  progress?: { count: number; target: number }
  /** Earned only, already formatted (for example "Nov 21"). */
  earnedOn?: string
}

/** One badge in the grid on the Badges page. */
export function BadgeCard({ name, description, tier, state, art, secret = false, progress, earnedOn }: BadgeCardProps) {
  const shownState: BadgeState = secret ? "earned" : state
  const stateLabel = shownState === "earned" ? "Earned" : shownState === "in_progress" ? "In progress" : "Locked"
  const label = `${name}. ${secret ? "Secret. " : ""}${tierLabels[tier]}. ${stateLabel}`
  return (
    <article className="card badge-card" data-state={shownState} data-secret={secret || undefined} aria-label={label}>
      <BadgeMedal tier={tier} state={shownState} secret={secret} art={art} progress={progress ? progress.count / progress.target : 0} />
      <div className="badge-card__text">
        <h3 className="text-h3 badge-card__name">{name}</h3>
        <p className="text-body-sm text-secondary">{description}</p>
      </div>
      {shownState === "in_progress" && progress && (
        <p className="text-caption badge-card__count" role="progressbar" aria-label={`${name} progress`} aria-valuemin={0} aria-valuemax={progress.target} aria-valuenow={Math.min(progress.count, progress.target)}>
          {progress.count} of {progress.target}
        </p>
      )}
      <div className="badge-card__meta">
        {secret && <span className="badge-pill badge-pill--secret"><Icon icon={Sparkles} size="xs" />Secret</span>}
        <span className="badge-pill" data-tier={tier}><span className="badge-pill__dot" />{tierLabels[tier]}</span>
        {shownState === "earned" && earnedOn && <span className="text-caption text-muted badge-card__date">{earnedOn}</span>}
        {shownState === "locked" && <span className="text-caption text-muted badge-card__date">Locked</span>}
      </div>
    </article>
  )
}
