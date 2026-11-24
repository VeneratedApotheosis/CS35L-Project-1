// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/styles/ThemeProvider";
import { AppearanceSection } from "./AppearanceSection";
import { resetTestViewport, setTestViewport } from "@/test/viewport";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  setTestViewport({ width: 360, pointer: "coarse", hover: "none" });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  vi.restoreAllMocks();
  resetTestViewport();
});

const showAppearance = () =>
  render(
    <ThemeProvider>
      <AppearanceSection />
    </ThemeProvider>,
  );
const buttons = () => {
  const group = screen.getByRole("group", { name: "Color theme" });
  return {
    light: within(group).getByRole("button", { name: "Light" }),
    dark: within(group).getByRole("button", { name: "Dark" }),
  };
};

describe("Appearance settings", () => {
  it("switches immediately, exposes the selected mode, and restores it on remount", async () => {
    const view = showAppearance();
    expect(screen.getByRole("heading", { name: "Appearance" })).toBeTruthy();
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("light"),
    );
    expect(buttons().light.getAttribute("aria-pressed")).toBe("true");
    expect(buttons().dark.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(buttons().dark);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("app-theme")).toBe("dark");
    expect(buttons().dark.getAttribute("aria-pressed")).toBe("true");
    expect(buttons().light.getAttribute("aria-pressed")).toBe("false");
    view.unmount();
    showAppearance();
    await waitFor(() =>
      expect(buttons().dark.getAttribute("aria-pressed")).toBe("true"),
    );
    fireEvent.click(buttons().light);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("app-theme")).toBe("light");
  });

  it("uses the system preference without a saved choice", async () => {
    setTestViewport({
      width: 360,
      pointer: "coarse",
      hover: "none",
      colorScheme: "dark",
    });
    vi.spyOn(window, "matchMedia");
    showAppearance();
    await waitFor(() =>
      expect(buttons().dark.getAttribute("aria-pressed")).toBe("true"),
    );
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-color-scheme: dark)",
    );
  });

  it("honors a saved choice over the system preference", async () => {
    localStorage.setItem("app-theme", "light");
    setTestViewport({ width: 1280, colorScheme: "dark" });
    vi.spyOn(window, "matchMedia");
    showAppearance();
    await waitFor(() =>
      expect(document.documentElement.dataset.theme).toBe("light"),
    );
    expect(buttons().light.getAttribute("aria-pressed")).toBe("true");
    expect(window.matchMedia).not.toHaveBeenCalled();
  });
});
