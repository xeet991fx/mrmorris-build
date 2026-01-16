"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function FinalCTA() {
  return (
    <section className="cta-section flex items-center py-16 sm:py-20 lg:py-24 lg:min-h-screen">
      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 text-center lg:px-12 w-full">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="heading-display mb-8 sm:mb-10 lg:mb-12 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl text-white"
        >
          Close More Deals. With Less Human Effort.
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center justify-center gap-4 sm:gap-6 lg:gap-8 sm:flex-row"
        >
          <Button
            asChild
            className="w-full bg-accent-green px-8 sm:px-12 lg:px-16 py-4 sm:py-5 lg:py-6 text-[10px] sm:text-xs font-bold uppercase tracking-widest sm:tracking-mega text-black shadow-[0_20px_50px_rgba(34,197,94,0.3)] transition-all hover:bg-white sm:w-auto"
          >
            <Link href="/register">Get Early Access</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full border-white/20 bg-transparent px-8 sm:px-12 lg:px-16 py-4 sm:py-5 lg:py-6 text-[10px] sm:text-xs font-bold uppercase tracking-widest sm:tracking-mega text-white transition-all hover:bg-white hover:text-black sm:w-auto"
          >
            <Link href="#demo">Book a Demo</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
