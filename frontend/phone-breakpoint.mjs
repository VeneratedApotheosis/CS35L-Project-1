import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// CSS custom properties cannot be used in media/container conditions. Expand
// these named conditions during PostCSS processing using the same JSON as JS.
const { phoneRem } = JSON.parse(
  readFileSync(resolve(process.cwd(), "src/styles/breakpoints.json"), "utf8"),
);

export default function phoneBreakpointPlugin() {
  return {
    postcssPlugin: "habit-garden-phone-breakpoint",
    Once(root, { postcss }) {
      root.append(
        postcss.atRule({
          name: "custom-media",
          params: `--phone (width < ${phoneRem}rem)`,
        }),
      );
      root.append(
        postcss.atRule({
          name: "custom-media",
          params: `--not-phone (min-width: ${phoneRem}rem)`,
        }),
      );
    },
    OnceExit(root) {
      root.walkAtRules("custom-media", (rule) => {
        if (/^--(?:not-)?phone\b/.test(rule.params)) rule.remove();
      });
      root.walkAtRules(/^(media|container)$/, (rule) => {
        rule.params = rule.params
          .replaceAll("(--phone)", `(width < ${phoneRem}rem)`)
          .replaceAll("(--not-phone)", `(min-width: ${phoneRem}rem)`);
      });
    },
  };
}

phoneBreakpointPlugin.postcss = true;
