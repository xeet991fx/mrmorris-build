"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/shared/theme-toggle"

const navLinks = [
  { href: "#problem", label: "The Trap" },
  { href: "#capabilities", label: "Capabilities" },
  // LEGACY AGENT BUILDER - ARCHIVED 2026-02-04 - Uncomment to restore
  // { href: "#workflow", label: "Agent Builder" },
  { href: "#target", label: "Solutions" },
]

export function Navbar() {
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    router.prefetch("/login")
    router.prefetch("/register")
  }, [router])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const targetId = href.replace("#", "")
    const element = document.getElementById(targetId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
    setIsMobileMenuOpen(false)
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 z-[100] w-full transition-all duration-500 ${
        isScrolled
          ? "border-b border-border/20 bg-background/95 shadow-lg shadow-black/5 dark:shadow-black/20 backdrop-blur-xl dark:border-white/10 dark:bg-black/95"
          : "border-b border-border/30 bg-background/90 dark:bg-black/80 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2 sm:gap-3">
            <motion.div
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
              className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center"
            >
              <Image
                src="/Clianta-logo-removebg-preview.png"
                alt="Clianta Logo"
                width={40}
                height={40}
                className="object-contain w-8 h-8 sm:w-10 sm:h-10"
              />
            </motion.div>
            <span className="font-display text-lg sm:text-xl lg:text-2xl font-bold tracking-tight transition-colors duration-500 text-foreground dark:text-white">
              Clianta
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-6 lg:gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="relative cursor-pointer text-xs font-medium tracking-wide transition-colors text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:bg-accent-green after:transition-all after:duration-300 hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            <ThemeToggle />
            <Button
              asChild
              className="hidden px-4 lg:px-6 py-2 text-[10px] font-semibold uppercase tracking-wider shadow-md transition-all hover:shadow-lg md:flex bg-foreground text-background hover:bg-accent-green hover:text-black"
            >
              <Link href="/register">Get Early Access</Link>
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-border/50 bg-background/50 transition-all hover:bg-muted md:hidden dark:border-white/10 dark:bg-white/5"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-border/30 dark:border-white/10 bg-background dark:bg-black/95 py-4 sm:py-6 md:hidden"
            >
              <div className="flex flex-col space-y-1">
                {navLinks.map((link, index) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="cursor-pointer px-2 py-3 text-sm font-medium text-muted-foreground transition-all hover:text-foreground hover:bg-muted/50 rounded-lg dark:text-white/70 dark:hover:text-white dark:hover:bg-white/5"
                  >
                    {link.label}
                  </motion.a>
                ))}
                <div className="pt-4 px-2">
                  <Button
                    asChild
                    className="w-full bg-accent-green text-sm font-semibold text-black hover:bg-accent-green/90"
                  >
                    <Link href="/register">Get Early Access</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  )
}
