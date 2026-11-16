import type { Metadata } from "next"
import { M_PLUS_Rounded_1c } from "next/font/google"
import { Providers } from "./providers"
import { ThemeScript } from "./ThemeScript"
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={mplus.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
