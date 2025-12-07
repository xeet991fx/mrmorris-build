"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/shared/theme-toggle"

export function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/Clianta-logo.jpg"
              alt="MrMorris Logo"
              width={56}
              height={56}
              className="object-contain"
            />
            <span className="font-heading text-2xl font-bold bg-gradient-to-r from-[#9ACD32] via-[#8AB82E] to-[#7BA628] bg-clip-text text-transparent">
              MrMorris
            </span>
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
