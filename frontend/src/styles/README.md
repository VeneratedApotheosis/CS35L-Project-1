# Figma Make design system

This is a React + Vite + TypeScript starter design system based on the supplied Figma Make CSS.

## Install

Copy the `styles/` folder into `src/styles/`, and copy `ThemeProvider.tsx` into `src/styles/ThemeProvider.tsx` (or adjust its import path).

Import the stylesheet once in `main.tsx`:

```tsx
import "./styles/globalStyles.css";
```

Wrap the app in `ThemeProvider` as shown in `main.tsx.example`.

## Theme usage

```tsx
import { useTheme } from "./styles/ThemeProvider";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return <button className="button button--secondary" onClick={toggleTheme}>
    Switch to {theme === "light" ? "dark" : "light"} mode
  </button>;
}
```

## Button usage

```tsx
<button className="button button--primary button--md">Save</button>
<button className="button button--secondary button--sm">Cancel</button>
<button className="button button--ghost">More</button>
<button className="button button--danger">Delete</button>
```

## Lucide usage

Install `lucide-react`:

```bash
npm install lucide-react
```

```tsx
import { Calendar } from "lucide-react";

<Calendar className="icon icon--md" aria-hidden="true" />
```

Lucide uses `currentColor` by default, so the icon inherits the surrounding text color.

## Source fidelity notes

- The palette, M PLUS Rounded 1c font, large rounded visual language, responsive spacing, and button variant colors are taken from the supplied Figma Make CSS.
- The source did not define a complete application dark-theme surface system. The dark semantic surfaces in `themes/dark.css` are sensible extensions of the supplied ink/oat/cream palette, not literal source values.
- Input and card styles are starter conventions inferred from the design language; the supplied CSS did not specify those components.
- The original Figma CSS used `--radius-large: 3.5rem` and `--radius-medium: 2rem` for its style-book showcase. This system reuses those as design tokens; individual controls use smaller radii where appropriate.
