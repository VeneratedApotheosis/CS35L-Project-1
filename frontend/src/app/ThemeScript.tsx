"use client"

// Applies the saved theme before first paint to avoid a light-mode flash.
const themeScript = `try{var t=localStorage.getItem("app-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t}catch(e){}`

/**
 * The script only needs to be in the server-rendered HTML, where it runs once
 * while the page loads. React warns when it creates a <script> element on the
 * client (it would never run), so the client renders nothing and leaves the
 * server's copy alone.
 */
export function ThemeScript() {
  if (typeof window !== "undefined") return null
  return <script suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
}
