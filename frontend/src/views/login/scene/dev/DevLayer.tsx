"use client"

import { CANVAS, pointsText, round1 } from "../geometry"
import { plantBounds, shelfFaces } from "../placement"
import { SAFE_ZONE, SHELVES } from "../room"
import type { ScenePlant } from "../types"
import { labelLanes, labelLines } from "./plantLine"

export interface DevShow {
  labels: boolean
  bounds: boolean
  shelves: boolean
  grid: boolean
  safeZone: boolean
  sunlight: boolean
}

const GRID_STEP = 100

/**
 * What the dev tools draw on top of the scene: a label on every plant, a box
 * around each, the shelf boards, a grid and the text area. Every plant also gets
 * an invisible box that can be clicked to select it. The overlay is drawn in the
 * same order as the plants, so the plant on top is the one that gets the click.
 */
export function DevLayer({
  plants,
  selectedId,
  onSelect,
  show,
}: {
  plants: readonly ScenePlant[]
  selectedId: string | null
  onSelect: (id: string) => void
  show: DevShow
}) {
  const ordered = [...plants].sort((a, b) => a.y - b.y)
  const lanes = labelLanes(plants)
  const lines: number[] = []
  for (let v = 0; v <= CANVAS.width; v += GRID_STEP) lines.push(v)
  const rows: number[] = []
  for (let v = 0; v <= CANVAS.height; v += GRID_STEP) rows.push(v)

  return (
    <g fontFamily="ui-monospace, Menlo, Consolas, monospace" data-dev-layer>
      {show.grid && (
        <g stroke="#000" strokeOpacity="0.16" strokeWidth="1" fontSize="11" fill="#000" fillOpacity="0.55">
          {lines.map((x) => (
            <g key={"v" + x}>
              <line x1={x} y1={0} x2={x} y2={CANVAS.height} />
              <text x={x + 3} y={12} stroke="none">{x}</text>
            </g>
          ))}
          {rows.map((y) => (
            <g key={"h" + y}>
              <line x1={0} y1={y} x2={CANVAS.width} y2={y} />
              <text x={3} y={y - 3} stroke="none">{y}</text>
            </g>
          ))}
        </g>
      )}

      {show.safeZone && (
        <g>
          <rect
            x={SAFE_ZONE.x} y={SAFE_ZONE.y} width={SAFE_ZONE.width} height={SAFE_ZONE.height}
            fill="#e0443e" fillOpacity="0.08" stroke="#e0443e" strokeWidth="2" strokeDasharray="8 6"
          />
          <text x={SAFE_ZONE.x + 8} y={SAFE_ZONE.y + 18} fontSize="13" fill="#b3261e">text area: no plants</text>
        </g>
      )}

      {show.shelves && (
        <g fill="none" stroke="#d6336c" strokeWidth="2">
          {SHELVES.map((shelf) => {
            const { top } = shelfFaces(shelf)
            return (
              <g key={shelf.id}>
                <polygon points={pointsText(top)} />
                <text x={round1(top[0].x)} y={round1(top[0].y - 6)} fontSize="12" fill="#d6336c" stroke="none">{shelf.id}</text>
              </g>
            )
          })}
        </g>
      )}

      {ordered.map((plant) => {
        const box = plantBounds(plant)
        const selected = plant.id === selectedId
        const lane = lanes.get(plant.id) ?? 0
        const [name, details] = labelLines(plant)
        const top = plant.y + 16 + lane * 28
        return (
          <g key={plant.id}>
            <rect
              data-plant-box={plant.id}
              x={round1(box.x)} y={round1(box.y)} width={round1(box.width)} height={round1(box.height)}
              fill="transparent"
              stroke={selected ? "#f08c00" : "#1c7ed6"}
              strokeWidth={selected ? 3 : 1.5}
              strokeDasharray={selected ? undefined : "5 4"}
              strokeOpacity={selected || show.bounds ? 1 : 0}
              pointerEvents="all"
              style={{ cursor: "pointer" }}
              onClick={() => onSelect(plant.id)}
            />
            {show.labels && (
              <g pointerEvents="none">
                <line x1={round1(plant.x)} y1={round1(plant.y)} x2={round1(plant.x)} y2={round1(top - 10)} stroke="#222" strokeOpacity="0.45" strokeWidth="1" />
                <text
                  data-label={plant.id}
                  x={round1(plant.x)}
                  y={round1(top)}
                  textAnchor="middle"
                  fontSize="11"
                  fill={selected ? "#c25e00" : "#222"}
                  stroke="#fff"
                  strokeWidth="3"
                  paintOrder="stroke"
                >
                  <tspan x={round1(plant.x)} fontWeight={700}>{name}</tspan>
                  <tspan x={round1(plant.x)} dy="12" fontWeight={500}>{details}</tspan>
                </text>
              </g>
            )}
          </g>
        )
      })}
    </g>
  )
}
