import Link from "next/link"
import { ArrowLeft, Trash2 } from "lucide-react"
import { Button } from "@/components/Button"
import type { HabitDetail } from "@/lib/habits"

/**
 * The top of the page: a way back, the name as the title, the description if there is one, and Delete.
 */
export function HabitHeader({ habit, onDelete }: { habit: HabitDetail; onDelete: () => void }) {
  return (
    <header className="habit-head">
      <Link href="/" className="habit-head__back" aria-label="Back to Garden">
        <ArrowLeft size={18} aria-hidden="true" />
        Garden
      </Link>
      <div className="habit-head__row">
        <div className="habit-head__title">
          <h1 id="habit-name" className="habit-head__name">{habit.name}</h1>
          {habit.description && <p className="habit-head__desc">{habit.description}</p>}
        </div>
        <Button variant="secondary" icon={Trash2} className="habit-head__delete" aria-label="Delete habit" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </header>
  )
}
