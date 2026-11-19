/**
 * Prefix for every path when the site is served from a sub-path, as on GitHub
 * Pages (`/CS35L-Project-1`). Empty in local dev. It is set in
 * `NEXT_PUBLIC_BASE_PATH` and read in `next.config.ts` too. Next adds it to
 * `<Link>` and the router by itself, but not to plain URLs such as
 * `window.location.origin` or the favicon.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

/**
 * Habit details page. The id is in the query string, not the path, because a
 * static export cannot serve `/habits/<id>` for ids it never saw at build time.
 */
export function habitHref(id: string): string {
  return `/habit?id=${encodeURIComponent(id)}`
}

/** Query-string invite codes work with the static GitHub Pages export too. */
export function sharedInviteUrl(origin: string, code: string): string {
  return `${origin}${BASE_PATH}/join?code=${encodeURIComponent(code)}`
}
