"use client"

import { motion } from "framer-motion"
import { Rocket, MessageSquare, CheckCircle, Calendar } from "lucide-react"

const capabilities = [
  {
    icon: Rocket,
    title: "Engage Leads Instantly",
    description:
      "Respond to inquiries within seconds with hyper-personalized research.",
  },
  {
    icon: MessageSquare,
    title: "Run Personalized Sequences",
    description:
      "Adapt every touchpoint based on lead intent and behavioral triggers.",
  },
  {
    icon: CheckCircle,
    title: "Qualify Prospects",
    description:
      "Automatically verify budget, authority, need, and timeline (BANT).",
  },
  {
    icon: Calendar,
    title: "Schedule Meetings",
    description:
      "Directly book qualified demos onto your team's calendar without back-and-forth.",
  },
]

export function Capabilities() {
  return (
    <section id="capabilities" className="scroll-mt-20 bg-background flex items-start py-12 sm:py-16 pt-20 sm:pt-24 lg:pt-32 lg:min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        {/* Header */}
        <div className="mb-10 sm:mb-16 lg:mb-20">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-label"
          >
            The Engine
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="heading-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
          >
            AI Agents That:
          </motion.h2>
        </div>

        {/* Features Grid */}
        <div className="grid border border-border grid-cols-2 lg:grid-cols-4">
          {capabilities.map((capability, index) => {
            const Icon = capability.icon
            return (
              <motion.div
                key={capability.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index }}
                className="group cursor-pointer border-b border-r border-border bg-background p-4 sm:p-6 lg:p-8 xl:p-10 transition-all duration-500 last:border-r-0 hover:bg-foreground lg:border-b-0"
              >
                <Icon className="mb-3 sm:mb-4 lg:mb-6 h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-foreground transition-colors group-hover:text-accent-green" />
                <h3 className="mb-2 sm:mb-3 text-[10px] sm:text-xs lg:text-sm font-bold uppercase tracking-wider sm:tracking-widest text-foreground transition-colors group-hover:text-background">
                  {capability.title}
                </h3>
                <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground transition-colors group-hover:text-background/60 hidden sm:block">
                  {capability.description}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
