import { readFileSync } from "node:fs";
import postcss from "postcss";
import { describe, expect, it } from "vitest";

describe("Habit details phone card layout", () => {
  it("preserves card layouts, phone padding, and the member row", () => {
    const css = postcss.parse(readFileSync("src/styles/components/habit-page.css", "utf8"));
    for (const selector of [".habit-period", ".habit-calendar", ".habit-overall"]) {
      const base: string[] = [];
      const phone: Record<string, string> = {};
      css.walkRules((rule) => {
        if (!rule.selectors.includes(selector)) return;
        if (rule.parent?.type === "root") rule.walkDecls("display", (decl) => { base.push(decl.value); });
        if (rule.parent?.type === "atrule" && rule.parent.name === "media" && rule.parent.params === "(--phone)") {
          rule.walkDecls((decl) => { phone[decl.prop] = decl.value; });
        }
      });
      expect(base).toContain(selector === ".habit-period" ? "flex" : "grid");
      expect(phone["--card-pad"]).toBe("1.25rem");
      if (selector === ".habit-calendar" && phone.display !== undefined) {
        expect(phone.display).toBe("grid");
        expect(phone["grid-template-columns"]).toBe("minmax(0, 1fr)");
      } else {
        expect(phone.display).toBeUndefined();
      }
      expect(phone["align-items"]).toBeUndefined();
      expect(phone["justify-content"]).toBeUndefined();
    }
    let memberDisplay: string | undefined;
    css.walkRules(".habit-overall__members", (rule) => {
      if (rule.parent?.type === "root") rule.walkDecls("display", (decl) => { memberDisplay = decl.value; });
    });
    expect(memberDisplay).toBe("flex");
  });
});
