"use client"

import { BadgeSlot, EmptySlot } from "./BadgeSlot"
import type { BookPage } from "./bookPages"

/** One page of the book. A missing page (past the end) is drawn as blank paper. */
export function BadgePageView({ page, total, side, onOpen }: {
  page: BookPage | undefined
  total: number
  /** Which half of a spread, so the outer corners are the rounded ones. */
  side?: "left" | "right"
  onOpen: (id: string) => void
}) {
  const classes = ["badge-page", side && `badge-page--${side}`, !page && "badge-page--blank"].filter(Boolean).join(" ")
  if (!page) return <div className={classes} aria-hidden="true" />

  return (
    <section className={classes} aria-label={`Page ${page.number} of ${total}, ${page.chapterTitle}`}>
      <h2 className="text-h3 badge-page__title">{page.chapterTitle}{page.continued && <span className="badge-page__continued"> (continued)</span>}</h2>
      {page.emptyNote && <p className="text-body-sm text-secondary badge-page__note">{page.emptyNote}</p>}
      <ul className="badge-page__grid" role="list">
        {page.items.map((item, index) => (
          <li key={item.id} className="badge-page__cell"><BadgeSlot item={item} index={index} onOpen={onOpen} /></li>
        ))}
        {page.emptyNote && [0, 1, 2, 3].map((slot) => <EmptySlot key={slot} />)}
      </ul>
      <p className="text-caption text-muted badge-page__number">{page.number}</p>
    </section>
  )
}
