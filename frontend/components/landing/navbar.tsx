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
  { href: "#workflow", label: "Agent Builder" },
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
          ? "border-b border-white/10 bg-black/95 shadow-lg shadow-black/20 backdrop-blur-2xl"
          : "border-b border-border/30 bg-white/80 dark:bg-black/80 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.3 }}
              className="flex h-10 w-10 items-center justify-center"
            >
              <Image
                src="/Clianta-logo-removebg-preview.png"
                alt="Clianta Logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </motion.div>
            <span className={`font-display text-2xl font-bold tracking-tight transition-colors duration-500 ${
              isScrolled ? "text-white" : "text-foreground dark:text-white"
            }`}>
              Clianta
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className={`relative cursor-pointer text-[11px] font-semibold uppercase tracking-wider transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-accent-green after:transition-all after:duration-300 hover:after:w-full ${
                  isScrolled
                    ? "text-white/70 hover:text-white"
                    : "text-muted-foreground hover:text-foreground dark:text-white/70 dark:hover:text-white"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-5">
            <ThemeToggle />
            <Button
              asChild
              className={`hidden px-5 py-2 text-[10px] font-bold uppercase tracking-widest shadow-md transition-all hover:shadow-lg md:flex ${
                isScrolled
                  ? "bg-accent-green text-black hover:bg-white"
                  : "bg-foreground text-background hover:bg-accent-green hover:text-black"
              }`}
            >
              <Link href="/register">Get Early Access</Link>
            </Button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`flex h-10 w-10 items-center justify-center transition-colors md:hidden ${
                isScrolled ? "text-white" : "text-foreground dark:text-white"
              }`}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
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
              className="overflow-hidden border-t border-white/10 bg-black py-6 md:hidden"
            >
              <div className="flex flex-col space-y-4">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="cursor-pointer text-xs font-bold uppercase tracking-widest text-white/70 transition-colors hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
                <Button
                  asChild
                  className="mt-4 w-full bg-accent-green text-xs font-bold uppercase tracking-widest text-black hover:bg-white"
                >
                  <Link href="/register">Get Early Access</Link>
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  )
}
