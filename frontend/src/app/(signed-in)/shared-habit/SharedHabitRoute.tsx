"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import SharedHabitDetails from "@/views/SharedHabitDetails"

export function SharedHabitRoute() {
  const id = useSearchParams().get("id")
  if (!id) return <main className="stack-lg">
    <h1 className="text-h1">No shared habit was chosen</h1>
    <Link href="/" className="button button--ghost button--md self-start">Back to Garden</Link>
  </main>
  return <SharedHabitDetails key={id} id={id} />
}
