# Badges page: the badge book

A design direction for the Badges page (#253), not a spec. Nothing here is built. It replaces the tabs and text-card layout currently on the branch `feat/253-badges-page`.

The idea: the Badges page is a **book**. Each badge has a slot on a page, like a sticker album. You turn pages to go through the badges. Earned badges are stuck in their slots, and the rest are empty slots waiting to be filled.

## Contents

- [1. Already decided](#1-already-decided)
- [2. Where the idea comes from](#2-where-the-idea-comes-from)
- [3. The idea in one picture](#3-the-idea-in-one-picture)
- [4. How it fits the design system](#4-how-it-fits-the-design-system)
- [5. Decisions to make](#5-decisions-to-make)
  - [A. Concept](#a-concept)
  - [B. Structure of the book](#b-structure-of-the-book)
  - [C. What is on a page](#c-what-is-on-a-page)
  - [D. Badges and their states in the book](#d-badges-and-their-states-in-the-book)
  - [E. Details of one badge](#e-details-of-one-badge)
  - [F. Turning pages](#f-turning-pages)
  - [G. Motion](#g-motion)
  - [H. Phones and small screens](#h-phones-and-small-screens)
  - [I. Look: cover, paper, themes](#i-look-cover-paper-themes)
  - [J. Secret badges](#j-secret-badges)
  - [K. Finished habit badges](#k-finished-habit-badges)
  - [L. Empty, loading and error states](#l-empty-loading-and-error-states)
  - [M. Earning a badge](#m-earning-a-badge)
  - [N. Accessibility](#n-accessibility)
  - [O. Build and scope](#o-build-and-scope)
- [6. Suggested build order](#6-suggested-build-order)

---

## 1. Already decided

These carry over from the earlier rounds and from the osu! research. They are not up for debate again.

| Decision | Detail |
| --- | --- |
| Badges are **self-earned only** | No shared habit badges for now ([badges-ideas.md](../badges-ideas.md)) |
| Earned badges are **permanent** | A new table stores `user_id`, `badge_id`, `earned_at` |
| **No new tracking** | Only badges that can be worked out from habits, logs and the profile |
| **Keep the current medal design** | Round medals with scalloped rims by tier (Bronze plain, then fuller edges for Silver, Gold, Platinum), an icon in the middle, flat fills. No hexagons or other new shapes |
| States keep their looks | **Earned** is a solid medal with a shine. **In progress** is a flat disc inside a ring that fills with the tier color. **Locked** is muted with a lock |
| **Secret badges** keep their look | Pink starburst medal. Only ever shown once earned, never as locked or in progress, and never counted ahead of time |
| **Text goes away** from the grid | Medals sit in compact grids with no name or rule under them. Details move to a hover card and a dialog |
| **No rarity line** | "Earned by X% of players" is out of scope |
| Data | The page reads `GET /me/badges` ([badges-plan.md](../badges-plan.md)). The style guide and tests use `views/badges/sampleBadgeBook.ts` |
| Deadline | The project is due Dec 1 |

## 2. Where the idea comes from

- **osu! medals:** dense grids of medal icons, grouped under small headings, with details on hover and a "Latest" strip. We keep the compact grid and the details-on-demand, and drop the hexagons.
- **Sticker albums and collector books:** you fill slots one by one. An empty slot shows you what is missing, which is a good home for our locked and in-progress badges.
- **Garden journals and pressed-flower books:** this fits Habit Garden's warm, calm, handmade feel better than a trophy cabinet or a leaderboard.

## 3. The idea in one picture

A desktop spread. A closed book on the cover, then double pages inside.

```
 Cover                                  Inside: a spread (two pages)
+------------------+        +--------------------------+--------------------------+
|                  |        |  Getting started         |  Logging milestones      |
|   Habit Garden   |        |  ----------------------  |  ----------------------  |
|      Badges      |        |  (o) (o) (o) (o)         |  (o) (o) (o) ( ) ( )     |
|                  |        |  (o) ( )                 |  ( ) ( )                 |
|     (sprout)     |        |                          |                          |
|                  |        |            3             |             4            |
|   11 earned      |        +--------------------------+--------------------------+
|                  |           <  Getting started | Logging | Habits | Streaks  >
+------------------+                    ribbon tabs for the chapters
   [ Open the book ]
```

- `(o)` is an earned medal stuck in its slot. `( )` is an empty slot. In-progress slots show the ring. Locked slots show the dim, locked medal.
- Chapters are the categories already in the placeholder data: Getting started, Logging milestones, Finishing habits, Streaks, and later the rest of [badges-ideas.md](../badges-ideas.md).
- Names and rules are not printed on the pages. Hover or focus shows a small card. Click or tap opens a dialog.

## 4. How it fits the design system

The book is the one expressive thing on this page, the way the plants are on the Garden. Everything around it stays plain.

- **Flat fills, soft shapes, warm neutrals.** Pages are almond-milk, the cover and binding use the existing birch and oat tokens, shadows use the warm brown shadow tokens. No gradients, textures or outlines on the illustration, as in [design.md section 6](design.md#6-illustration-plants-and-pots).
- **Motion answers an action** ([design.md section 10](design.md#10-motion)). Turning a page is an action, so a flip is allowed. It must respect `prefers-reduced-motion`. No idle animation, no animation on load beyond opening the cover.
- **No color alone.** The tier is still written out in the hover card and the dialog, and every badge has an accessible name.
- **Both themes are first-class.** The paper, cover and binding need values in light and dark.
- **Wide route.** The page keeps the wide width, and the book is centered inside it.

## 5. Decisions to make

Each decision has the options, the trade-off and a recommended default so we can go through them quickly. "Rec" is my recommendation.

### A. Concept

**A1. How literal is the book?**
- A real book with a cover, spine, page edges and a page turn.
- A light "book feel": a sheet with a binding line and chapter tabs, but pages change with a slide or fade.
- Rec: a real two-page spread on desktop with a simple page turn, and no 3D realism (no page curl, no thick page stack).
 - rec accepted

**A2. What is the metaphor?**
- Sticker album (slots you fill).
- sticker album is accepted
- Garden journal (pressed flowers, handwritten feel).
- Trophy book (medals on velvet).
- Rec: sticker album. It explains locked slots naturally and needs no new illustration style.

**A3. Is the book the whole page, or one section of it?**
- The book is the page, with only the page title above it.
- The book sits under a normal header card ("11 of 23 earned", tier counts), like today.
- Rec: a slim header above the book with the title and the earned count, and the tier counts on the cover.
- rec accepted

### B. Structure of the book

**B1. What are the parts?**
- Cover, contents, chapters, back cover.
- Contents and chapters only (no cover).
- Chapters only, opened to the last page you saw.
- Rec: a cover (the summary) the first time, then chapters. Skip a separate contents page, since the ribbon tabs do that job.
- no cover

**B2. How are chapters chosen?** By category (Getting started, Logging, Finishing habits, Streaks), by tier, or by earned and not earned. Rec: category, as in the placeholder data.
 - rec accepted

**B3. Order of badges inside a chapter.** The order in the list, easy to hard, or earned first. Rec: easy to hard in list order, so a page reads like a path.
 - rec accepted

**B4. Does a chapter fit on one page?** Chapters have 5 to about 12 badges. A chapter may use one or more pages.
- Each chapter starts on a new page, with the rest left blank.
- Chapters flow one after another with a small heading, so pages are always full.
- Rec: each chapter starts on a new page. Page count is predictable and the ribbon tabs jump to the right place.
- rec accepted

**B5. First page.** Start on the cover, on the first chapter, on the page with the newest earned badge, or on the page you last saw. Rec: the cover for a new visitor, then the page you last saw (kept in the session) with a "Latest" button. no cover

### C. What is on a page

**C1. Slots per page.** About 12 (4 by 3) per page gives roughly 6 to 8 pages for the whole list. Fewer slots means bigger medals. Rec: 4 by 3 on desktop, and the medal size matches the "50% bigger" card medals we have now.

**C2. What is printed on the page.** Only the chapter name at the top and the page number at the bottom, or also a one-line chapter intro. Rec: chapter name and page number only, because text is going away.

**C3. Empty slots.** A dashed circle with the slot number, the locked medal shown dim, or the badge art shown as a silhouette. Rec: use the locked medal (dim, with the lock). It is already designed.

**C4. Blank space.** A last page with fewer badges leaves room. Leave it blank, or show a small garden doodle. Rec: blank. No extra art.

**C5. Is the slot a button?** Each slot is an interactive control that opens details. Confirm focus rings and touch size (at least 2.75rem).

### D. Badges and their states in the book

**D1. Earned badges.** Plain stuck-in sticker, or a tiny "peel" shadow so they look placed. Rec: plain, with the existing medal and a slightly lifted shadow.

**D2. In-progress badges.** Keep the progress ring. Is the count (7 of 10) shown on the page, or only in the hover card and dialog? Rec: only on hover and in the dialog, to keep pages text-free.

**D3. Locked badges.** Do all locked badges show, or can people hide them? Rec: always show them in the book. Seeing the empty slots is the point of the album.

**D4. Latest badges.** Osu! has a "Latest" strip. In the book, this could be a "Latest" ribbon tab, a "jump to newest" button, or a front-page strip on the cover. Rec: a row of the last 5 earned badges on the cover, and a "Jump to newest" button.

### E. Details of one badge

**E1. Hover card.** Shows on hover and keyboard focus. Contents: name, tier, one-line rule, status (earned on a date, or "7 of 10", or "Locked"). Rec: yes, small card anchored to the slot.

**E2. Click or tap.** Opens a dialog with a large medal, the name, the rule, the tier and the date or progress. Alternatives: flip the slot, or open a side panel. Rec: the same Modal we already use.

**E3. Dialog navigation.** Can you step to the next and previous badge inside the dialog, or only close it? Rec: previous and next buttons, so people can browse without going back to the page.

**E4. Hint for locked badges.** A locked badge shows its full rule (the current choice), or only a hint. Rec: full rule for normal badges. Secret badges are never listed until earned, so they need no hint.

**E5. Touch.** Hover does not exist on touch (issue #377). Tap opens the dialog directly and the hover card is not used. Confirm.

### F. Turning pages

**F1. Controls.** Previous and next arrow buttons beside the book. Rec: yes, large and labeled, disabled at the ends.

**F2. Other ways to turn.** Clicking the page edge, swiping on touch, keyboard arrows. Rec: all three, with buttons as the guaranteed way.

**F3. Chapter navigation.** Ribbon tabs along the bottom or the side, a contents dropdown, or a page-number input. Rec: ribbon tabs that show the chapter name and an earned count.

**F4. Page numbers and the address.** Does each page have an address like `/badges?page=3` that can be shared and restored on refresh? Rec: yes. It also lets a toast say "View in the book" and link to the right page.

**F5. Page counter.** "Page 3 of 14", or "Spread 2 of 7". Rec: a small "3 of 14" under the book, and the pages count by page, not by spread.

### G. Motion

**G1. Turn animation.** A 3D flip (the page rotates around the spine), a flat slide, a fade, or none. Rec: a simple 3D flip of about 400 ms with no page curl, plus a fade fallback.

**G2. Reduced motion.** Under `prefers-reduced-motion`, switch instantly. Required.

**G3. Opening the cover.** A cover that opens on first visit, or no cover animation. Rec: a short cover open, once per session.

**G4. Sound.** No sound. Confirm.

**G5. Performance.** Only the current spread is rendered, plus the next one while turning. Confirm this is enough for about 70 badges.

### H. Phones and small screens

This ties into #381 (the phone layout for Badges).

**H1. One page or two.** Under about 44rem (the phone breakpoint) show one page at a time. Rec: yes.

**H2. Slots per page on a phone.** Rec: 3 by 4.

**H3. Chapter navigation on a phone.** The ribbon tabs scroll sideways, or a chapter picker sits above the book. Rec: scrolling ribbon tabs.

**H4. Swipe.** Swipe turns the page on phones. Make sure it does not fight the browser's back gesture. Rec: swipe plus visible arrow buttons.

**H5. Landscape.** Does a phone in landscape get the spread? Rec: no, keep one page.

**H6. The book fallback.** If the book proves too heavy on a small screen, show chapter sections stacked in a normal scroll with the same compact grids. Rec: build that as the first version, because it is also the fallback for reduced motion.

### I. Look: cover, paper, themes

**I1. Cover.** The cover color. Options: birch wood (matches the shelves), sage (matches the wall), or terracotta (matches the pots). Rec: birch with a flat sprout and "Badges" on it.

**I2. Paper.** Almond-milk (`--milk-bright`) pages with a pearl binding strip. Rec: yes.

**I3. Edges and depth.** A thin page-edge stack, a soft shadow under the book, and a shading strip along the spine. Rec: a thin edge and the existing `--shadow-card`. No gradients, per the illustration rules, so the spine shading is a flat darker strip.

**I4. Dark theme.** Pages stay a lighter warm tone and the book glows against the dark page, or the paper itself darkens. Rec: the paper darkens to the dark surface color and the cover uses the dark shelf color. Medals keep their colors.

**I5. Tokens.** Add `--book-cover`, `--book-page`, `--book-spine` tokens in both themes. Confirm no raw hex in components.

**I6. Page header look.** A chapter heading as a plain text heading, or in a handwritten-style font. Rec: the existing rounded font, no new typeface.

### J. Secret badges

**J1. Where do secret badges live?**
- A dedicated last chapter that is missing from the ribbon until the first secret badge is earned.
- Placed in their normal chapters beside the other badges, with the special pink medal.
- Rec: a "Secret" chapter at the back. It appears (with a small sparkle on its ribbon) only after the first one is earned, and shows only earned ones.

**J2. Count.** The book never shows how many secret badges exist. Does the cover count them in "earned"? Rec: yes, they count once earned. The total in "of N" only grows when one is found.

**J3. Hint that the chapter exists.** None, or a blank last page ("The rest is a surprise")? Rec: none. Do not hint.

**J4. Earning one.** The book opens to the secret chapter when a secret badge is earned from the toast link. Rec: yes.

### K. Finished habit badges

Issue #253 asks for one badge per finished habit with a Bronze, Silver or Gold level, showing the plant, level and completion date.

**K1. Where do they live?** A chapter in the book ("Finished habits"), or a separate tab outside the book? Rec: a chapter in the book, so the page has one model.

**K2. How does a slot look?** A medal for the level with the habit's plant inside it, a medal with an icon, or a small framed plant with the level medal in the corner. Rec: a framed plant with the level medal in the corner. It is the one place plants appear, because the issue asks for the plant. Achievement medals keep icons only.

**K3. Order.** Newest first. Confirm.

**K4. Details.** The same dialog, with goal, duration, final progress, consistency, total activities and final stage and health.

**K5. Empty chapter.** A habit that ended below 60% earns no badge. The chapter shows empty slots, or one line that explains when a habit earns a badge. Rec: empty slots and the explanation in the dialog of an empty slot.

### L. Empty, loading and error states

**L1. New user.** A closed book with all slots empty, and a gentle line on the cover. Rec: the cover plus empty slots, no extra copy beyond one line.

**L2. Loading.** Placeholders in the shape of the book (the guideline in [design.md section 9](design.md#9-writing)). Confirm slot-shaped placeholders.

**L3. Error.** A card with "Couldn't load your badges" and a retry. Same pattern as the Dashboard.

**L4. No JavaScript motion support.** The fallback layout from H6.

### M. Earning a badge

**M1. Toast.** A toast for Bronze and Silver, and a dialog for Gold, Platinum and secret badges (as in the style guide). Confirm.

**M2. Link into the book.** The toast has a "View in book" button that opens the book at that badge's page and highlights the slot once. Rec: yes.

**M3. First fill animation.** The badge "sticks" into its slot with a small pop when the book is opened from that link. Rec: only in that case, and not under reduced motion.

### N. Accessibility

**N1. Reading order.** Each page is a labeled region with a list of badges. The dialog and hover card give the details.

**N2. Names.** Each slot has an accessible name like "Ten Taps, Bronze, in progress, 7 of 10" even though the page shows no text.

**N3. Page turn announcements.** A polite live region says "Page 3 of 14, Logging milestones".

**N4. Focus after a turn.** Focus moves to the page heading or stays on the arrow. Rec: stay on the arrow, and announce the new page.

**N5. Keyboard.** Left and right arrows turn pages when the book has focus, Tab reaches every slot on the current page, Escape closes the dialog. Confirm.

**N6. Contrast.** The locked and in-progress medals on a pearl page need a contrast check, and so do the ribbon tab labels. Part of issue #347.

**N7. Touch size.** Slots and arrows are at least 2.75rem.

### O. Build and scope

**O1. Is the real page effort worth it by Dec 1?** The book adds work (page layout, turn, ribbons, phone). Rec: build in stages (see section 6), and ship the stacked-chapters fallback first.

**O2. What happens to the current page?** The tabs, summary card and text cards on `feat/253-badges-page` are replaced. Confirm that nothing from them needs to stay.

**O3. Style guide.** Update the Badge medals and Badges page sections to show the book, slots, ribbon tabs and the hover card.

**O4. Tests.** What we test: chapters and pages, empty slots for locked badges, secret badges only once earned, keyboard turning, the dialog, the `?demo=empty` state, and the reduced motion path.

**O5. Docs.** Update [screens.md](screens.md) section 6 and [design.md](design.md) with the final decisions.

## 6. Suggested build order

1. **Slots and grids.** A compact slot grid with the existing medals, no text, hover card and dialog. Chapters stacked in a normal scroll. This is the fallback and already matches the "compact grids" direction.
2. **Chapters as pages.** One chapter at a time with arrow buttons, ribbon tabs, page numbers and `?page=`.
3. **The book look.** Cover, paper, spine and edges, with tokens for both themes.
4. **Spread and turn.** Two pages on desktop, one on phones, and the flip with a reduced-motion path.
5. **Extras.** The cover summary and latest row, the secret chapter, the finished habits chapter, and "View in book" from the toast.
6. **Polish.** Accessibility pass, tests, style guide and docs.

Steps 1 and 2 give a working, shippable page even if we run out of time before the full book.
