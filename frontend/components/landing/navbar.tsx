"use client"

import { useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/shared/theme-toggle"

export function Navbar() {
  const router = useRouter()

  // Prefetch login page for instant navigation
  useEffect(() => {
    router.prefetch("/login")
    router.prefetch("/register")
  }, [router])
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center">
            <Image
              src="/Clianta-text-logo-removebg-preview.png"
              alt="Clianta Logo"
              width={120}
              height={48}
              className="object-contain"
            />
          </Link>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            href="#benefits"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Benefits
          </Link>
          <Link
            href="#faq"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            FAQ
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Button asChild size="lg" className="hidden md:flex">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild size="default" className="md:hidden">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
