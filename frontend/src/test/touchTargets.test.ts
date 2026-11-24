// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import postcss from "postcss";
import { afterEach, describe, expect, it } from "vitest";
import { resetTestViewport, setTestViewport } from "./viewport";
import breakpoint from "@/styles/breakpoints.json";

afterEach(resetTestViewport);
const read = (file: string) =>
  postcss.parse(readFileSync(`src/styles/${file}.css`, "utf8"));
function phoneRules(file: string, selector: string) {
  const result: Record<string, string> = {};
  read(file).walkAtRules("media", (media) => {
    if (media.params !== "(--phone)") return;
    media.walkRules((rule) => {
      if (rule.selectors.includes(selector))
        rule.walkDecls((decl) => {
          result[decl.prop] = decl.value;
        });
    });
  });
  return result;
}
describe("phone touch targets", () => {
  it("uses the shared 44px token for shared controls", () => {
    const spacing = read("tokens/spacing");
    let token = "";
    spacing.walkDecls("--touch-target", (decl) => {
      token = decl.value;
    });
    expect(token).toBe("2.75rem");
    for (const [file, selector] of [
      ["components/buttons", ".button"],
      ["components/inputs", ".input"],
      ["components/navigation", ".navbar__link"],
      ["components/navigation", ".navbar__add"],
    ]) {
      expect(phoneRules(file, selector)["min-width"]).toBe(
        "var(--touch-target)",
      );
    }
    expect(phoneRules("components/buttons", ".button")["min-height"]).toBe(
      "var(--touch-target)",
    );
    expect(
      phoneRules("components/habit-page", ".habit-period__actions .button")[
        "min-height"
      ],
    ).toBe("var(--touch-target)");
    expect(phoneRules("components/habit-page", ".habit-calendar__grid")["min-width"]).toBe("0");
    expect(phoneRules("components/habit-page", ".habit-calendar__grid td")["padding"]).toBe("calc(var(--space-1) / 2)");
    expect(
      phoneRules("components/forms", ".sharing-choice label")["min-height"],
    ).toBe("var(--touch-target)");
  });
  it("does not change the shared desktop small-button rule", () => {
    let small = "";
    read("components/buttons").walkRules(".button--sm", (rule) =>
      rule.walkDecls("min-height", (decl) => {
        small = decl.value;
      }),
    );
    expect(small).toBe("2.5rem");
    setTestViewport({ width: breakpoint.phoneRem * 16 });
    expect(matchMedia(`(width < ${breakpoint.phoneRem}rem)`).matches).toBe(
      false,
    );
  });
});
