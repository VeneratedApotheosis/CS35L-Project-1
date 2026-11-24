import { Suspense } from "react"
import History from "@/views/History"

// The filter and sort are in the query string. useSearchParams needs a
// Suspense boundary so the page can still be built statically.
export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <History />
    </Suspense>
  )
}
