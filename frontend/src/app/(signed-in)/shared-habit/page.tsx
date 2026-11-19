import { Suspense } from "react"
import { SharedHabitRoute } from "./SharedHabitRoute"

export default function SharedHabitPage() {
  return <Suspense fallback={<main><p role="status">Loading shared habit…</p></main>}><SharedHabitRoute /></Suspense>
}
