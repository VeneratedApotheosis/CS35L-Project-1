import Link from "next/link"

const tabs = [
  { label: "Badges", href: "/badges" },
  { label: "History", href: "/history" },
] as const

/**
 * Switches between Badges and History. Each is a real page with its own URL,
 * so these are links marked with aria-current, not ARIA tabs.
 */
export function LookBackTabs({ current }: { current: "/badges" | "/history" }) {
  return (
    <nav aria-label="Badges and history" className="look-back-tabs">
      {tabs.map(({ label, href }) => (
        <Link key={href} href={href} className="look-back-tabs__link" aria-current={href === current ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  )
}
