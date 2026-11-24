// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resetTestViewport, setTestViewport } from "@/test/viewport";
import { ShelfWall } from "./ShelfWall";

afterEach(() => {
  cleanup();
  resetTestViewport();
});

describe("responsive login wall", () => {
  it.each([
    [360, 4, "coarse", "none"],
    [390, 4, "coarse", "none"],
    [430, 4, "coarse", "none"],
    [1280, 8, "fine", "hover"],
  ] as const)(
    "shows the appropriate number of plants at %ipx",
    (width, expected, pointer, hover) => {
      setTestViewport({
        width,
        pointer,
        hover,
      });
      const { container } = render(<ShelfWall />);
      expect(container.querySelectorAll("[data-plant]")).toHaveLength(expected);
    },
  );
});
