// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { resetTestViewport, setTestViewport } from "./viewport";

const originalWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
const originalHeight = Object.getOwnPropertyDescriptor(window, "innerHeight");
const originalMatchMedia = Object.getOwnPropertyDescriptor(
  window,
  "matchMedia",
);
afterEach(() => {
  resetTestViewport();
  vi.restoreAllMocks();
});

describe("test viewport", () => {
  it.each([360, 390, 430, 1280])(
    "sets width %i and evaluates supported features",
    (width) => {
      setTestViewport({
        width,
        height: 900,
        pointer: "coarse",
        hover: "none",
        colorScheme: "dark",
        reducedMotion: "reduce",
      });
      expect(window.innerWidth).toBe(width);
      expect(window.innerHeight).toBe(900);
      expect(matchMedia(`(width: ${width}px)`).matches).toBe(true);
      expect(matchMedia("(hover: none) and (pointer: coarse)").matches).toBe(
        true,
      );
      expect(matchMedia("(prefers-color-scheme: dark)").matches).toBe(true);
      expect(matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);
    },
  );
  it("treats min and max boundaries inclusively, including rem units and comma alternatives", () => {
    setTestViewport({ width: 640 });
    expect(matchMedia("screen and (min-width: 40rem)").matches).toBe(true);
    expect(matchMedia("(max-width: 640px)").matches).toBe(true);
    expect(matchMedia("(max-width: 639px), (min-width: 641px)").matches).toBe(
      false,
    );
    expect(matchMedia("(max-width: 639px), (min-width: 40rem)").matches).toBe(
      true,
    );
  });
  it("updates existing query lists, delivers change events only on transitions, and emits resize", () => {
    setTestViewport({ width: 360 });
    const query = matchMedia("(min-width: 40rem)");
    const modern = vi.fn(),
      legacy = vi.fn(),
      onchange = vi.fn(),
      resize = vi.fn();
    query.addEventListener("change", modern);
    query.addListener(legacy);
    query.onchange = onchange;
    window.addEventListener("resize", resize);
    setTestViewport({ width: 640 });
    expect(query.matches).toBe(true);
    expect(modern).toHaveBeenCalledTimes(1);
    expect(modern.mock.calls[0][0]).toMatchObject({
      matches: true,
      media: "(min-width: 40rem)",
    });
    expect(legacy).toHaveBeenCalledTimes(1);
    expect(onchange).toHaveBeenCalledTimes(1);
    expect(resize).toHaveBeenCalledTimes(1);
    query.removeListener(legacy);
    query.removeEventListener("change", modern);
    setTestViewport({ width: 700 });
    expect(modern).toHaveBeenCalledTimes(1);
    setTestViewport({ width: 360 });
    expect(modern).toHaveBeenCalledTimes(1);
    expect(onchange).toHaveBeenCalledTimes(2);
    expect(legacy).toHaveBeenCalledTimes(1);
    window.removeEventListener("resize", resize);
  });
  it("restores the original property descriptors when reset", () => {
    setTestViewport({ width: 430, height: 700 });
    resetTestViewport();
    expect(Object.getOwnPropertyDescriptor(window, "innerWidth")).toEqual(
      originalWidth,
    );
    expect(Object.getOwnPropertyDescriptor(window, "innerHeight")).toEqual(
      originalHeight,
    );
    expect(Object.getOwnPropertyDescriptor(window, "matchMedia")).toEqual(
      originalMatchMedia,
    );
    resetTestViewport();
  });
  it("does not update old query objects or listeners after reset", () => {
    setTestViewport({ width: 360 });
    const old = matchMedia("(min-width: 640px)");
    const listener = vi.fn();
    old.addEventListener("change", listener);
    resetTestViewport();
    setTestViewport({ width: 1280 });
    expect(old.matches).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    expect(matchMedia("(min-width: 640px)").matches).toBe(true);
  });
  it("starts each test without the previous test's viewport", () => {
    expect(Object.getOwnPropertyDescriptor(window, "innerWidth")).toEqual(
      originalWidth,
    );
    expect(Object.getOwnPropertyDescriptor(window, "matchMedia")).toEqual(
      originalMatchMedia,
    );
  });
  it("rejects invalid dimensions and unsupported queries rather than producing misleading matches", () => {
    expect(() => setTestViewport({ width: 0 })).toThrow(RangeError);
    setTestViewport({ width: 360 });
    expect(() => matchMedia("(orientation: portrait)")).toThrow(
      "Unsupported test media query",
    );
    expect(() => matchMedia("screen, (orientation: portrait)")).toThrow(
      "Unsupported test media query",
    );
    expect(() => matchMedia("(min-width: 1px) and screen")).toThrow(
      "Unsupported test media query",
    );
    expect(() => matchMedia("(pointer: magic)")).toThrow(
      "Unsupported test media query",
    );
  });
});
