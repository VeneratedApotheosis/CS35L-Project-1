"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Dices } from "lucide-react"
import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { ApiError } from "@/lib/api"
import { createHabit, HABIT_LIMITS, type IntervalUnit } from "@/lib/habits"
import {
  computeEndDate,
  durationPhrase,
  formatDate,
  goalSentence,
  todayISO,
} from "@/lib/goal"
import {
  DEFAULT_PLANT_TYPE,
  PLANT_TYPES,
  plantTypeById,
} from "@/plants/plantTypes"

type Step = "edit" | "confirm"
type Errors = Partial<Record<string, string>>

const INTERVAL_UNITS: { value: IntervalUnit; label: string }[] = [
  { value: "day", label: "days" },
  { value: "week", label: "weeks" },
  { value: "month", label: "months" },
]

export default function CreateHabit() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [targetCount, setTargetCount] = useState("1")
  const [intervalCount, setIntervalCount] = useState("1")
  const [intervalUnit, setIntervalUnit] = useState<IntervalUnit>("week")
  const [numPeriods, setNumPeriods] = useState("")
  const [startDate, setStartDate] = useState(todayISO())
  const [plantType, setPlantType] = useState(DEFAULT_PLANT_TYPE)
  const [seed, setSeed] = useState(randomSeed)

  const [step, setStep] = useState<Step>("edit")
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const today = todayISO()

  // Parsed numbers, used for the live preview. NaN when the field is empty.
  const nums = {
    targetCount: Number.parseInt(targetCount, 10),
    intervalCount: Number.parseInt(intervalCount, 10),
    numPeriods: Number.parseInt(numPeriods, 10),
  }

  const previewReady =
    Number.isFinite(nums.targetCount) &&
    Number.isFinite(nums.intervalCount) &&
    Number.isFinite(nums.numPeriods) &&
    nums.numPeriods > 0

  const sentence = useMemo(() => {
    if (!previewReady) return ""
    return goalSentence({
      name,
      targetCount: nums.targetCount,
      intervalCount: nums.intervalCount,
      intervalUnit,
      numPeriods: nums.numPeriods,
    })
  }, [
    previewReady,
    name,
    nums.targetCount,
    nums.intervalCount,
    nums.numPeriods,
    intervalUnit,
  ])

  const endDate =
    previewReady && startDate
      ? computeEndDate(startDate, intervalUnit, nums.intervalCount, nums.numPeriods)
      : ""

  const selected = plantTypeById(plantType)

  function validate(): Errors {
    const next: Errors = {}
    const trimmed = name.trim()

    if (trimmed.length < HABIT_LIMITS.name.min) {
      next.name = "Name is required."
    } else if (trimmed.length > HABIT_LIMITS.name.max) {
      next.name = `Keep the name under ${HABIT_LIMITS.name.max} characters.`
    }

    if (description.length > HABIT_LIMITS.description.max) {
      next.description = `Keep the description under ${HABIT_LIMITS.description.max} characters.`
    }

    if (!inRange(nums.targetCount, HABIT_LIMITS.targetCount)) {
      next.targetCount = `Enter a number from ${HABIT_LIMITS.targetCount.min} to ${HABIT_LIMITS.targetCount.max}.`
    }

    if (!inRange(nums.intervalCount, HABIT_LIMITS.intervalCount)) {
      next.intervalCount = `Enter a number from ${HABIT_LIMITS.intervalCount.min} to ${HABIT_LIMITS.intervalCount.max}.`
    }

    if (numPeriods.trim() === "") {
      next.numPeriods = "Number of periods is required."
    } else if (!inRange(nums.numPeriods, HABIT_LIMITS.numPeriods)) {
      next.numPeriods = `Enter a number from ${HABIT_LIMITS.numPeriods.min} to ${HABIT_LIMITS.numPeriods.max}.`
    }

    if (!startDate) {
      next.startDate = "Start date is required."
    } else if (startDate < today) {
      next.startDate = "Start date can't be in the past."
    }

    return next
  }

  function handleReview(event: React.FormEvent) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length === 0) {
      setSubmitError("")
      setStep("confirm")
    }
  }

  async function handleCreate() {
    setSubmitting(true)
    setSubmitError("")
    try {
      await createHabit({
        name: name.trim(),
        description: description.trim() || undefined,
        plant_type: plantType,
        target_count: nums.targetCount,
        interval_count: nums.intervalCount,
        interval_unit: intervalUnit,
        num_periods: nums.numPeriods,
        start_date: startDate,
      })
      router.push("/dashboard")
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Couldn't save the habit. Try again."
      setSubmitError(message)
      setStep("edit")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main
      style={{
        maxWidth: "64rem",
        margin: "0 auto",
        padding: "var(--page-padding)",
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        icon={ArrowLeft}
        onClick={() => router.push("/")}
      >
        Garden
      </Button>

      <h1
        className="text-display"
        style={{ margin: "var(--space-4) 0 var(--space-6)" }}
      >
        Create a habit
      </h1>

      {step === "edit" ? (
        <form className="form" onSubmit={handleReview} noValidate>
          <div className="create-grid">
          <div className="create-grid__fields">
          <div className="field">
            <label className="field__label" htmlFor="habit-name">
              Name
            </label>
            <input
              id="habit-name"
              className="input"
              value={name}
              maxLength={HABIT_LIMITS.name.max}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "habit-name-error" : undefined}
              placeholder="Go to the gym"
            />
            {errors.name && (
              <p className="field__error" id="habit-name-error">
                {errors.name}
              </p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="habit-description">
              Description <span className="field__optional">(optional)</span>
            </label>
            <textarea
              id="habit-description"
              className="textarea"
              rows={3}
              value={description}
              maxLength={HABIT_LIMITS.description.max}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={Boolean(errors.description)}
              aria-describedby={
                errors.description ? "habit-description-error" : undefined
              }
            />
            {errors.description && (
              <p className="field__error" id="habit-description-error">
                {errors.description}
              </p>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="habit-target">
              Target per period
            </label>
            <input
              id="habit-target"
              className="input"
              type="number"
              inputMode="numeric"
              min={HABIT_LIMITS.targetCount.min}
              max={HABIT_LIMITS.targetCount.max}
              value={targetCount}
              onChange={(e) => setTargetCount(e.target.value)}
              aria-invalid={Boolean(errors.targetCount)}
              aria-describedby={
                errors.targetCount ? "habit-target-error" : undefined
              }
            />
            {errors.targetCount && (
              <p className="field__error" id="habit-target-error">
                {errors.targetCount}
              </p>
            )}
          </div>

          <div className="field">
            <span className="field__label" id="habit-period-label">
              Every
            </span>
            <div
              className="period-group"
              role="group"
              aria-labelledby="habit-period-label"
            >
              <input
                id="habit-interval"
                className="input period-group__count"
                type="number"
                inputMode="numeric"
                aria-label="Interval count"
                min={HABIT_LIMITS.intervalCount.min}
                max={HABIT_LIMITS.intervalCount.max}
                value={intervalCount}
                onChange={(e) => setIntervalCount(e.target.value)}
                aria-invalid={Boolean(errors.intervalCount)}
                aria-describedby={
                  errors.intervalCount ? "habit-interval-error" : undefined
                }
              />
              <select
                id="habit-unit"
                className="select"
                aria-label="Interval unit"
                value={intervalUnit}
                onChange={(e) =>
                  setIntervalUnit(e.target.value as IntervalUnit)
                }
              >
                {INTERVAL_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            {errors.intervalCount && (
              <p className="field__error" id="habit-interval-error">
                {errors.intervalCount}
              </p>
            )}
          </div>

          <div className="field-row">
            <div className="field">
              <label className="field__label" htmlFor="habit-periods">
                Number of periods
              </label>
              <input
                id="habit-periods"
                className="input"
                type="number"
                inputMode="numeric"
                min={HABIT_LIMITS.numPeriods.min}
                max={HABIT_LIMITS.numPeriods.max}
                value={numPeriods}
                onChange={(e) => setNumPeriods(e.target.value)}
                aria-invalid={Boolean(errors.numPeriods)}
                aria-describedby={
                  errors.numPeriods ? "habit-periods-error" : undefined
                }
                placeholder="4"
              />
              {errors.numPeriods ? (
                <p className="field__error" id="habit-periods-error">
                  {errors.numPeriods}
                </p>
              ) : (
                previewReady && (
                  <p className="field__hint">
                    {durationPhrase(
                      nums.intervalCount,
                      intervalUnit,
                      nums.numPeriods,
                    )}
                  </p>
                )
              )}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="habit-start">
                Start date
              </label>
              <input
                id="habit-start"
                className="input"
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-invalid={Boolean(errors.startDate)}
                aria-describedby={
                  errors.startDate ? "habit-start-error" : undefined
                }
              />
              {errors.startDate && (
                <p className="field__error" id="habit-start-error">
                  {errors.startDate}
                </p>
              )}
            </div>
          </div>

          {sentence && (
            <Card variant="muted">
              <p className="goal-preview">{sentence}</p>
              {endDate && (
                <p className="goal-preview__dates">
                  Ends {formatDate(endDate)}.
                </p>
              )}
            </Card>
          )}

          {submitError && (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          )}

          <div className="form-actions">
            <Button type="submit" variant="primary">
              Review habit
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/")}
            >
              Cancel
            </Button>
          </div>
          </div>

          <aside className="create-grid__plant">
            <div className="field">
              <span className="field__label" id="habit-plant-label">
                Plant
              </span>
              <div
                className="plant-picker"
                role="group"
                aria-labelledby="habit-plant-label"
              >
                {PLANT_TYPES.map((plant) => (
                  <Button
                    key={plant.id}
                    variant={plant.id === plantType ? "primary" : "secondary"}
                    size="sm"
                    aria-pressed={plant.id === plantType}
                    aria-label={`${plant.label}. ${plant.blurb}`}
                    onClick={() => setPlantType(plant.id)}
                  >
                    {plant.label}
                  </Button>
                ))}
              </div>
            </div>

            {selected && (
              <div className="plant-hero">
                <div className="plant-hero__art">
                  <selected.Preview seed={seed} />
                </div>
              </div>
            )}

            <div className="plant-generate">
              <Button
                variant="ghost"
                size="sm"
                icon={Dices}
                onClick={() => setSeed(randomSeed())}
              >
                Generate another
              </Button>
            </div>
          </aside>
          </div>
        </form>
      ) : (
        <div className="form" style={{ maxWidth: "42rem" }}>
          <Card>
            <p className="goal-preview">{sentence}</p>
            <dl className="confirm-summary" style={{ marginTop: "var(--space-4)" }}>
              <div>
                <dt>Plant</dt>
                <dd>{selected?.label}</dd>
              </div>
              <div>
                <dt>Starts</dt>
                <dd>{formatDate(startDate)}</dd>
              </div>
              <div>
                <dt>Ends</dt>
                <dd>{endDate ? formatDate(endDate) : "—"}</dd>
              </div>
            </dl>
          </Card>

          <p className="confirm-note">
            Goal, period, and duration can&apos;t be changed after you create
            the habit. To fix a mistake, delete the habit and create it again.
          </p>

          {submitError && (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          )}

          <div className="form-actions">
            <Button
              type="button"
              variant="primary"
              disabled={submitting}
              onClick={() => void handleCreate()}
            >
              {submitting ? "Creating…" : "Create habit"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={submitting}
              onClick={() => setStep("edit")}
            >
              Back
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}

function inRange(value: number, range: { min: number; max: number }): boolean {
  return Number.isInteger(value) && value >= range.min && value <= range.max
}

/** A random seed for the plant preview, so "Generate another" shows a new one. */
function randomSeed(): number {
  return Math.floor(Math.random() * 100000)
}
