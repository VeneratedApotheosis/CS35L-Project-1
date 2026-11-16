import { pointsText, project, round1, type Point } from "../geometry"
import { shelfFaces, sideWallX } from "../placement"
import { COLORS, ROOM, SHELVES } from "../room"

/** One steel bracket: a short upright against the wall and a brace under the board. */
function Bracket({ wall, board, width }: { wall: Point; board: Point; width: number }) {
  const drop = 34
  return (
    <g stroke={COLORS.steel} strokeWidth={width} strokeLinecap="square">
      <line x1={round1(wall.x)} y1={round1(wall.y)} x2={round1(wall.x)} y2={round1(wall.y + drop)} />
      <line x1={round1(wall.x)} y1={round1(wall.y + drop)} x2={round1(board.x)} y2={round1(board.y)} />
    </g>
  )
}

/**
 * The shelves: a long upper shelf and a lower one on the back wall, turning the
 * corner along the right wall, and a high one on each side wall. Each board is a lit top, a darker front edge and
 * a faint shadow on the wall below it. The lower shelf stands on wooden legs.
 */
export function Shelves() {
  return (
    <g>
      {SHELVES.map((shelf) => {
        const { top, front } = shelfFaces(shelf)
        const bracketCount = shelf.side === "back" ? Math.max(2, Math.round((shelf.to - shelf.from) / 190)) : 2
        const brackets = Array.from({ length: bracketCount }, (_, i) => {
          const share = (i + 0.5) / bracketCount
          if (shelf.side === "back") {
            const x = shelf.from + (shelf.to - shelf.from) * share
            const wall = { x, y: front[0].y + shelf.thickness }
            return { key: i, wall, board: project({ x, y: shelf.y + shelf.thickness }, shelf.reach ?? 1.05), width: 5 }
          }
          const factor = shelf.from + (shelf.to - shelf.from) * share
          const edges = sideWallX(shelf)
          const wall = project({ x: edges.wall, y: shelf.y + shelf.thickness + 4 }, factor)
          const board = project({ x: edges.free, y: shelf.y + shelf.thickness }, factor)
          return { key: i, wall, board, width: round1(4 * factor) }
        })
        return (
          <g key={shelf.id}>
            {/* The shadow the board throws on the wall below it. */}
            <polygon
              points={pointsText(
                shelf.side === "back"
                  ? [
                      { x: top[0].x, y: top[0].y + shelf.thickness },
                      { x: top[1].x, y: top[1].y + shelf.thickness },
                      { x: top[1].x, y: top[1].y + shelf.thickness + 16 },
                      { x: top[0].x, y: top[0].y + shelf.thickness + 16 },
                    ]
                  : [front[0], front[1], { x: front[1].x, y: front[1].y + 22 }, { x: front[0].x, y: front[0].y + 22 }],
              )}
              fill={COLORS.woodDark}
              fillOpacity="0.14"
            />
            {(shelf.legs ?? []).map((x) => {
              const bottom = project({ x, y: ROOM.floorY }, shelf.reach ?? 1.05)
              const topPoint = project({ x, y: shelf.y + shelf.thickness }, shelf.reach ?? 1.05)
              const w = round1(11 * (shelf.reach ?? 1))
              return (
                <g key={"leg-" + x}>
                  <rect x={round1(topPoint.x - w / 2)} y={round1(topPoint.y)} width={w} height={round1(bottom.y - topPoint.y)} fill={COLORS.wood} />
                  <rect x={round1(topPoint.x + w * 0.18)} y={round1(topPoint.y)} width={round1(w * 0.32)} height={round1(bottom.y - topPoint.y)} fill={COLORS.woodDark} fillOpacity="0.55" />
                </g>
              )
            })}
            {!shelf.legs && brackets.map((bracket) => <Bracket key={bracket.key} wall={bracket.wall} board={bracket.board} width={bracket.width} />)}
            <polygon points={pointsText(top)} fill={COLORS.woodLight} />
            <polygon points={pointsText(front)} fill={COLORS.wood} />
            <polygon
              points={pointsText([front[0], front[1], { x: front[1].x, y: front[1].y + 2.5 }, { x: front[0].x, y: front[0].y + 2.5 }])}
              fill={COLORS.woodDark}
              fillOpacity="0.5"
            />
          </g>
        )
      })}
    </g>
  )
}
