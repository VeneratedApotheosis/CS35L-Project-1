import { useId } from "react"
import Link from "next/link"
import { Card } from "@/components/Card"
import { HabitPlant } from "@/components/HabitPlant"
import { ProgressBar } from "@/components/ProgressBar"
import { formatDate } from "@/lib/goal"
import { sharedHabitHref } from "@/lib/paths"
import type { SharedGardenHabit } from "@/lib/sharedHabits"

/** The plant represents the group; the period bar represents only the caller. */
export function SharedHabitCard({ habit }: { habit: SharedGardenHabit }) {
  const heading = useId()
  const period = habit.own_stats.current_period
  const label = habit.own_stats.state === "expired" ? "Your final period"
    : habit.own_stats.state === "not_started" ? "Your first period" : "Your current period"
  const href = sharedHabitHref(habit.id)
  return <article aria-labelledby={heading} className="shared-garden-card">
    <Card className="stack-md">
      <span className="shared-garden-card__badge text-caption">Shared · {habit.member_count} {habit.member_count === 1 ? "member" : "members"}</span>
      <h3 id={heading} className="text-h3"><Link href={href}>{habit.name}</Link></h3>
      {habit.stats.state === "not_started" && <p className="text-body-sm text-secondary">Starts {formatDate(habit.start_date)}</p>}
      {habit.stats.state === "expired" && <p className="text-body-sm text-secondary">Finished</p>}
      <Link href={href} aria-label={`Open shared habit ${habit.name}`}><HabitPlant habit={habit} /></Link>
      <ProgressBar label={`${habit.name}: ${label.toLowerCase()}`} caption={label} count={period.count} target={period.target} />
    </Card>
  </article>
}
