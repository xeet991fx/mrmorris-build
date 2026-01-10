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
  metadataBase: new URL('https://clianta.online'),
  title: "Clianta - AI-Native CRM That Builds Itself",
  description: "Describe how you sell. Clianta builds personalized workflows and automations in minutes. No configuration. No consultants. Just results.",
  keywords: [
    "AI CRM",
    "AI-native CRM",
    "automated CRM",
    "CRM automation",
    "autonomous CRM",
    "full AI CRM",
    "AI workflows",
    "sales automation",
    "AI sales assistant",
    "zero-config CRM",
    "CRM",
    "customer relationship management",
    "AI customer management",
    "intelligent CRM",
    "self-building CRM",
    "AI-powered sales",
    "autonomous sales platform",
    "AI business automation",
    "smart CRM",
    "AI agent CRM",
    "no-code CRM",
    "automatic workflow builder",
    "AI for sales teams",
    "autonomous marketing",
    "AI lead management",
    "conversational CRM"
  ],
  authors: [{ name: "Clianta" }],
  creator: "Clianta",
  publisher: "Clianta",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/Clianta-logo-removebg-preview.png', type: 'image/png' },
    ],
    apple: '/Clianta-logo-removebg-preview.png',
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://clianta.online",
    siteName: "Clianta",
    title: "Clianta - AI-Native CRM That Builds Itself",
    description: "Describe how you sell. Clianta builds personalized workflows and automations in minutes. No configuration. No consultants. Just results.",
    images: [
      {
        url: '/Clianta-logo.jpg',
        width: 1200,
        height: 630,
        alt: 'Clianta - AI-Native CRM',
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Clianta - Your CRM, Built by AI",
    description: "CRM that builds itself. Describe your sales process and get instant workflows and automations.",
    images: ['/Clianta-logo.jpg'],
  },
  alternates: {
    canonical: 'https://clianta.online',
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
