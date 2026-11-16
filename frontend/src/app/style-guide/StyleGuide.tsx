"use client"

import { useState } from "react"
import {
  Bell,
  Calendar,
  Check,
  Flower2,
  Leaf,
  Moon,
  Plus,
  Sprout,
  Sun,
  Trash2,
} from "lucide-react"
import { Button, type ButtonVariant } from "@/components/Button"
import { Modal } from "@/components/Modal"
import { Toast, type ToastProps } from "@/components/Toast"
import { Card } from "@/components/Card"
import { Icon } from "@/components/Icon"
import { NavBar } from "@/components/NavBar"
import { ProgressRing } from "@/components/ProgressRing"
import { ProgressBar } from "@/components/ProgressBar"
import { useTheme } from "@/styles/ThemeProvider"
import { PlantCardExamples } from "./PlantCardExamples"

/* ------------------------------------------------------------------ */
/* Showcase data                                                       */
/* ------------------------------------------------------------------ */

const buttonVariants: { name: string; variant: ButtonVariant }[] = [
  { name: "Primary", variant: "primary" },
  { name: "Secondary", variant: "secondary" },
  { name: "Ghost", variant: "ghost" },
  { name: "Danger", variant: "danger" },
]

const paletteSwatches: { label: string; token: string; hex: string }[] = [
  { label: "Almond milk", token: "--milk", hex: "#F5F1E6" },
  { label: "Pearl", token: "--pearl", hex: "#ECE7DA" },
  { label: "Roasted oat", token: "--oat", hex: "#B7A48A" },
  { label: "Ink", token: "--ink", hex: "#342F29" },
  { label: "Garden teal", token: "--teal", hex: "#48BDA6" },
  { label: "Action green", token: "--action-green", hex: "#83C17D" },
  { label: "Coral", token: "--coral", hex: "#E96F5C" },
  { label: "Sun yellow", token: "--yellow", hex: "#F2C84B" },
]

const typeSpecimens: { label: string; className: string; sample: string }[] = [
  { label: "Display", className: "text-display", sample: "Grow a habit." },
  { label: "Heading 1", className: "text-h1", sample: "A soft place to begin." },
  { label: "Heading 2", className: "text-h2", sample: "Thoughtful and calm." },
  { label: "Heading 3", className: "text-h3", sample: "Plant something today." },
  {
    label: "Body",
    className: "text-body",
    sample:
      "Warm shapes and quiet colors make everyday actions feel a little more human.",
  },
  { label: "Caption", className: "text-caption", sample: "Small, clear details." },
]

const iconSpecimens: { label: string; icon: typeof Leaf }[] = [
  { label: "Sprout", icon: Sprout },
  { label: "Leaf", icon: Leaf },
  { label: "Flower", icon: Flower2 },
  { label: "Calendar", icon: Calendar },
  { label: "Bell", icon: Bell },
  { label: "Plus", icon: Plus },
]

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

/** A button that toggles a selected state, shown as a trailing check. */
function SelectableButton({
  variant,
  defaultSelected,
  children,
}: {
  variant: ButtonVariant
  defaultSelected: boolean
  children: React.ReactNode
}) {
  const [selected, setSelected] = useState(defaultSelected)

  return (
    <Button
      variant={selected ? "primary" : variant}
      icon={selected ? Check : undefined}
      iconPosition="end"
      aria-pressed={selected}
      onClick={() => setSelected((value) => !value)}
    >
      {children}
    </Button>
  )
}

function Section({
  index,
  eyebrow,
  title,
  description,
  children,
}: {
  index: string
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-eyebrow text-muted">
          {index} · {eyebrow}
        </p>
        <h2 className="text-h2">{title}</h2>
        <p className="text-body-sm text-secondary max-w-prose">{description}</p>
      </header>
      {children}
    </section>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function ProgressExamples() {
  const [count, setCount] = useState(2)

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card className="flex min-w-0 flex-col gap-6">
        <ProgressBar label="Reading this week" count={count} target={3} />
        <div className="flex flex-wrap gap-3">
          <Button icon={Plus} onClick={() => setCount((value) => value + 1)}>
            Log activity
          </Button>
          <Button variant="secondary" onClick={() => setCount(0)}>
            Reset
          </Button>
        </div>
      </Card>
      <Card className="flex min-w-0 flex-col gap-6">
        <ProgressBar label="Getting started" count={0} target={1} />
        <ProgressBar label="Goal met" count={1} target={1} />
        <ProgressBar label="Above the goal" count={4} target={3} />
        <ProgressBar label="Ten-step goal" count={6} target={10} />
        <ProgressBar label="Larger goals use a smooth bar" count={6} target={11} />
        <ProgressBar label="A larger goal" count={27} target={50} />
      </Card>
    </div>
  )
}

function FeedbackExamples() {
  const [modalOpen, setModalOpen] = useState(false)
  const [count, setCount] = useState(0)
  const [notification, setNotification] = useState<(Pick<ToastProps, "message" | "variant" | "action"> & { id: number }) | null>(null)

  function logActivity() {
    setCount((value) => value + 1)
    setNotification({
      id: Date.now(), message: "Activity logged.",
      action: { label: "Undo", onClick: () => setCount((value) => value - 1) },
    })
  }

  return (
    <Card className="stack-md">
      <p className="text-body">Demo activities logged: {count}</p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setModalOpen(true)}>Open confirmation</Button>
        <Button variant="secondary" onClick={logActivity}>Log demo activity</Button>
        <Button variant="ghost" onClick={() => setNotification({ id: Date.now(), variant: "error", message: "Could not save your habit. Please try again." })}>Show error</Button>
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create this habit?"
        description="This is a preview. Confirming only shows a notification.">
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            setModalOpen(false)
            setNotification({ id: Date.now(), message: "Habit created (demo)." })
          }}>Create habit</Button>
        </div>
      </Modal>
      {notification && <Toast key={notification.id} message={notification.message} variant={notification.variant}
        action={notification.action} onDismiss={() => setNotification(null)} />}
    </Card>
  )
}

export default function StyleGuide() {
  const { theme, toggleTheme } = useTheme()

  return (
    <main className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-16 px-[var(--page-padding)] py-16">
        {/* Hero */}
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-4">
            <p className="text-eyebrow text-muted">Habit Garden · Design system</p>
            <h1 className="text-display max-w-2xl">
              Soft, useful, and a little joyful.
            </h1>
            <p className="text-body text-secondary max-w-prose">
              A warm foundation for the Habit Garden interface — almond-milk
              surfaces, rounded forms, and friendly everyday tools.
            </p>
          </div>
          <Button
            variant="secondary"
            icon={theme === "light" ? Moon : Sun}
            onClick={toggleTheme}
          >
            {theme === "light" ? "Dark mode" : "Light mode"}
          </Button>
        </header>

        {/* Color */}
        <Section
          index="01"
          eyebrow="Color"
          title="Palette"
          description="Grounding neutrals with a small set of living accents for plants, actions, and alerts."
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {paletteSwatches.map((swatch) => (
              <Card key={swatch.token} className="flex flex-col gap-3">
                <span
                  className="h-16 w-full rounded-[var(--radius-md)] border border-[var(--color-border)]"
                  style={{ background: `var(${swatch.token})` }}
                  aria-hidden="true"
                />
                <div className="flex flex-col gap-1">
                  <p className="text-caption">{swatch.label}</p>
                  <p className="text-body-sm text-muted">{swatch.hex}</p>
                </div>
              </Card>
            ))}
          </div>
        </Section>

        {/* Typography */}
        <Section
          index="02"
          eyebrow="Type"
          title="Typography"
          description="M PLUS Rounded 1c, a rounded family with generous forms and an easy reading rhythm."
        >
          <Card className="flex flex-col divide-y divide-[var(--color-border)]">
            {typeSpecimens.map((specimen) => (
              <div
                key={specimen.label}
                className="flex flex-col gap-2 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:gap-8"
              >
                <p className="text-eyebrow text-muted sm:w-28 sm:shrink-0">
                  {specimen.label}
                </p>
                <p className={specimen.className}>{specimen.sample}</p>
              </div>
            ))}
          </Card>
        </Section>

        {/* Buttons */}
        <Section
          index="03"
          eyebrow="Actions"
          title="Buttons"
          description="Four variants across three sizes. Try the selectable row — selecting a choice promotes it to the primary style with a check."
        >
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end gap-3">
              {buttonVariants.map(({ name, variant }) => (
                <Button key={variant} variant={variant}>
                  {name}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button variant="secondary" icon={Plus}>
                With icon
              </Button>
              <Button variant="ghost" icon={Calendar} iconPosition="end">
                Log activity
              </Button>
              <Button variant="danger" icon={Trash2}>
                Delete
              </Button>
              <Button disabled>Disabled</Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {buttonVariants.map(({ name, variant }) => (
                <SelectableButton
                  key={variant}
                  variant={variant}
                  defaultSelected={false}
                >
                  {name}
                </SelectableButton>
              ))}
            </div>

            <Button variant="primary" full icon={Sprout}>
              Plant your first habit
            </Button>
          </div>
        </Section>

        {/* Cards */}
        <Section
          index="04"
          eyebrow="Surfaces"
          title="Cards"
          description="Three surface treatments for grouping content at different levels of emphasis."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="flex flex-col gap-2">
              <p className="text-eyebrow text-muted">Default</p>
              <h3 className="text-h3">Resting surface</h3>
              <p className="text-body-sm text-secondary">
                The everyday container for habits and stats.
              </p>
            </Card>
            <Card variant="elevated" className="flex flex-col gap-2">
              <p className="text-eyebrow text-muted">Elevated</p>
              <h3 className="text-h3">Lifted surface</h3>
              <p className="text-body-sm text-secondary">
                For popovers and menus that float above the page.
              </p>
            </Card>
            <Card variant="muted" className="flex flex-col gap-2">
              <p className="text-eyebrow text-muted">Muted</p>
              <h3 className="text-h3">Quiet surface</h3>
              <p className="text-body-sm text-secondary">
                A recessed tone for secondary or empty states.
              </p>
            </Card>
          </div>
        </Section>

        {/* Inputs */}
        <Section
          index="05"
          eyebrow="Forms"
          title="Inputs"
          description="Text fields, areas, and selects share one rounded, focus-ringed baseline."
        >
          <Card className="grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-h3">Habit name</span>
              <input className="input" placeholder="Go to the gym" />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-h3">Plant type</span>
              <select className="select" defaultValue="sprout">
                <option value="sprout">Sprout</option>
                <option value="fern">Fern</option>
                <option value="sunflower">Sunflower</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 sm:col-span-2">
              <span className="text-h3">Description</span>
              <textarea
                className="textarea"
                rows={3}
                placeholder="A short note about this habit."
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-h3">Invalid field</span>
              <input
                className="input"
                aria-invalid="true"
                defaultValue="Needs attention"
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-h3">Disabled field</span>
              <input className="input" disabled value="Locked after creation" />
            </label>
          </Card>
        </Section>

        {/* Icons */}
        <Section
          index="06"
          eyebrow="Iconography"
          title="Icons"
          description="Lucide icons drawn with currentColor, so they inherit text tone. Sizes and tones come from the icon tokens."
        >
          <div className="flex flex-col gap-6">
            <Card className="flex flex-wrap items-center gap-6">
              {iconSpecimens.map(({ label, icon }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 text-[var(--color-text-secondary)]"
                >
                  <Icon icon={icon} size="lg" />
                  <span className="text-body-sm text-muted">{label}</span>
                </div>
              ))}
            </Card>

            <Card className="flex flex-wrap items-end gap-6">
              <div className="flex items-end gap-4">
                <Icon icon={Leaf} size="xs" />
                <Icon icon={Leaf} size="sm" />
                <Icon icon={Leaf} size="md" />
                <Icon icon={Leaf} size="lg" />
                <Icon icon={Leaf} size="xl" />
              </div>
              <div className="flex items-center gap-4">
                <Icon icon={Leaf} size="lg" tone="default" />
                <Icon icon={Leaf} size="lg" tone="muted" />
                <Icon icon={Leaf} size="lg" tone="brand" />
              </div>
            </Card>
          </div>
        </Section>

        <Section
          index="07"
          eyebrow="Navigation"
          title="Navigation and page shell"
          description="A top bar on wide screens and a bottom bar on phones. My Garden and Add Habit open the existing pages; the other destinations are not available yet. Both previews follow the theme switch above."
        >
          <div className="navbar-preview">
            <NavBar currentPath="/" preview />
            <div className="navbar-preview__content stack-sm">
              <h3 className="text-h3">My Garden</h3>
              <p className="text-body-sm text-secondary">Page content sits in a centered column beneath the desktop navigation.</p>
            </div>
          </div>
          <div className="navbar-preview navbar-preview--mobile">
            <div className="navbar-preview__content stack-sm">
              <h3 className="text-h3">Create habit</h3>
              <p className="text-body-sm text-secondary">On phones the navigation sits below the content, with room for the device’s safe area.</p>
            </div>
            <NavBar currentPath="/create" preview />
          </div>
        </Section>

        <Section
          index="08"
          eyebrow="Habit progress"
          title="Progress bars"
          description="Goals up to 10 show one step per activity. Larger goals use a smooth bar to avoid crowded ticks. Logging beyond the goal keeps the bar full and shows the actual count. Use the theme switch above to compare both themes."
        >
          <ProgressExamples />
          <div className="flex flex-wrap gap-6">
            <ProgressRing label="Not started" value={0} />
            <ProgressRing label="Partway there" value={0.42} />
            <ProgressRing label="Complete" value={1} />
            <ProgressRing label="Unavailable" value={null} />
          </div>
        </Section>

        <Section
          index="08"
          eyebrow="Garden"
          title="Plant cards"
          description="Each habit has a stable plant, a health label and current-period progress. Try every stage and health state, use the options with the keyboard, and switch themes above. All actions here use local demo data."
        >
          <PlantCardExamples />
        </Section>

        <Section
          index="10"
          eyebrow="Feedback"
          title="Modal and toast"
          description="Try the confirmation with Tab and Escape, then log an activity and undo it within five seconds. Both components follow the theme switch and reduced-motion preference."
        >
          <FeedbackExamples />
        </Section>

        <footer className="flex items-center justify-between border-t border-[var(--color-border)] pt-6">
          <span className="text-body-sm text-muted">Warmth over noise.</span>
          <span className="text-body-sm text-muted">Habit Garden · v1.0</span>
        </footer>
      </div>
    </main>
  )
}
