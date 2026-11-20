"use client"

import { useSearchParams } from "next/navigation"
import JoinHabit from "@/views/JoinHabit"

export function JoinRoute() {
  const code = useSearchParams().get("code") ?? ""
  return <JoinHabit key={code} code={code} />
}
