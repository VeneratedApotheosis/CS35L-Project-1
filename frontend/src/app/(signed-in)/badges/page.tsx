import { Suspense } from "react"
import Badges from "@/views/Badges"

export default function BadgesPage() {
  // The page reads the address's query string, which needs a Suspense boundary in a static export.
  return <Suspense><Badges /></Suspense>
}
