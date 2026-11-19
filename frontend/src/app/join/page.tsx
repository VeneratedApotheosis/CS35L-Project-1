import { Suspense } from "react"
import { JoinRoute } from "./JoinRoute"

export default function JoinPage() {
  return <Suspense fallback={<main><p role="status">Loading invite…</p></main>}><JoinRoute /></Suspense>
}
