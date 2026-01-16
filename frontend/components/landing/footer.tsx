"use client"

import Link from "next/link"
import Image from "next/image"

const footerLinks = {
  system: [
    { label: "Platform", href: "#" },
    { label: "Security", href: "#" },
    { label: "Enterprise", href: "#" },
  ],
  social: [
    { label: "Twitter", href: "#" },
    { label: "LinkedIn", href: "#" },
  ],
  company: [
    { label: "About", href: "#" },
    { label: "Careers", href: "#" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border-muted bg-background py-12 sm:py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        <div className="mb-12 sm:mb-20 lg:mb-32 flex flex-col items-start justify-between gap-10 sm:gap-16 lg:gap-20 md:flex-row">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="mb-4 sm:mb-6 lg:mb-8 flex items-center gap-3">
              <Image
                src="/Clianta-logo-removebg-preview.png"
                alt="Clianta Logo"
                width={32}
                height={32}
                className="object-contain sm:w-10 sm:h-10"
              />
              <span className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                Clianta
              </span>
            </div>
            <p className="text-sm font-light leading-relaxed text-muted-foreground">
              The AI-native CRM automating the world's most sophisticated sales
              engines.
            </p>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-3 gap-8 sm:gap-12 md:gap-16 lg:gap-32">
            <div>
              <h5 className="label-uppercase mb-4 sm:mb-6 lg:mb-8 text-muted-foreground text-[10px] sm:text-xs">
                System
              </h5>
              <div className="flex flex-col gap-2 sm:gap-3 lg:gap-4">
                {footerLinks.system.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="label-uppercase text-foreground transition-colors hover:text-accent-green text-[10px] sm:text-xs"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h5 className="label-uppercase mb-4 sm:mb-6 lg:mb-8 text-muted-foreground text-[10px] sm:text-xs">
                Social
              </h5>
              <div className="flex flex-col gap-2 sm:gap-3 lg:gap-4">
                {footerLinks.social.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="label-uppercase text-foreground transition-colors hover:text-accent-green text-[10px] sm:text-xs"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h5 className="label-uppercase mb-4 sm:mb-6 lg:mb-8 text-muted-foreground text-[10px] sm:text-xs">
                Company
              </h5>
              <div className="flex flex-col gap-2 sm:gap-3 lg:gap-4">
                {footerLinks.company.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="label-uppercase text-foreground transition-colors hover:text-accent-green text-[10px] sm:text-xs"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-4 sm:gap-6 lg:gap-8 border-t border-border-muted pt-6 sm:pt-8 lg:pt-12 md:flex-row">
          <p className="label-uppercase text-muted-foreground text-[10px] sm:text-xs">
            © {new Date().getFullYear()} Clianta Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 animate-pulse rounded-full bg-accent-green" />
            <span className="label-uppercase text-muted-foreground text-[10px] sm:text-xs">
              Network Status: Optimized
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
