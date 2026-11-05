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
- **Transitions:** `--transition-fast` 120ms for hover and press, `-normal` 160ms, `-slow` 240ms.

## 6. Illustration: plants and pots

The plant is the main visual. Style reference: the icons in Animal Crossing: New Horizons.

- **Flat fills.** No outlines, no gradients, no textures.
- **Two tones per leaf**, with the lighter half on one side of the midrib, plus a soft highlight.
- **Soft shapes.** Rounded corners and stems, a small inward notch on heart leaves.
- **Colors** come from the plant's own palette and the pot palettes (terracotta, cream, sage, sky, blush), which sit well on the milk background.
- **Each plant is unique but stable.** A habit's integer seed always draws the same plant and pot.
- **Growth is a small number of stages**, each a larger copy of the full plant, not a continuous animation. Stage count and sizes are in the plant config, not in components.
- **Size.** The `scale` prop resizes the whole picture (plant and pot). It never changes where leaves or stems sit.
- **Containment.** Leaves stay above the soil line and within the pot's width (8px overhang allowed), so plants never overlap neighbors in the grid.

Plant types in the first version: **pothos**, **peace lily** and **pilea** — ids `pothos`, `peace_lily`, `pilea`. This is the final list (issue #155), and the backend validates `plant_type` against the same three. Pothos and peace lily use the stage engine; pilea is still on the older engine.

## 7. Layout

**App shell.** A top navigation bar with My Garden, Dashboard, Badges, Settings and an Add Habit button. On small screens it becomes a bottom bar.

`AppShell` is shared by routes in `app/(signed-in)/`, behind the layout's auth guard. It supplies centered content, a skip link and space for the mobile bar and safe area. `NavBar` marks the current route with `aria-current` and a thin outline around the item. My Garden (`/`) and Add Habit (`/create`) are available; Dashboard, Badges and Settings are disabled until those pages exist. Navigation switches to a top bar at 52rem; compact labels (Garden and Add) give the mobile items more room, with full accessible names. The style guide includes contained desktop and phone previews.

**Alignment.** Page content is left aligned in a centered column with a maximum width. Only the login screen and empty states are center aligned, because they hold a single message.

**Garden.** An auto-fill grid of plant cards. Each card is a pot, the plant, the habit name and a progress bar.

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

**Habit Details.** Plant on top, then progress, then history.

```
+--------------------------------+
| <- Garden                      |
|        (plant, large)          |
|        Gym  - 3 times a week   |
| [ Log activity ]               |
|--------------------------------|
| This week  2/3  ==--           |
| Overall    40%  (ring)         |
| Consistency  75%   Streak 3    |
|--------------------------------|
| History (calendar + periods)   |
+--------------------------------+
```

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
| Inputs | CSS classes in `inputs.css`; a React wrapper is not built yet |

Still to build: Modal, ProgressBar with tick marks, toast (for the undo after logging).

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
- **One orchestrated moment:** when a log moves a plant to the next stage, the plant grows from the old size to the new one. This is the one place where motion is the main event.
- No entrance animation on every section, no hover animation on every card.
- Respect `prefers-reduced-motion`: replace movement with an instant change.

## 11. Quality floor

Every screen meets these before it is merged.

- **Responsive** from 360px wide up. No horizontal scrolling.
- **Keyboard:** every action is reachable and has a visible focus ring. Gestures (press and hold) have a button equivalent.
- **Contrast:** text meets WCAG AA in both themes.
- **Not by color alone:** status uses an icon or text too.
- **Reduced motion** is honored.
- **Touch targets** are at least 44px.
- **Both themes** checked, with a screenshot, before the PR.

## 12. Code structure

```
frontend/src/
  app/             routes (Next.js App Router): login, style-guide, plants, home
  views/           full screens used by routes: Garden, Login
  components/      shared UI: Button, Card, Icon
  plants/          plant drawing and generation (see plant-generation.md)
    pothos/        the pothos: config, leaf, component
    pot/           the pot shared by all plants
    staged/        the stage engine
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
- Procedural plants and pots, and the `/plants` prototype page.

**Open**
- **Login and Garden pages** are placeholders and are not yet on the design system.
- **Pilea** is on the older engine and does not follow the stage rules.
- **Missing components:** Modal, ProgressBar with ticks, toast, input wrappers.
- **Plants on dark surfaces.** Check the pot and leaf colors against the dark theme.
- **Stage-up animation** is described in section 10 but not built.
- **Health look.** The rules (backend-design.md section 8.8) describe a wilting plant; how the drawing changes for health is not decided yet.
