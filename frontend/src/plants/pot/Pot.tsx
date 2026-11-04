import { POT_PALETTES, type PotBand } from "./palettes"
import { POT_SHAPE } from "./shape"

/** Evenly spaced dot centers: bigger size means fewer dots. */
function dotXs(size: number) {
  const d = POT_SHAPE.dots
  const count = Math.max(d.minCount, Math.round(d.baseCount / size))
  return Array.from({ length: count }, (_, i) => d.firstX + (i * d.span) / (count - 1))
}

/** The pot, drawn in the shared plant canvas. See POT_SHAPE for every measurement. */
export function Pot({
  palette,
  band,
  size = 1,
  id,
}: {
  /** Index into POT_PALETTES. Values past the end wrap around. */
  palette: number
  band: PotBand
  /** Scales decoration only (stripe, dots, highlight). The pot keeps its shape. */
  size?: number
  /** Makes the pot's clip path unique when several pots share a page. */
  id: string
}) {
  const S = POT_SHAPE
  const colors = POT_PALETTES[palette % POT_PALETTES.length]
  const clip = id + S.body.clipIdSuffix

  return (
    <g>
      <ellipse cx={S.shadow.cx} cy={S.shadow.cy} rx={S.shadow.rx} ry={S.shadow.ry} fill={S.shadow.color} opacity={S.shadow.opacity} />
      <clipPath id={clip}>
        <path d={S.body.path} />
      </clipPath>
      <path d={S.body.path} fill={colors.body} />
      <g clipPath={"url(#" + clip + ")"}>
        <rect x={S.shade.x} y={S.shade.y} width={S.shade.width} height={S.shade.height} fill={colors.shade} opacity={S.shade.opacity} />
        {band === "stripe" && (
          <rect
            x={S.stripe.x}
            y={S.stripe.centerY - (S.stripe.thickness * size) / 2}
            width={S.stripe.width}
            height={S.stripe.thickness * size}
            fill={colors.band}
          />
        )}
        {band === "dots" &&
          dotXs(size).map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy={S.dots.rowsY[i % S.dots.rowsY.length]}
              r={S.dots.radius * size}
              fill={colors.band}
            />
          ))}
        <rect
          x={S.highlight.x}
          y={S.highlight.y}
          width={S.highlight.width * size}
          height={S.highlight.height}
          rx={(S.highlight.width * size) / 2}
          fill={S.highlight.color}
          opacity={S.highlight.opacity}
        />
      </g>
      <rect x={S.rim.x} y={S.rim.y} width={S.rim.width} height={S.rim.height} rx={S.rim.cornerRadius} fill={colors.rim} />
      <rect
        x={S.rimHighlight.x}
        y={S.rimHighlight.y}
        width={S.rimHighlight.width}
        height={S.rimHighlight.height}
        rx={S.rimHighlight.cornerRadius}
        fill={S.rimHighlight.color}
        opacity={S.rimHighlight.opacity}
      />
      <ellipse cx={S.soil.cx} cy={S.soil.cy} rx={S.soil.rx} ry={S.soil.ry} fill={S.soil.color} />
      <ellipse cx={S.soilHighlight.cx} cy={S.soilHighlight.cy} rx={S.soilHighlight.rx} ry={S.soilHighlight.ry} fill={S.soilHighlight.color} />
    </g>
  )
}
