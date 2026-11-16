/** Stable unsigned FNV-1a hash: the same habit uses the same plant and pot everywhere. */
export function habitSeed(id: string): number {
  let hash = 2166136261
  for (const character of id) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  }
  return hash >>> 0
}
