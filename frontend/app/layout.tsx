import type { Metadata } from "next"
import { Outfit, Plus_Jakarta_Sans } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "sonner"

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Clianta - AI-Native CRM That Builds Itself",
  description: "Describe how you sell. Clianta builds personalized workflows and automations in minutes. No configuration. No consultants. Just results.",
  keywords: ["AI CRM", "AI-native CRM", "automated CRM", "CRM automation", "AI workflows", "sales automation", "AI sales assistant", "zero-config CRM"],
  authors: [{ name: "Clianta" }],
  icons: {
    icon: [
      { url: '/Clianta-logo-removebg-preview.png', type: 'image/png' },
    ],
    apple: '/Clianta-logo-removebg-preview.png',
  },
  openGraph: {
    title: "Clianta - AI-Native CRM That Builds Itself",
    description: "Describe how you sell. Clianta builds personalized workflows and automations in minutes. No configuration. No consultants. Just results.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Clianta - Your CRM, Built by AI",
    description: "CRM that builds itself. Describe your sales process and get instant workflows and automations.",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.variable} ${jakarta.variable} font-sans antialiased font-light`} suppressHydrationWarning>
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
