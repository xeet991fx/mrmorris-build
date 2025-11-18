import type { Metadata } from "next"
import { Inter, Poppins } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
})

export const metadata: Metadata = {
  title: "MrMorris - Autonomous Marketing Copilot for Agencies",
  description: "Your AI Marketing Team That Never Sleeps. Multi-agent autonomous marketing system that manages campaigns, optimizes performance, and drives results 24/7.",
  keywords: ["AI marketing", "marketing automation", "marketing copilot", "autonomous marketing", "marketing agencies", "AI agents", "campaign optimization"],
  authors: [{ name: "MrMorris" }],
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: "MrMorris - Autonomous Marketing Copilot for Agencies",
    description: "Your AI Marketing Team That Never Sleeps. Multi-agent autonomous marketing system for agencies.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MrMorris - Autonomous Marketing Copilot",
    description: "Your AI Marketing Team That Never Sleeps",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${poppins.variable} font-body`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
