"use client"

import { motion } from "framer-motion"

const stats = [
  {
    value: "400+",
    label: "Hours / Year",
    description: "Spent per rep on manual data entry and CRM maintenance.",
  },
  {
    value: "12%",
    label: "Lead Decay",
    description: "Success rate drops every 5 minutes an inbound lead goes ignored.",
  },
  {
    value: "0.0s",
    label: "Sync Lag",
    description: "The time Clianta takes to update every tool in your stack.",
  },
  {
    value: "24/7",
    label: "Activity",
    description: "Autonomous agents never stop prospecting or following up.",
  },
]

export function ProblemStatement() {
  return (
    <section id="problem" className="scroll-mt-20 bg-black min-h-screen flex items-center py-16 text-white relative overflow-hidden">
      {/* Neural Mesh Background */}
      <div className="neural-mesh absolute inset-0 opacity-5" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-12">
        <div className="grid items-center gap-20 lg:grid-cols-2">
          {/* Left Content */}
          <div>
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="section-label"
            >
              The Data Entry Trap
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="heading-display mb-10 text-5xl text-white md:text-6xl"
            >
              Your sales team is losing 70% of their time to manual tasks.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-xl font-light leading-relaxed text-white/60"
            >
              CRMs were built for management, not for sellers. Repetitive
              follow-ups, manual data enrichment, and constant pipeline updates
              are killing your conversion rates.
            </motion.p>
          </div>

          {/* Right Content - Stats Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index }}
                className="stats-card group"
              >
                <div className="mb-4 font-display text-4xl font-bold text-accent-green">
                  {stat.value}
                </div>
                <div className="label-uppercase mb-2 opacity-40">
                  {stat.label}
                </div>
                <p className="text-sm text-white/60">{stat.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
