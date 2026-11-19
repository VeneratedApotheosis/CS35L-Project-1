import { Suspense } from "react"
import { HabitRoute } from "./HabitRoute"

// The habit id is in the query string (/habit?id=...), because a static export
// cannot serve a path for ids it never saw at build time. useSearchParams needs
// a Suspense boundary so the page can still be built statically.
export default function HabitPage() {
  return (
    <Suspense fallback={null}>
      <HabitRoute />
    </Suspense>
  )
}
