"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import HabitDetails from "@/views/HabitDetails"

export function HabitRoute() {
  const id = useSearchParams().get("id")
  if (!id) {
    return (
      <main className="stack-lg">
        <p>No habit was chosen.</p>
        <Link href="/" className="button button--ghost button--md self-start">Back to Garden</Link>
      </main>
    )
  }
  return <HabitDetails id={id} />
}
