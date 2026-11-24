# Frontend viewport tests

Use `setTestViewport` from `@/test/viewport` in a Vitest test running in jsdom.
Set the viewport before rendering, and call `resetTestViewport` in `afterEach`
so the original window properties are restored even when a test fails.

```tsx
// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, it } from "vitest";
import { resetTestViewport, setTestViewport } from "@/test/viewport";
import { Example } from "./Example";

afterEach(() => {
  cleanup();
  resetTestViewport();
});

it("works on a phone", () => {
  setTestViewport({ width: 360, pointer: "coarse", hover: "none" });
  render(<Example />);
  // Assert behavior and accessible content.
});

it("works on a laptop", () => {
  setTestViewport({ width: 1280, pointer: "fine", hover: "hover" });
  render(<Example />);
});
```

Use 390 and 430 as additional phone widths where relevant. `height` defaults to
800, `pointer` to `fine`, `hover` to `hover`, `colorScheme` to `light`, and
`reducedMotion` to `no-preference`; specify options as needed. Changing the
viewport again updates existing media-query lists, dispatches their `change`
events on a match transition, and dispatches a window `resize`. Wrap a change
made after rendering in React Testing Library's `act()` when it updates React
state. Remove your own window event listeners in test cleanup.

The helper supports `screen`/`all`, comma-separated alternatives, `and`,
`min-width`, `max-width`, and exact `width` in `px`, `rem` or `em` (using
16px for relative units), plus `hover`, `pointer`, `prefers-color-scheme` and
`prefers-reduced-motion`. Unsupported features throw rather than silently
returning a misleading result. It does not choose a phone breakpoint: tests
should use the actual query of the component under test.

jsdom does **not** perform real CSS layout or apply responsive styles based on
these mock dimensions. This helper tests JavaScript and accessible component
behavior that reads viewport or media-query state; check visual layout,
overflow, touch interaction, and actual device keyboards in a browser or on a
device separately.
