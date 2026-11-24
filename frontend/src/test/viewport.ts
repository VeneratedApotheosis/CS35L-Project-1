/** A small matchMedia simulation for jsdom; it does not calculate CSS layout. */
export type TestViewport = {
  width: number;
  height?: number;
  pointer?: "coarse" | "fine" | "none";
  hover?: "hover" | "none";
  colorScheme?: "light" | "dark";
  reducedMotion?: "reduce" | "no-preference";
};

type Settings = Required<TestViewport>;
type Saved = {
  width?: PropertyDescriptor;
  height?: PropertyDescriptor;
  matchMedia?: PropertyDescriptor;
};
let saved: Saved | undefined;
let settings: Settings;
const queries = new Set<TestMediaQueryList>();

function matches(query: string, viewport: Settings): boolean {
  return query
    .split(",")
    .map((part) => {
      const clauses = part.trim().split(/\s+and\s+/i);
      return clauses
        .map((clause, index) => {
          const value = clause.trim().toLowerCase();
          if (value === "all" || value === "screen") {
            if (index !== 0)
              throw new Error(`Unsupported test media query: ${clause}`);
            return true;
          }
          const width = value.match(
            /^\((min-|max-)?width\s*:\s*(\d+(?:\.\d+)?)\s*(px|rem|em)\)$/,
          );
          if (width) {
            const pixels = Number(width[2]) * (width[3] === "px" ? 1 : 16);
            if (width[1] === "min-") return viewport.width >= pixels;
            if (width[1] === "max-") return viewport.width <= pixels;
            return viewport.width === pixels;
          }
          const range = value.match(
            /^\(width\s*(<=|<|>=|>)\s*(\d+(?:\.\d+)?)\s*(px|rem|em)\)$/,
          );
          if (range) {
            const pixels = Number(range[2]) * (range[3] === "px" ? 1 : 16);
            if (range[1] === "<") return viewport.width < pixels;
            if (range[1] === "<=") return viewport.width <= pixels;
            if (range[1] === ">") return viewport.width > pixels;
            return viewport.width >= pixels;
          }
          const feature = value.match(
            /^\((hover|pointer|prefers-color-scheme|prefers-reduced-motion)\s*:\s*([\w-]+)\)$/,
          );
          if (feature) {
            const actual = {
              hover: viewport.hover,
              pointer: viewport.pointer,
              "prefers-color-scheme": viewport.colorScheme,
              "prefers-reduced-motion": viewport.reducedMotion,
            }[feature[1]];
            const allowed: Record<string, string[]> = {
              hover: ["hover", "none"],
              pointer: ["coarse", "fine", "none"],
              "prefers-color-scheme": ["light", "dark"],
              "prefers-reduced-motion": ["reduce", "no-preference"],
            };
            if (!allowed[feature[1]].includes(feature[2]))
              throw new Error(`Unsupported test media query: ${clause}`);
            return actual === feature[2];
          }
          throw new Error(`Unsupported test media query: ${clause}`);
        })
        .every(Boolean);
    })
    .some(Boolean);
}

class TestMediaQueryList extends EventTarget implements MediaQueryList {
  onchange:
    ((this: MediaQueryList, ev: MediaQueryListEvent) => unknown) | null = null;
  private lastMatch: boolean;
  constructor(readonly media: string) {
    super();
    this.lastMatch = matches(media, settings);
  }
  get matches() {
    return this.lastMatch;
  }
  addListener(
    listener: (this: MediaQueryList, ev: MediaQueryListEvent) => unknown,
  ) {
    this.addEventListener("change", listener as EventListener);
  }
  removeListener(
    listener: (this: MediaQueryList, ev: MediaQueryListEvent) => unknown,
  ) {
    this.removeEventListener("change", listener as EventListener);
  }
  update() {
    const next = matches(this.media, settings);
    if (next === this.lastMatch) return;
    this.lastMatch = next;
    const event = new Event("change") as MediaQueryListEvent;
    Object.defineProperties(event, {
      matches: { value: next },
      media: { value: this.media },
    });
    this.dispatchEvent(event);
    this.onchange?.call(this, event);
  }
}

/** Install or change a viewport. Call inside React's act() if a component is mounted. */
export function setTestViewport(options: TestViewport): void {
  if (
    !Number.isFinite(options.width) ||
    options.width <= 0 ||
    (options.height !== undefined &&
      (!Number.isFinite(options.height) || options.height <= 0))
  ) {
    throw new RangeError("Viewport dimensions must be positive finite numbers");
  }
  if (!saved) {
    saved = {
      width: Object.getOwnPropertyDescriptor(window, "innerWidth"),
      height: Object.getOwnPropertyDescriptor(window, "innerHeight"),
      matchMedia: Object.getOwnPropertyDescriptor(window, "matchMedia"),
    };
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) => {
        const list = new TestMediaQueryList(query);
        queries.add(list);
        return list;
      },
    });
  }
  settings = {
    width: options.width,
    height: options.height ?? 800,
    pointer: options.pointer ?? "fine",
    hover: options.hover ?? "hover",
    colorScheme: options.colorScheme ?? "light",
    reducedMotion: options.reducedMotion ?? "no-preference",
  };
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: settings.width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    writable: true,
    value: settings.height,
  });
  for (const query of queries) query.update();
  window.dispatchEvent(new Event("resize"));
}

/** Restore the exact original window properties and discard registered queries. */
export function resetTestViewport(): void {
  if (!saved) return;
  for (const [key, descriptor] of [
    ["innerWidth", saved.width],
    ["innerHeight", saved.height],
    ["matchMedia", saved.matchMedia],
  ] as const) {
    if (descriptor) Object.defineProperty(window, key, descriptor);
    else Reflect.deleteProperty(window, key);
  }
  queries.clear();
  saved = undefined;
}
