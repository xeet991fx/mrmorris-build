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
    <section id="capabilities" className="scroll-mt-20 bg-background min-h-screen flex items-start pt-32 pb-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        {/* Header */}
        <div className="mb-20">
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
            className="heading-display text-5xl md:text-6xl"
          >
            AI Agents That:
          </motion.h2>
        </div>

        {/* Features Grid */}
        <div className="grid border border-border md:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((capability, index) => {
            const Icon = capability.icon
            return (
              <motion.div
                key={capability.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index }}
                className="group cursor-pointer border-b border-r border-border bg-background p-8 transition-all duration-500 last:border-r-0 hover:bg-foreground md:border-b-0 lg:p-10"
              >
                <Icon className="mb-6 h-8 w-8 text-foreground transition-colors group-hover:text-accent-green" />
                <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-foreground transition-colors group-hover:text-background">
                  {capability.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground transition-colors group-hover:text-background/60">
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
