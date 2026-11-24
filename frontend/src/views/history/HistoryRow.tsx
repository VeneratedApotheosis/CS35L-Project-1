"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { Icon } from "@/components/Icon"
import type { HistoryHabit } from "@/lib/history"
import { habitHref } from "@/lib/paths"
import { habitSeed } from "@/pottedPlant/habitSeed"
import { plantTypeById } from "@/pottedPlant/plants/plantTypes"
import { wiltForHealth } from "@/pottedPlant/plants/staged/wilt"
import { dateRange, goalPhrase, levelLabels, percent, streakText } from "./format"

/** The level reached (rule 8.9) as a pill. Not an achievement medal. */
export function LevelPill({ level }: { level: HistoryHabit["badge"] }) {
  return (
    <span className={level === "none" ? "badge-pill history-level history-level--none" : "badge-pill history-level"}
      data-tier={level === "none" ? undefined : level}>
      <span className="badge-pill__dot" />{levelLabels[level]}
    </span>
  )
}

/**
 * One finished habit: the plant as it ended, the name, goal and dates, the
 * level and four final numbers. The whole row opens Habit Details.
 */
export function HistoryRow({ habit, currentYear }: { habit: HistoryHabit; currentYear: number }) {
  const plant = plantTypeById(habit.plant_type)
  const consistencyLabel = `${habit.periods_met} of ${habit.periods_total} periods met (${percent(habit.final_consistency)})`
  return (
    <li className="history-row">
      <Link href={habitHref(habit.id)} className="history-row__link">
        <span className="history-row__plant" data-health={habit.health} aria-hidden="true">
          {plant && <plant.Preview seed={habitSeed(habit.id)} stage={habit.stage} wilt={wiltForHealth(habit.health)} />}
        </span>
        <span className="history-row__main">
          <span className="history-row__title">
            <strong className="text-body history-row__name">{habit.name}</strong>
            <LevelPill level={habit.badge} />
          </span>
          <span className="text-body-sm text-secondary">
            {goalPhrase(habit)} · <time dateTime={habit.start_date}>{dateRange(habit, currentYear)}</time>
          </span>
        </span>
        <dl className="history-row__stats text-body-sm">
          <div><dt className="text-caption text-muted">Progress</dt><dd>{percent(habit.final_progress)}</dd></div>
          <div><dt className="text-caption text-muted">Consistency</dt><dd aria-label={consistencyLabel}>{habit.periods_met}/{habit.periods_total}</dd></div>
          <div><dt className="text-caption text-muted">Activities</dt><dd>{habit.total_logs}</dd></div>
          <div><dt className="text-caption text-muted">Best streak</dt><dd>{streakText(habit)}</dd></div>
        </dl>
        <Icon icon={ChevronRight} size="sm" className="history-row__chevron" />
      </Link>
    </li>
  )
}
