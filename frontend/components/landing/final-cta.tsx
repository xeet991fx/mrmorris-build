"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function FinalCTA() {
  return (
    <section className="cta-section min-h-screen flex items-center py-16">
      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center lg:px-12">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="heading-display mb-12 text-6xl text-white md:text-7xl lg:text-8xl"
        >
          Close More Deals. With Less Human Effort.
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center gap-8 sm:flex-row"
        >
          <Button
            asChild
            className="w-full bg-accent-green px-16 py-6 text-xs font-bold uppercase tracking-mega text-black shadow-[0_20px_50px_rgba(34,197,94,0.3)] transition-all hover:bg-white sm:w-auto"
          >
            <Link href="/register">Get Early Access</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full border-white/20 bg-transparent px-16 py-6 text-xs font-bold uppercase tracking-mega text-white transition-all hover:bg-white hover:text-black sm:w-auto"
          >
            <Link href="#demo">Book a Demo</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
