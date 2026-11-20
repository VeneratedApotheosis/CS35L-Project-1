import { BOARD, type Shelf } from "./geometry"

/**
 * One board: a shadow on the wall, two brackets, the front face with a little grain, and the
 * lighter top face. The colours come from the `.wall__*` classes in login.css.
 */
export function ShelfBoard({ shelf, bracketInset }: {
  shelf: Shelf
  /** How far the brackets are from the ends of the board. Without it they are 14% of the length in, as on the login wall. */
  bracketInset?: number
}) {
  const { y, from, to } = shelf
  const length = to - from
  const [leftBracket, rightBracket] = bracketInset === undefined
    ? [from + length * 0.14, to - length * 0.14]
    : [from + bracketInset, to - bracketInset]
  const bracket = (x: number) => (
    <path
      key={x}
      className="wall__bracket"
      d={"M" + (x - 8) + " " + (y + BOARD.front) + "h16v46a8 8 0 0 1-8 8a8 8 0 0 1-8-8Z"}
    />
  )
  return (
    <g data-shelf="">
      <rect className="wall__shadow" x={from + 8} y={y + BOARD.front - 2} width={length} height={26} rx={13} />
      {bracket(leftBracket)}
      {bracket(rightBracket)}
      <rect className="wall__board-top" x={from + 6} y={y - BOARD.top} width={length - 12} height={BOARD.top + 4} rx={4} />
      <rect className="wall__board" x={from} y={y} width={length} height={BOARD.front} rx={6} />
      <path
        className="wall__grain"
        d={
          "M" + (from + length * 0.08) + " " + (y + 7) + "h" + length * 0.3 +
          "M" + (from + length * 0.52) + " " + (y + 7) + "h" + length * 0.22 +
          "M" + (from + length * 0.22) + " " + (y + 14) + "h" + length * 0.4 +
          "M" + (from + length * 0.7) + " " + (y + 14) + "h" + length * 0.18
        }
      />
    </g>
  )
}
