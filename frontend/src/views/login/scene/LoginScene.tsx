import { CANVAS } from "./geometry"
import { Floor } from "./layers/Floor"
import { Greenhouse } from "./layers/Greenhouse"
import { Outside } from "./layers/Outside"
import { Shelves } from "./layers/Shelves"
import { ScenePlants } from "./ScenePlants"
import { Sunlight } from "./layers/Sunlight"

/**
 * The greenhouse behind the login screen: one SVG that fills its parent like a
 * background image. It is anchored to the bottom left and cropped from the top
 * and right on other shapes of screen, so the left side (where the text sits)
 * always lines up. The plants come from plants.ts and are drawn between the room and the sun.
 */
export function LoginScene() {
  return (
    <svg
      className="login__scene"
      viewBox={"0 0 " + CANVAS.width + " " + CANVAS.height}
      preserveAspectRatio="xMinYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <Outside />
      <Floor />
      <Greenhouse />
      <Shelves />
      <ScenePlants />
      <Sunlight />
    </svg>
  )
}
