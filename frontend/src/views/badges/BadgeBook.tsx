"use client"

import { useCallback, useMemo, useState, useSyncExternalStore } from "react"
import { BookOpen, ChevronLeft, ChevronRight, Sprout } from "lucide-react"
import { BadgeMedal, tierLabels, type BadgeTier } from "@/components/AchievementBadge"
import { Button } from "@/components/Button"
import { Icon } from "@/components/Icon"
import { BadgeDetails } from "./BadgeDetails"
import { BadgePageView } from "./BadgePageView"
import { buildPages, chapterStart, isEarned, latestEarned, pageOf, type BookChapter } from "./bookPages"

const tiers: BadgeTier[] = ["bronze", "silver", "gold", "platinum"]
const LATEST_COUNT = 5

/** Two pages side by side from the phone breakpoint up, one page below it. */
const SPREAD_QUERY = "(min-width: 44rem)"
const subscribeSpread = (notify: () => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {}
  const query = window.matchMedia(SPREAD_QUERY)
  query.addEventListener("change", notify)
  return () => query.removeEventListener("change", notify)
}
const spreadSnapshot = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia(SPREAD_QUERY).matches : true)

/** No motion without a way to ask, so tests and older browsers turn instantly. */
const prefersReducedMotion = () => (typeof window === "undefined" || !window.matchMedia ? true : window.matchMedia("(prefers-reduced-motion: reduce)").matches)

interface Turn { dir: "next" | "prev"; from: number; to: number }

/**
 * The badge book (#253). A cover, then chapters of slots that you turn through:
 * two pages at a time on wide screens and one page on phones. `initialPage` is
 * a 0-based page index, or null for the cover. The parent hears about every
 * change through `onPageChange`, so it can keep the address up to date.
 */
export function BadgeBook({ chapters, initialPage, onPageChange }: {
  chapters: BookChapter[]
  initialPage: number | null
  onPageChange?: (page: number | null) => void
}) {
  const pages = useMemo(() => buildPages(chapters), [chapters])
  const items = useMemo(() => pages.flatMap((page) => page.items), [pages])
  const spread = useSyncExternalStore(subscribeSpread, spreadSnapshot, () => true)

  const [current, setCurrent] = useState<number | null>(() => (initialPage !== null && initialPage >= 0 && initialPage < pages.length ? initialPage : null))
  const [turn, setTurn] = useState<Turn | null>(null)
  const [detail, setDetail] = useState<{ index: number; open: boolean }>({ index: 0, open: false })
  const [announcement, setAnnouncement] = useState("")

  const last = pages.length - 1
  /** The first page on screen: the left page of a spread, or the only page. */
  const start = current === null ? null : spread ? current - (current % 2) : current
  const step = spread ? 2 : 1

  const badges = items.flatMap((item) => (item.kind === "badge" ? [item] : []))
  const earned = badges.filter(isEarned)
  const latest = latestEarned(chapters, LATEST_COUNT)

  const settle = useCallback((page: number | null) => {
    setCurrent(page)
    setTurn(null)
    onPageChange?.(page)
    setAnnouncement(page === null ? "Cover" : `Page ${page + 1} of ${pages.length}, ${pages[page]?.chapterTitle ?? ""}`)
  }, [onPageChange, pages])

  /** Moves to a page. Turning to the next or previous spread is animated, anything else jumps. */
  const goTo = useCallback((page: number | null) => {
    if (page === null || start === null) return settle(page)
    const target = Math.min(Math.max(page, 0), last)
    const targetStart = spread ? target - (target % 2) : target
    if (targetStart === start) return settle(target)
    if (spread && Math.abs(targetStart - start) === 2 && !prefersReducedMotion()) {
      setTurn({ dir: targetStart > start ? "next" : "prev", from: start, to: targetStart })
      return
    }
    settle(target)
  }, [last, settle, spread, start])

  const next = () => { if (start !== null && start + step <= last) goTo(start + step) }
  const previous = () => { if (start === null) return; goTo(start === 0 ? null : start - step) }

  const open = (index: number) => setDetail({ index, open: true })
  const openItem = (id: string) => open(Math.max(0, items.findIndex((item) => item.id === id)))

  const jumpToNewest = () => {
    const newest = latest[0]
    const page = newest ? pageOf(pages, newest.id) : -1
    if (page >= 0) settle(page)
  }

  // The chapters on screen, for the ribbon tabs.
  const visible = start === null ? [] : [pages[start], spread ? pages[start + 1] : undefined].filter((page) => page !== undefined)
  const visibleChapters = new Set(visible.map((page) => page.chapterId))

  const view = (index: number | undefined, side?: "left" | "right") => (
    <BadgePageView page={index === undefined ? undefined : pages[index]} total={pages.length} side={side} onOpen={openItem} />
  )

  const label = start === null ? "Cover"
    : spread && pages[start + 1] ? `Pages ${start + 1} and ${start + 2} of ${pages.length}`
    : `Page ${start + 1} of ${pages.length}`

  return (
    <div className="badge-book" onKeyDown={(event) => {
      if (detail.open || turn || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return
      if (start === null) return
      event.preventDefault()
      if (event.key === "ArrowRight") next()
      else previous()
    }}>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

      {start === null ? (
        <div className="badge-book__board">
          <section className="badge-cover" aria-label="Badge book cover">
            <div className="badge-cover__label stack-lg">
              <div className="stack-sm badge-cover__heading">
                <Icon icon={Sprout} size="xl" tone="brand" />
                <h2 className="text-h2">My badge book</h2>
                <p className="text-body text-secondary">{earned.length} of {badges.length} earned</p>
              </div>
              <ul className="badge-cover__tiers" role="list" aria-label="Earned badges by tier">
                {tiers.map((tier) => (
                  <li key={tier} className="badge-summary__tier">
                    <BadgeMedal tier={tier} size="sm" art={{ icon: Sprout }} state={earned.some((item) => item.badge.tier === tier) ? "earned" : "locked"} />
                    <span className="stack-sm badge-summary__tier-text">
                      <strong>{earned.filter((item) => item.badge.tier === tier).length}</strong>
                      <span className="text-caption text-muted">{tierLabels[tier]}</span>
                    </span>
                  </li>
                ))}
              </ul>
              {latest.length > 0 ? (
                <div className="stack-sm">
                  <h3 className="text-caption text-secondary">Latest</h3>
                  <ul className="badge-cover__latest" role="list">
                    {latest.map((item) => (
                      <li key={item.id}>
                        <button type="button" className="badge-slot badge-slot--small" aria-label={`${item.badge.name}. Show details`} onClick={() => openItem(item.id)}>
                          <BadgeMedal tier={item.badge.tier} secret={item.badge.secret} art={item.badge.art} size="sm" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-body-sm text-secondary">Your first badge is one log away.</p>
              )}
              <div className="badge-cover__actions">
                <Button icon={BookOpen} onClick={() => settle(0)}>Open the book</Button>
                {latest.length > 0 && <Button variant="secondary" onClick={jumpToNewest}>Jump to newest</Button>}
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="badge-book__stage">
          <Button variant="secondary" className="badge-book__arrow" icon={ChevronLeft} aria-label="Previous page" onClick={previous} />
          <div className="badge-book__board">
            {spread ? (
              <div className="badge-book__spread" data-turning={turn?.dir}>
                <div className="badge-book__half">
                  {view(turn ? (turn.dir === "next" ? turn.from : turn.to) : start, "left")}
                </div>
                <div className="badge-book__half">
                  {view(turn ? (turn.dir === "next" ? turn.to + 1 : turn.from + 1) : start + 1, "right")}
                </div>
                {turn && (
                  <div className={`badge-leaf badge-leaf--${turn.dir}`} onAnimationEnd={() => settle(turn.to)}>
                    <div className="badge-leaf__face">
                      {view(turn.dir === "next" ? turn.from + 1 : turn.from, turn.dir === "next" ? "right" : "left")}
                    </div>
                    <div className="badge-leaf__face badge-leaf__face--back">
                      {view(turn.dir === "next" ? turn.to : turn.to + 1, turn.dir === "next" ? "left" : "right")}
                    </div>
                  </div>
                )}
                <span className="badge-book__spine" aria-hidden="true" />
              </div>
            ) : (
              <div className="badge-book__single" key={start}>{view(start)}</div>
            )}
          </div>
          <Button variant="secondary" className="badge-book__arrow" icon={ChevronRight} aria-label="Next page" disabled={start + step > last} onClick={next} />
        </div>
      )}

      <nav className="badge-ribbons" aria-label="Chapters">
        <button type="button" className="badge-ribbon" aria-current={start === null ? "page" : undefined} onClick={() => settle(null)}>Cover</button>
        {chapters.map((chapter) => {
          const earnedHere = chapter.items.filter(isEarned).length
          const count = chapter.id === "secret" ? `${earnedHere}` : chapter.id === "finished-habits" ? `${chapter.items.length}` : `${earnedHere}/${chapter.items.length}`
          const spoken = chapter.id === "secret" ? `${earnedHere} found`
            : chapter.id === "finished-habits" ? `${chapter.items.length} ${chapter.items.length === 1 ? "badge" : "badges"}`
            : `${earnedHere} of ${chapter.items.length} earned`
          return (
            <button key={chapter.id} type="button" className="badge-ribbon" data-chapter={chapter.id}
              aria-current={visibleChapters.has(chapter.id) ? "page" : undefined}
              aria-label={`${chapter.title}, ${spoken}`}
              onClick={() => { const page = chapterStart(pages, chapter.id); if (page >= 0) settle(page) }}>
              {chapter.title}<span className="badge-ribbon__count">{count}</span>
            </button>
          )
        })}
      </nav>
      {start !== null && <p className="text-caption text-muted badge-book__counter">{label}</p>}

      <BadgeDetails items={items} index={detail.index} open={detail.open} onClose={() => setDetail((value) => ({ ...value, open: false }))}
        onStep={(delta) => setDetail((value) => ({ index: Math.min(Math.max(value.index + delta, 0), items.length - 1), open: true }))} />
    </div>
  )
}

