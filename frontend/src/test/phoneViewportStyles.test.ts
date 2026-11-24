// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import postcss from "postcss";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  M_PLUS_Rounded_1c: () => ({ variable: "test-font" }),
}));
vi.mock("../app/providers", () => ({ Providers: () => null }));
vi.mock("../app/ThemeScript", () => ({ ThemeScript: () => null }));
import { viewport } from "../app/layout";
import breakpoints from "@/styles/breakpoints.json";
import { resetTestViewport, setTestViewport } from "./viewport";
afterEach(resetTestViewport);
const style = (file: string) =>
  postcss.parse(readFileSync(`src/styles/${file}.css`, "utf8"));
const declarations = (root: postcss.Root, selector: string, media?: string) => {
  const found: Record<string, string> = {};
  root.walkRules(selector, (rule) => {
    const parentMedia =
      rule.parent?.type === "atrule" ? rule.parent.params : undefined;
    if (parentMedia !== media) return;
    rule.walkDecls((decl) => {
      found[decl.prop] = decl.value;
    });
  });
  return found;
};
describe("phone viewport and safe areas", () => {
  it("declares one framework viewport with cover and device width", () => {
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    expect(layout.match(/export const viewport\s*:/g)).toHaveLength(1);
    expect(viewport).toEqual({
      width: "device-width",
      initialScale: 1,
      viewportFit: "cover",
    });
    expect(layout).not.toMatch(/<meta\s+name=["']viewport/);
  });
  it("keeps desktop body and shell sizing, and applies dynamic height on phones", () => {
    for (const [file, selector] of [
      ["globalStyles", "body"],
      ["components/navigation", ".app-shell"],
    ]) {
      const css = style(file);
      expect(declarations(css, selector)["min-height"]).toBe("100vh");
      expect(declarations(css, selector, "(--phone)")["min-height"]).toBe(
        "100dvh",
      );
    }
    const values: string[] = [];
    style("components/login").walkRules(".login", (rule) => {
      if (rule.parent?.type === "root")
        rule.walkDecls("min-height", (decl) => {
          values.push(decl.value);
        });
    });
    expect(values).toEqual(["100vh", "100dvh"]);
  });
  it("reserves the bottom inset and applies top and sides in the phone rule", () => {
    const css = style("components/navigation");
    expect(declarations(css, ".app-shell")["padding-bottom"]).toBe(
      "calc(var(--mobile-nav-height) + env(safe-area-inset-bottom, 0px))",
    );
    expect(
      declarations(css, ".app-shell", "(--not-phone)")["padding-bottom"],
    ).toBe("0");
    expect(declarations(css, ".navbar__bar")["padding"]).toBe(
      "var(--space-2) var(--space-2) calc(var(--space-2) + env(safe-area-inset-bottom, 0px))",
    );
    const phone = declarations(css, ".app-shell__content", "(--phone)");
    for (const side of ["top", "left", "right"])
      expect(phone[`padding-${side}`]).toContain(
        `env(safe-area-inset-${side}, 0px)`,
      );
    const nav = declarations(css, ".navbar__bar", "(--phone)");
    for (const side of ["left", "right"])
      expect(nav[`padding-${side}`]).toContain(
        `env(safe-area-inset-${side}, 0px)`,
      );
    expect(
      declarations(css, ".app-shell__content")["padding-top"],
    ).toBeUndefined();
    for (const variant of [
      ".app-shell--wide .app-shell__content",
      ".app-shell--full .app-shell__content",
    ]) {
      const top = declarations(css, variant, "(--phone)")["padding-top"];
      expect(top.match(/safe-area-inset-top/g)).toHaveLength(1);
    }
  });
  it("uses the existing phone boundary independently of pointer capability", () => {
    setTestViewport({
      width: breakpoints.phoneRem * 16 - 1,
      pointer: "coarse",
      hover: "none",
    });
    expect(matchMedia(`(width < ${breakpoints.phoneRem}rem)`).matches).toBe(
      true,
    );
    setTestViewport({
      width: breakpoints.phoneRem * 16,
      pointer: "coarse",
      hover: "none",
    });
    expect(matchMedia(`(width < ${breakpoints.phoneRem}rem)`).matches).toBe(
      false,
    );
    expect(matchMedia("(pointer: coarse)").matches).toBe(true);
  });
  it("keeps login controls clear of all safe-area sides on phones", () => {
    const css = style("components/login");
    const brand = declarations(css, ".login__brand", "(--phone)");
    const content = declarations(css, ".login__content", "(--phone)");
    expect(brand["padding-top"]).toContain("env(safe-area-inset-top, 0px)");
    for (const side of ["left", "right"]) {
      expect(brand[`padding-${side}`]).toContain(
        `env(safe-area-inset-${side}, 0px)`,
      );
      expect(content[`padding-${side}`]).toContain(
        `env(safe-area-inset-${side}, 0px)`,
      );
    }
    expect(content["padding-bottom"]).toContain(
      "env(safe-area-inset-bottom, 0px)",
    );
  });
});
