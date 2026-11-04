import type { Metadata } from "next"
import { M_PLUS_Rounded_1c } from "next/font/google"
import { Providers } from "./providers"
import "@/styles/globalStyles.css"

const mplus = M_PLUS_Rounded_1c({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-mplus",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Habit Garden",
  description: "A habit tracker where every habit is a plant.",
  icons: { icon: "/favicon.svg" },
}

// Applies the saved theme before first paint to avoid a light-mode flash.
const themeScript = `try{var t=localStorage.getItem("app-theme")||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=t}catch(e){}`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={mplus.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
