"use client"

import Link from "next/link"

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
    <footer className="border-t border-border-muted bg-background py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="mb-32 flex flex-col items-start justify-between gap-20 md:flex-row">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="mb-8 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center bg-foreground text-background">
                <span className="material-symbols-outlined text-sm">hub</span>
              </div>
              <span className="font-display text-2xl font-bold tracking-tighter">
                Clianta
              </span>
            </div>
            <p className="text-sm font-light leading-relaxed text-muted-foreground">
              The AI-native CRM automating the world's most sophisticated sales
              engines.
            </p>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-2 gap-16 md:grid-cols-3 md:gap-32">
            <div>
              <h5 className="label-uppercase mb-8 text-muted-foreground">
                System
              </h5>
              <div className="flex flex-col gap-4">
                {footerLinks.system.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="label-uppercase text-foreground transition-colors hover:text-accent-green"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h5 className="label-uppercase mb-8 text-muted-foreground">
                Social
              </h5>
              <div className="flex flex-col gap-4">
                {footerLinks.social.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="label-uppercase text-foreground transition-colors hover:text-accent-green"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h5 className="label-uppercase mb-8 text-muted-foreground">
                Company
              </h5>
              <div className="flex flex-col gap-4">
                {footerLinks.company.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="label-uppercase text-foreground transition-colors hover:text-accent-green"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-8 border-t border-border-muted pt-12 md:flex-row">
          <p className="label-uppercase text-muted-foreground">
            © {new Date().getFullYear()} Clianta Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent-green" />
            <span className="label-uppercase text-muted-foreground">
              Network Status: Optimized
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
