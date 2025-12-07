"use client"

import { motion } from "framer-motion"
import { ArrowRight, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export function Hero() {
  return (
    <section className="relative min-h-screen pt-32 pb-20">
      {/* Gradient Background */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute h-full w-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(154,205,50,0.2),rgba(138,184,46,0.1))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(154,205,50,0.15),rgba(138,184,46,0.05))]"></div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#9ACD32]/50 to-transparent"></div>
      </div>

      <div className="container">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Badge className="mb-6 px-4 py-2 text-sm bg-gradient-to-r from-[#9ACD32]/20 to-[#8AB82E]/20 border-[#9ACD32]/30" variant="secondary">
              <Sparkles className="mr-2 h-4 w-4 text-[#9ACD32]" />
              AI-Native CRM
            </Badge>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="mb-6 max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl"
          >
            Your CRM,{" "}
            <span className="bg-gradient-to-r from-[#9ACD32] via-[#8AB82E] to-[#7BA628] bg-clip-text text-transparent">
              Built by AI
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.2 }}
            className="mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl md:text-2xl"
          >
            Describe how you sell. Clianta builds personalized workflows
            and automations in minutes.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.3 }}
            className="flex flex-col gap-4 sm:flex-row"
          >
            <Button asChild size="xl" className="group">
              <Link href="/register">
                Start Free
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="outline">
              <Link href="#how-it-works">
                How It Works
              </Link>
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.4 }}
            className="mt-20 grid w-full max-w-3xl grid-cols-3 gap-8"
          >
            {[
              { value: "5 min", label: "Setup", color: "from-[#9ACD32] to-[#8AB82E]" },
              { value: "Zero", label: "Config", color: "from-[#8AB82E] to-[#7BA628]" },
              { value: "AI", label: "Workflows", color: "from-[#7BA628] to-[#6C9420]" },
            ].map((stat, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className={`text-3xl font-bold md:text-4xl bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
