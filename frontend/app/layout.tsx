import type { Metadata } from "next"
import { Hanken_Grotesk } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "sonner"

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-hanken",
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
      <body className={`${hankenGrotesk.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          {children}
          <Toaster position="bottom-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
