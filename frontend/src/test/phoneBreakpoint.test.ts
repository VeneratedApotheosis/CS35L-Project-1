// @vitest-environment jsdom
import { execFileSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import breakpoints from "@/styles/breakpoints.json";
import { STACKED_QUERY } from "@/views/login/wall/layouts";
import { resetTestViewport, setTestViewport } from "./viewport";

afterEach(resetTestViewport);

describe("shared phone boundary", () => {
  it.each([360, 390, 430, breakpoints.phoneRem * 16 - 1])(
    "uses phone behavior at %ipx",
    (width) => {
      setTestViewport({ width, pointer: "coarse", hover: "none" });
      expect(matchMedia(STACKED_QUERY).matches).toBe(true);
      expect(matchMedia("(hover: none), (pointer: coarse)").matches).toBe(true);
    },
  );
  it("switches at the boundary without changing pointer capability", () => {
    setTestViewport({
      width: breakpoints.phoneRem * 16,
      pointer: "coarse",
      hover: "none",
    });
    expect(matchMedia(STACKED_QUERY).matches).toBe(false);
    expect(matchMedia("(pointer: coarse)").matches).toBe(true);
    setTestViewport({ width: 1280, pointer: "fine", hover: "hover" });
    expect(matchMedia(STACKED_QUERY).matches).toBe(false);
    expect(matchMedia("(hover: hover)").matches).toBe(true);
  });
  it("preserves unrelated media conditions", () => {
    const script = `import postcss from 'postcss'; import plugin from './phone-breakpoint.mjs'; const input='@media (min-width: 44rem) and (prefers-reduced-motion: reduce) { .x { color: red } } @media (hover: none), (pointer: coarse) { .y { color: blue } }'; process.stdout.write((await postcss([plugin()]).process(input,{from:undefined})).css);`;
    const css = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      { encoding: "utf8" },
    );
    expect(css).toContain(
      "(min-width: 44rem) and (prefers-reduced-motion: reduce)",
    );
    expect(css).toContain("(hover: none), (pointer: coarse)");
    expect(css).not.toContain("@custom-media");
  });
  it("expands authored media and container conditions in the real PostCSS pipeline", () => {
    const script = `import postcss from 'postcss'; import { readFile } from 'node:fs/promises'; import tailwind from '@tailwindcss/postcss'; import phoneBreakpointPlugin from './phone-breakpoint.mjs'; const css = await readFile('src/styles/globalStyles.css', 'utf8'); const result = await postcss([phoneBreakpointPlugin(), tailwind()]).process(css, { from: 'src/styles/globalStyles.css' }); process.stdout.write(result.css);`;
    const css = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      { encoding: "utf8", maxBuffer: 10_000_000 },
    );
    expect(css).not.toMatch(/\(--(?:not-)?phone\)/);
    expect(css).toContain(`width < ${breakpoints.phoneRem}rem`);
    expect(css).toContain(`min-width: ${breakpoints.phoneRem}rem`);
    expect(css).toContain("(hover: none)");
    expect(css).toContain("prefers-reduced-motion");
    const optimized = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      {
        encoding: "utf8",
        maxBuffer: 10_000_000,
        env: { ...process.env, NODE_ENV: "production" },
      },
    );
    expect(optimized).not.toMatch(
      /\(--(?:not-)?phone\)|@custom-media\s+--(?:not-)?phone/,
    );
    expect(optimized).toMatch(
      new RegExp(
        `@container\\s+navigation\\s*\\(min-width:\\s*${breakpoints.phoneRem}rem\\)`,
      ),
    );
  });
});
