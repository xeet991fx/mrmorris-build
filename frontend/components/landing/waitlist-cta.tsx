"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function WaitlistCTA() {
  return (
    <section id="cta" className="py-24 bg-gradient-to-br from-[#9ACD32]/10 via-[#8AB82E]/10 to-[#7BA628]/10">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Ready to{" "}
            <span className="bg-gradient-to-r from-[#9ACD32] to-[#8AB82E] bg-clip-text text-transparent">
              Start?
            </span>
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Free 14-day trial. No credit card. Setup in 5 minutes.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="xl" className="group">
              <Link href="/register">
                Start Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="/login">
                Sign In
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
