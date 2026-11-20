"use client"

import { Button } from "@/components/Button"
import { Card } from "@/components/Card"
import { useTheme } from "@/styles/ThemeProvider"

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <section aria-labelledby="appearance-heading" className="stack-md">
      <h2 id="appearance-heading" className="text-h2">Appearance</h2>
      <Card>
        <div className="stack-sm">
          <p className="text-body text-secondary">Choose a theme for this browser.</p>
          <div role="group" aria-label="Color theme" className="flex flex-wrap gap-3">
            <Button variant="secondary" aria-pressed={theme === "light"} onClick={() => setTheme("light")}>
              {theme === "light" && <span aria-hidden="true">✓ </span>}Light
            </Button>
            <Button variant="secondary" aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}>
              {theme === "dark" && <span aria-hidden="true">✓ </span>}Dark
            </Button>
          </div>
        </div>
      </Card>
    </section>
  )
}
