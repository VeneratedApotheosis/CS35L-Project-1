import Link from "next/link"
import { ChartNoAxesCombined, Flower2, Leaf, Plus, Settings, Sprout } from "lucide-react"
import { Icon } from "./Icon"

const destinations = [
  { label: "My Garden", href: "/", icon: Sprout, available: true },
  { label: "Dashboard", href: "/dashboard", icon: ChartNoAxesCombined, available: false },
  { label: "Badges", href: "/badges", icon: Flower2, available: false },
  { label: "Settings", href: "/settings", icon: Settings, available: false },
] as const

export function NavBar({ currentPath, preview = false }: {
  currentPath: string
  /** Keep the bar inside its style-guide frame, including on small screens. */
  preview?: boolean
}) {
  const creating = currentPath === "/create" || currentPath.startsWith("/create/")

  return (
    <div className={preview ? "navbar navbar--preview" : "navbar"}>
      <nav className="navbar__bar" aria-label={preview ? "Navigation preview" : "Main navigation"}>
        <div className="navbar__inner">
          <Link href="/" className="navbar__brand">
            <Icon icon={Leaf} tone="brand" />
            <span>Habit Garden</span>
          </Link>
          <ul className="navbar__links">
            {destinations.map(({ label, href, icon, available }) => (
              <li key={href} className="navbar__item">
                {available ? (
                  <Link className="navbar__link" href={href} aria-label={label}
                    aria-current={currentPath === href ? "page" : undefined}>
                    <Icon icon={icon} size="sm" />
                    {href === "/" ? (
                      <>
                        <span className="navbar__label--wide">My Garden</span>
                        <span className="navbar__label--compact">Garden</span>
                      </>
                    ) : <span>{label}</span>}
                  </Link>
                ) : (
                  <span className="navbar__link navbar__link--disabled" aria-disabled="true"
                    title={`${label} is not available yet`}>
                    <Icon icon={icon} size="sm" />
                    <span>{label}<span className="sr-only"> (not available yet)</span></span>
                  </span>
                )}
              </li>
            ))}
            <li className="navbar__item">
              <Link href="/create" className="button button--primary button--md navbar__add"
                aria-label="Add Habit"
                aria-current={creating ? "page" : undefined}>
                <Icon icon={Plus} size="sm" />
                <span className="navbar__label--wide">Add Habit</span>
                <span className="navbar__label--compact">Add</span>
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  )
}
