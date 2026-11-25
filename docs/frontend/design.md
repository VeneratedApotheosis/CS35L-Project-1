# Habit Garden: Frontend Design

How the frontend looks and how it is built. For what each screen does, see [screens.md](screens.md). For the rules behind the numbers, see [backend-design.md](../backend/design.md#8-calculation-rules). For how plants are generated, see [plant-generation.md](plant-generation.md). For the design guidance used when making visual decisions, see [frontend-skills.md](skills.md).

---

## Contents

- [1. Brief](#1-brief)
- [2. Principles](#2-principles)
- [3. Color](#3-color)
- [4. Type](#4-type)
- [5. Shape, space and depth](#5-shape-space-and-depth)
- [6. Illustration: plants and pots](#6-illustration-plants-and-pots)
- [7. Layout](#7-layout)
- [8. Components](#8-components)
- [9. Writing](#9-writing)
- [10. Motion](#10-motion)
- [11. Quality floor](#11-quality-floor)
- [12. Code structure](#12-code-structure)
- [13. Status and open items](#13-status-and-open-items)

---

## 1. Brief

- **Subject:** a habit tracker where every habit is a plant.
- **Audience:** people building everyday habits (gym, reading, study). Not power users. They open the app for a few seconds a day.
- **Primary job:** make logging an activity quick and make the garden feel worth coming back to.
- **Mood:** calm, soft, a little playful. It should feel like a small cozy game, not a spreadsheet and not a productivity dashboard.
- **Memorable thing:** the plants. Everything else stays quiet so the garden is what people remember.

## 2. Principles

1. **The garden is the hero.** The Garden page opens with the plants themselves, not a summary of numbers. Stats support the plants, not the other way round.
2. **Spend boldness in one place.** The plants and pots are the expressive element. Chrome (nav, forms, cards) stays plain and low contrast.
3. **Soft and rounded everywhere.** Large radii, a rounded typeface, flat fills. No sharp corners, no outlines on illustrations.
4. **Warm neutrals, few accents.** The page is almond-milk and oat. Color comes from the plants, the pots and status.
5. **State is shown, not described.** Growth and health are read from the plant's look first, from text second.
6. **Structure carries information.** Borders, dividers and badges appear only when they mean something (a status, a group, a limit). They are not decoration.
7. **Light and dark are both first-class.** Every token has a value in both themes.

## 3. Color

Defined in `frontend/src/styles/tokens/colors.css`. Always use the tokens, never raw hex values in components.

| Token | Hex | Role |
| --- | --- | --- |
| `--milk` | `#f5f1e6` | Page background (light) |
| `--milk-bright` | `#fffdf6` | Raised surfaces, cards |
| `--pearl` | `#ece7da` | Sunken or secondary surfaces |
| `--oat` / `--oat-deep` | `#b7a48a` / `#8f7b64` | Borders, muted UI, dividers |
| `--ink` / `--ink-soft` | `#342f29` / `#6f665c` | Text and secondary text |
| `--cream-ink` / `--cream-soft` | `#fffaf0` / `#e9dfcf` | Text on dark surfaces |

**Accents**

| Token | Hex | Use |
| --- | --- | --- |
| `--teal` / `--teal-deep` | `#48bda6` / `#247e70` | Info, links, secondary actions |
| `--coral` / `--coral-deep` | `#e96f5c` / `#a33f36` | Highlights, health warnings |
| `--yellow` | `#f2c84b` | Warning, badges |
| `--pink` | `#ee87a5` | Decorative, pot colors |
| `--action-green` (+ `-selected`, `-dark`) | `#83c17d` | Primary actions, success |
| `--danger-red` (+ `-soft`, `-dark`) | `#ee554f` | Destructive actions, errors |

**Semantic names** (`--success`, `--danger`, `--warning`, `--info`) point at the tokens above. Components use the semantic names so a status color can change in one place.

**Themes.** `themes/light.css` and `themes/dark.css` map the palette to surfaces and text. The dark surfaces are an extension of the ink/oat/cream palette, not values from the original Figma Make source. The theme is stored in `localStorage` under `app-theme` and applied before first paint in `app/layout.tsx` to avoid a flash.

**Rule.** Do not rely on color alone to show plant health or status. Pair it with an icon, a label or a change in the plant's drawing.

## 4. Type

One family: **M PLUS Rounded 1c** (400, 500, 700, 800), loaded with `next/font/google` and exposed as `--font-mplus`. The rounded forms match the rounded shapes and the plant style. Fallbacks: Arial Rounded MT Bold, then sans-serif.

| Token | Size | Use |
| --- | --- | --- |
| `--font-size-xs` | 0.68rem | Metadata |
| `--font-size-sm` | 0.76rem | Captions |
| `--font-size-md` | 0.875rem | Dense body text |
| `--font-size-base` | 1rem | Body |
| `--font-size-lg` | 1.25rem | Card titles |
| `--font-size-xl` / `2xl` | 1.45rem / 1.7rem | Section headings |
| `--font-size-3xl` | 2.3rem | Page headings |
| `--font-size-4xl` | 3.5rem | Login and empty-state headline |

- **Weights:** 400 body, 500 labels, 700 headings and buttons, 800 for the app name and the single biggest heading on a page.
- **Line height:** 1.05 for display, 1.2 for headings, 1.8 for body.
- **Line length:** keep body text under 80 characters.
- **Headings** use sentence case.
- The scale includes `--letter-spacing-eyebrow` for small labels. Use it rarely. Do not put a small label above every heading.

## 5. Shape, space and depth

Defined in `tokens/spacing.css` and `tokens/effects.css`.

- **Spacing:** a 4px-based scale, `--space-1` (0.25rem) to `--space-16` (4rem). Page, section and card padding use `clamp()` so they shrink on small screens.
- **Radius:** `--radius-sm` 0.5rem, `-md` 1rem, `-lg` 2rem, `-xl` 3.5rem, `-pill` fully round. Use bigger radii for bigger containers: pills for buttons and chips, `-md` for inputs, `-lg` for cards, `-xl` for hero panels. Do not use one radius for everything.
- **Shadows:** `--shadow-card`, `--shadow-popover`, `--shadow-button`, all warm brown tinted rather than grey. Use them only to lift things that float or can be pressed.
- **Layers:** use the `--z-*` tokens, never raw z-index numbers.
- **Line weights:** `--line-thin` 1px for borders and dividers, `--line-medium` 2px for focus rings and lines that must be seen, `--line-thick` 4px for accents (a status stripe, an input's focus glow), `--focus-offset` 2px for the gap to a focus ring, and `--icon-stroke` 2 for icon strokes. Never write a raw width on a border or outline (a test fails on it). Gauges such as the progress rings are drawn in their own units and are not lines.
- **Transitions:** `--transition-fast` 120ms for hover and press, `-normal` 160ms, `-slow` 240ms.

## 6. Illustration: plants and pots

The plant is the main visual. Style reference: the icons in Animal Crossing: New Horizons.

- **Flat fills.** No outlines, no gradients, no textures.
- **Two tones per leaf**, with the lighter half on one side of the midrib, plus a soft highlight.
- **Soft shapes.** Rounded corners and stems, a small inward notch on heart leaves.
- **Colors** come from the plant's own palette and the pot palettes (terracotta, cream, sage, sky, blush), which sit well on the milk background.
- **Each plant is unique but stable.** The seed is made by hashing the habit's id (`habitSeed(habit.id)`), so the same habit always draws the same plant and pot. No seed is stored and the generator has no versions. The generator is final: changing it changes the plant of every habit (see [plant-generation.md](plant-generation.md#status-final)).
- **Growth is four stages**, each a larger copy of the full plant, not a continuous animation. The sizes are in the plant config, not in components.
- **Health is three states with one shared wilt look.** Healthy, slightly wilted and wilted draw every plant at a wilt amount of 0, 0.5 and 1.
- **Size.** The `scale` prop resizes the whole picture (plant and pot). It never changes where leaves or stems sit.
- **Containment.** Leaves stay above the soil line and within the pot's width (8px overhang allowed), so plants never overlap neighbors in the grid.
- **The pot is drawn separately** (`PottedPlant`): the seed also picks the pot's look — palette, band and finish — so any pot can go with any plant.

Plant types the app offers: **pothos**, **peace lily**, **pilea**, **snake plant**, **Kimberly Queen**, **lily**, **rose**, **monstera**, **philodendron** and **lotus** — ids `pothos`, `peace_lily`, `pilea`, `snake_plant`, `kimberly_queen`, `lily`, `rose`, `monstera`, `philodendron`, `lotus`. The create-habit picker, the previews and the backend's `plant_type` validation all read the same list (`frontend/src/pottedPlant/plants/plantTypes.tsx`, mirrored in `backend/src/domain/plants.ts`). Every plant except the lotus is built on the shared stage engine; the lotus is a water plant with its own drawing. Spider plant and calathea are also drawn on `/plants` but are not offered. They are permanent stretch goals (issue #286), not scheduled in any week.

## 7. Layout

**App shell.** A top navigation bar with My Garden, Dashboard, Badges, Settings and an Add Habit button. On small screens it becomes a bottom bar.

`AppShell` is shared by routes in `app/(signed-in)/`, behind the layout's auth guard. It supplies centered content, a skip link and space for the mobile bar and safe area. `NavBar` marks the current route with `aria-current`, a selected background without an outline or underline. Hover gently lifts available links; reduced-motion settings disable the animation. Keyboard focus has a separate visible outline. My Garden (`/`), the basic Dashboard (`/dashboard`), Settings (`/settings`), and Add Habit (`/create`) are available; Badges is disabled until its page exists. Navigation switches to a top bar at 52rem; compact labels (Garden and Add) give the mobile items more room, with full accessible names. The style guide includes contained desktop and phone previews.

**Page width and margin.** Every page, and the top bar, has the same space on each side of its content, `--page-side` (`styles/tokens/spacing.css`), so the content is the same width, and the top bar lines up with the page below it, on the Garden, Habit details, Dashboard, Settings and every other page, at any window size. The space is two thirds of what a 72rem column (`--content-width`) would leave: the centring beside the column on a wide window, plus the page margin (`--page-margin`, `clamp(1rem, 4vw, 3rem)`). A page never sets its own side space or `max-width`. `AppShell` (`pageWidth()`) only picks the vertical padding from the route: wide pages (Habit details, shared habit) have less above and below so the cards fit a laptop screen, and the Garden has more above. `--page-padding` is the default vertical padding.

Below 52rem (the phone breakpoint, below) the top bar is a bottom bar, and the bar's content only follows the margin from 52rem, where it moves to the top.

**Phone spacing.** Below 52rem, spacing comes from a separate set of `--phone-*` tokens, defined once in `styles/tokens/spacing.css`; every `(--phone)` rule reads them, and none reads the desktop `--page-side`, `--page-margin` or `--page-padding` (a test enforces it). The side space is fixed, `--phone-side` (16px), on each side plus the safe-area inset, so the login and every app page line up. The rest: `--phone-page-top`, `--phone-page-top-garden` and `--phone-page-bottom` (page padding), `--phone-nav-height` and `--phone-nav-gap` (the bottom bar, and the space between it and a toast or the Garden's sheet), `--phone-section-gap` and `--phone-block-gap` (between and inside sections), `--phone-card-pad` and `--phone-card-gap` (inside cards), and `--phone-sheet-top` (the room above the Garden's sheet). The Garden's sheet also opens on a touch screen wider than 52rem, with the same margins. There is no phone type scale, and desktop spacing is unchanged.

**Phone breakpoint.** The primary phone layout is below **52rem** (832 CSS pixels with the standard 16px initial font size); at 52rem and above the laptop layout applies. This aligns with the existing navigation, form and habit-grid transition, and keeps phone navigation and content in the same mode. Intermediate widths formerly between the separate thresholds now use the phone layouts.

The single value lives in `frontend/src/styles/breakpoints.json`. In authored styles use `(--phone)` or `(--not-phone)` in a media or container query. The local PostCSS plugin in `frontend/phone-breakpoint.mjs` expands these to `(width < 52rem)` and `(min-width: 52rem)` at build time; CSS custom properties cannot be used as media-query values. JavaScript imports the same JSON for `matchMedia`. Keep the tokens inside an `@media` or `@container` condition; do not use them directly in browser-side styles without the build step.

The phone boundary does not replace queries for a card's own container width, multi-column plant-card sizing (44rem and 72rem), the larger hold track (62rem), pointer/hover capabilities, reduced motion, or accessibility modes. The Garden retains its touch-specific behavior on wider devices.

**Viewport and safe areas.** The root Next.js viewport export sets device width, initial scale 1 and `viewport-fit=cover`. On phones, the app shell applies the top inset once to page content, uses the larger of the phone side space (`--phone-side`) and each side inset, and reserves the fixed navigation height plus bottom inset below content. The bottom bar applies the bottom inset to its own controls and uses side insets in landscape. The Garden's top padding (`--phone-page-top-garden`) replaces the usual one and adds the same inset, rather than adding another inset. Login has its own top and bottom safe-area spacing, and the same side space as the app pages, because it does not use the app shell. Insets use zero fallbacks. Desktop spacing remains unchanged.

On phones the body and app shell use `100dvh` over a `100vh` fallback so browser toolbar changes can alter the minimum height while content can still grow and scroll. Desktop body and app-shell sizing keeps `100vh`; login retains its existing `100dvh` sizing with a `100vh` fallback. Dynamic viewport units do not reliably track the on-screen keyboard in every browser; dialogs, toasts and bottom navigation have separate follow-up work (#379), and keyboard behavior needs physical-device testing.

**Phone touch targets.** Interactive buttons, form controls, standalone dashboard links and navigation use the existing `--touch-target` minimum (2.75rem, 44px at the default font size). Radio labels provide the larger target without changing the native radio or focus behavior. Calendar days with actions fit all seven columns within the card, with spacing for focus outlines; they may be smaller than 44px on narrow phones. Ordinary prose links should retain their text flow rather than forcing a fixed-size inline box. Desktop control sizes remain unchanged.

**Alignment.** Page content is left aligned in a centered column (see Page width and margin). Only empty states are center aligned, because they hold a single message. The login screen is the exception to the column: its words are left aligned in the left third, beside a picture (see [login-wall.md](login-wall.md)).

**Garden.** Plants on shelves, like the login wall but 1.5 times as big and with no card behind them: a pot and its plant per habit with nothing else showing, a solid card with the name, streak and progress pills on hover, the same card growing sideways to hold the buttons on click, and hold to log. The progress bar is rounded pills everywhere (one per activity for a goal of ten or fewer, one smooth bar for more). Finished habits are on shelves beneath. The behavior is in [screens.md](screens.md#2-garden-home). The sketch below is the old card grid.

```
+--------------------------------------------------+
| Habit Garden   Garden  Dashboard  Badges   [+ Add]|
+--------------------------------------------------+
|                                                  |
|   (plant)      (plant)      (plant)              |
|   [pot]        [pot]        [pot]                |
|   Gym          Read         Study                |
|   ==--- 2/3    =---- 1/4    ===== 5/5            |
|                                                  |
|   (plant)      +----------+                      |
|   [pot]        |  + Add   |                      |
|   Run          |  a habit |                      |
|   =----- 1/3   +----------+                      |
+--------------------------------------------------+
```

- Columns: 1 on narrow phones, 2 from about 480px, then as many as fit with a minimum card width.
- Press and hold on a plant logs an activity today. Because this gesture can't be discovered, the options menu also has a visible Log activity button, and the keyboard can use it.
- An empty garden shows one large empty pot and a single action to create the first habit.

**Habit Details.** A header and five soft cards: the plant, how this period is going (with the logging buttons), the activity calendar, and, beside it, the overall run with the activity log under it. Numbers carry the hierarchy and the labels are small.

**Shared Habit.** The same header and cards as Habit Details, with no Delete button. The "This week" card shows the group's average as its bar, with the member's own count under it and their own three figures. Overall adds the member count, and the Members and Invite cards sit below the grid (the members are a table on a wide screen and a list on a phone).

```
+--------------------------------------------------+
| <- Garden                                        |
| Gym                                     [Delete] |
+-------------+------------------------------------+
|             | This week                          |
|  (plant)    | 2/3 ====--   Period 2 of 4 ...     |
|             | Overall | Consistency | Streak     |
| Spider Lv 2 | [ Log today ]   [ Log date ]       |
+-------------+------------------------------------+
| Activity    | Overall                            |
| (calendar,  | Goal | Period | Days left          |
|  leaf marks)+------------------------------------+
|             | Activity log (latest days)         |
+-------------+------------------------------------+
```

The cards share one corner rule: a card's radius is its padding plus the radius of what sits in it. The plant card has no padding, so the plant runs to its edge. On a phone the cards stack in the order plant, this week, activity, overall.

**Create Habit.** A single column form with inline validation, a goal sentence preview ("Go to the gym 3 times every week for 4 weeks") and a plant preview next to the plant picker.

**Dashboard, Badges, Settings.** Follow the screen descriptions in [screens.md](screens.md). Lists use rows, not cards, because they are compared line by line.

## 8. Components

Built in `frontend/src/components/`, styled by the CSS in `frontend/src/styles/components/`, and shown on the style guide page at `/style-guide` in both themes.

| Component | Options |
| --- | --- |
| `Button` | variant (`primary`, `secondary`, `ghost`, `danger`), size (`sm`, `md`, `lg`), optional icon, full width |
| `Card` | variant (`default` and others), padding from `--card-padding` |
| `Icon` | lucide icons with a size and a tone, always `currentColor` |
| `NavBar` / `AppShell` | responsive navigation, current route, disabled future destinations, shared signed-in layout and skip link |
| `ProgressBar` | accessible label, activity count and target (1–50); segmented steps for targets up to 10, smooth fill above 10, capped fill and uncapped count |
| `PlantCard` | habit name, plant type, seed, stage (1–4), health, period progress and callbacks for logging and details |
| Inputs | CSS classes in `inputs.css`; a React wrapper is not built yet |

Still to build: Modal, toast (for the undo after logging).

`PlantCard` uses the shared plant registry, `Card`, `Icon`, `Button` and `ProgressBar`. Its native options disclosure opens with Enter or Space; Tab reaches the action buttons, Escape closes it and restores trigger focus, and clicking outside dismisses it. Clicking the plant or habit name calls View details. Health has an icon and label plus a muted-color illustration cue; dedicated drooping leaf drawings remain tracked by #152. The style guide's Plant cards section previews all three supported plants at every stage and health state using local demo actions. The card does not fetch data or compute habit statistics.

**Rules**
- Take variants and sizes from props, not from one-off class names.
- Decorative icons get `aria-hidden`. Icon-only buttons need an accessible label.
- Add a new component to the style guide page when you add it.

## 9. Writing

- **Plain words.** Say "Log activity", not "Record entry". Name things as users do: habit, plant, garden, badge.
- **Buttons say what happens.** "Save changes", "Create habit", "Delete habit". The same name is used in the confirmation: a button that says "Delete habit" leads to a toast that says "Habit deleted".
- **Sentence case** everywhere.
- **Errors say what went wrong and how to fix it,** without apologizing: "Name is required" or "Couldn't save the habit. Check your connection and try again."
- **Empty states point at the next action.** "No habits yet. Create your first habit to plant it."
- **Loading states** show the page's shape (placeholders), not a bare spinner.

## 10. Motion

- Motion answers a person's action: logging an activity, a plant moving up a stage, a menu opening, a toast appearing.
- **One orchestrated moment:** when a log moves a plant to the next stage, each leaf springs from its old place to its new one, new leaves grow out of the soil, and lines, pops and (on the last stage) stars burst around the plant. The pot and soil do not move. This is the one place where motion is the main event. Details are in [plant-generation.md section 3.10](plant-generation.md#310-moving-up-a-stage).
- No entrance animation on every section, no hover animation on every card.
- Respect `prefers-reduced-motion`: replace movement with an instant change.

## 11. Quality floor

Every screen meets these before it is merged.

- **Responsive** from 360px wide up. No horizontal scrolling.
- **Keyboard:** every action is reachable and has a visible focus ring (`--line-medium` with `--focus-offset`, one rule everywhere). Gestures (press and hold) have a button equivalent.
- **Contrast:** text meets WCAG AA in both themes.
- **Not by color alone:** status uses an icon or text too.
- **Reduced motion** is honored.
- **Touch targets** are at least 44px.
- **Both themes** checked, with a screenshot, before the PR.

## 12. Code structure

```
frontend/src/
  app/             routes (Next.js App Router): login, style-guide, plants, home
  views/           full screens used by routes: Garden, Login (its shelf wall is in views/login/wall/, see login-wall.md)
  components/      shared UI: Button, Card, Icon
  pottedPlant/     plants in pots (see plant-generation.md)
    plants/        every plant, one folder per species, built on the stage engine
      staged/      the stage engine
      pothos/      the pothos: config, leaf, component
    pots/          the pot and its finishes, shared by all plants
  auth/            Supabase auth context and protected routes
  lib/             Supabase client
  styles/          tokens, themes, component CSS, ThemeProvider
```

- **Styling:** Tailwind v4 for layout and utilities, the CSS tokens for color, type, spacing and effects. Prefer a token over a Tailwind arbitrary value.
- **Specificity:** keep component selectors to one class (`.button--primary`). Avoid element selectors that can fight with them, especially for padding and margin between sections.
- **No hard-coded values in components.** Colors, sizes and plant limits come from tokens or config objects.
- **Fonts and icons:** M PLUS Rounded 1c through `next/font`, lucide-react for icons.

## 13. Status and open items

**Done**
- Design tokens, light and dark themes, base components (`Button`, `Card`, `Icon`) and the style guide page.
- Supabase auth with protected routes.
- Procedural plants and pots (ten plant types on the shared stage engine, plus the water lotus), and the `/plants` prototype page.
- Create-habit form with the full plant picker and a live, seeded preview.
- Wilted look for every plant on the stage engine, and the stage-up animation (see [plant-generation.md](plant-generation.md#39-health-the-wilted-look)). Both can be tried on `/plants`.
- Plants checked on the dark theme; the pot's shadow is a theme token.

**Open**
- **Garden page** is not yet fully on the design system. The login screen is: see [login-wall.md](login-wall.md).
- **Missing components:** Modal, toast, input wrappers.
- **Lotus** is not on the stage engine, so it does not wilt or animate yet.
