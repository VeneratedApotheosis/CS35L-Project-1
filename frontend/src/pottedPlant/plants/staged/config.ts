import type { StagedPlantConfig } from "./types"

const validated = new WeakSet<StagedPlantConfig>()

/**
 * Check the assumptions the engine makes about a config, and fail loudly with
 * every problem listed. Passing configs are remembered, so calling this on
 * each plant is cheap.
 */
export function validateConfig(config: StagedPlantConfig): void {
  if (validated.has(config)) return

  const problems: string[] = []
  const check = (ok: boolean, message: string) => {
    if (!ok) problems.push(message)
  }
  const inUnit = (n: number) => n >= 0 && n <= 1
  const ordered = (r: readonly [number, number]) => r[0] <= r[1]

  const { stages, dome, limits, pot, roots, layers, stems, leaves, coverage, search } = config

  check(stages.max >= 1, "stages.max must be at least 1")
  check(stages.default >= 1 && stages.default <= stages.max, "stages.default must be between 1 and stages.max")
  check(stages.minLeaves >= 1, "stages.minLeaves must be at least 1")
  check(stages.minLeaves <= stages.maxLeaves, "stages.minLeaves must not exceed stages.maxLeaves")
  check(stages.leafCountCurve > 0, "stages.leafCountCurve must be above 0")
  check(stages.growthRatio > 1, "stages.growthRatio must be above 1")

  check(dome.halfWidth > 0 && dome.height > 0, "dome.halfWidth and dome.height must be above 0")
  check(
    dome.anchor.x - dome.halfWidth >= limits.left && dome.anchor.x + dome.halfWidth <= limits.right,
    "the dome must fit between limits.left and limits.right",
  )
  check(dome.anchor.y <= limits.floor, "the dome's anchor must sit on or above limits.floor")

  check(pot.rimLeft < pot.rimRight, "pot.rimLeft must be left of pot.rimRight")

  check(ordered(roots.range) && roots.range[0] < roots.range[1], "roots.range must run from low to high")
  check(inUnit(roots.range[0]) && inUnit(roots.range[1]), "roots.range must stay between 0 and 1")
  check(inUnit(roots.middle), "roots.middle must be between 0 and 1")

  check(layers.bands.length >= 1, "layers.bands needs at least one band")
  check(
    layers.bands.every((b) => b.start >= 0 && b.width >= 0 && b.start + b.width <= 1),
    "every layer band must sit inside 0..1",
  )

  check(ordered(stems.lengthRange), "stems.lengthRange must run from low to high")
  check(stems.minLength > 0 && stems.minLength <= stems.lengthRange[0], "stems.minLength must be above 0 and no longer than the lowest layer")
  check(stems.shrinkFloor > 0 && stems.shrinkFloor <= 1, "stems.shrinkFloor must be in (0, 1]")
  check(stems.shrinkStep > 0 && stems.shrinkStep < 1, "stems.shrinkStep must be in (0, 1)")
  check(ordered(stems.headingJitter), "stems.headingJitter must run from low to high")

  check(ordered(leaves.lengthRange), "leaves.lengthRange must run from low to high")
  check(ordered(leaves.lengthFactor), "leaves.lengthFactor must run from low to high")
  check(ordered(leaves.curl) && ordered(leaves.jitter), "leaves.curl and leaves.jitter must run from low to high")
  check(leaves.shrinkStep > 0 && leaves.shrinkStep < 1, "leaves.shrinkStep must be in (0, 1)")

  if (config.fan) {
    check(inUnit(config.fan.outerThreshold), "fan.outerThreshold must be between 0 and 1")
    check(ordered(config.fan.strength), "fan.strength must run from low to high")
    check(inUnit(config.fan.strength[0]) && inUnit(config.fan.strength[1]), "fan.strength must stay between 0 and 1")
    check(ordered(config.fan.turn), "fan.turn must run from low to high")
  }

  check(inUnit(coverage.target), "coverage.target must be between 0 and 1")
  check(coverage.canopyFloor >= 0 && coverage.canopyFloor < 1, "coverage.canopyFloor must be in [0, 1)")
  check(coverage.gridX >= 1 && coverage.gridY >= 1, "coverage.gridX and coverage.gridY must be at least 1")
  check(coverage.maxOverlap >= 1, "coverage.maxOverlap must be at least 1")

  check(search.lengthSteps >= 2, "search.lengthSteps must be at least 2")
  check(search.fitSegments >= 1 && search.measureSegments >= 1, "search segments must be at least 1")
  check(search.fitAttempts >= 1 && search.stemSteps >= 1, "search attempts must be at least 1")

  if (problems.length > 0) {
    throw new Error("Invalid plant config '" + config.name + "':\n- " + problems.join("\n- "))
  }
  validated.add(config)
}
