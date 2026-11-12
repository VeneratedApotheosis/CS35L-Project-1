"use client"

import { useState } from "react"
import { Button } from "@/components/Button"
import { PlantCard, type PlantHealth } from "@/components/PlantCard"
import { PLANT_TYPES } from "@/pottedPlant/plants/plantTypes"

const stages = [1, 2, 3, 4] as const
const healthOptions: { value: PlantHealth; label: string }[] = [
  { value: "healthy", label: "Healthy" },
  { value: "slightly_wilted", label: "Slightly wilted" },
  { value: "wilted", label: "Wilted" },
]

/** Local demo data: these actions never create or change a saved habit. */
export function PlantCardExamples() {
  const [stage, setStage] = useState<1 | 2 | 3 | 4>(4)
  const [health, setHealth] = useState<PlantHealth>("healthy")
  const [counts, setCounts] = useState<Record<string, number>>({ pothos: 2, peace_lily: 1, pilea: 4 })
  const [message, setMessage] = useState("")

  return (
    <div className="stack-lg">
      <div className="flex flex-wrap gap-6">
        <label className="stack-sm">
          <span className="text-caption">Growth stage</span>
          <select className="select" value={stage}
            onChange={(event) => setStage(Number(event.target.value) as typeof stage)}>
            {stages.map((value) => <option key={value} value={value}>Stage {value}</option>)}
          </select>
        </label>
        <label className="stack-sm">
          <span className="text-caption">Plant health</span>
          <select className="select" value={health}
            onChange={(event) => setHealth(event.target.value as PlantHealth)}>
            {healthOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <Button variant="secondary" className="self-end" onClick={() => {
          setCounts({ pothos: 0, peace_lily: 0, pilea: 0 })
          setMessage("Demo counts reset")
        }}>Reset counts</Button>
      </div>
      <div className="plant-card-grid">
        {PLANT_TYPES.map((plant, index) => (
          <PlantCard key={plant.id} name={["Read a little", "Take a walk", "Practice piano"][index]}
            plantType={plant.id} seed={42 + index} stage={stage} health={health}
            count={counts[plant.id]} target={3} periodLabel="This week"
            onLogActivity={() => {
              setCounts((current) => ({ ...current, [plant.id]: current[plant.id] + 1 }))
              setMessage(`Activity logged for ${plant.label} (demo only)`)
            }}
            onViewDetails={() => setMessage(`View details selected for ${plant.label} (demo only)`)}
            onEditHabit={() => setMessage(`Edit habit selected for ${plant.label} (demo only)`)}
          />
        ))}
      </div>
      <p className="text-body-sm text-secondary" role="status">{message || "Open a card’s options to log an activity, view details, or edit the demo habit."}</p>
    </div>
  )
}
