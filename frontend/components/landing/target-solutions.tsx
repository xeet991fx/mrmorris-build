"use client"

import { motion } from "framer-motion"
import { Gem, Users, TrendingUp } from "lucide-react"

const targetProfiles = [
  {
    icon: Gem,
    title: "Founders",
    description:
      "Automate your first sales hires and maintain founder-led quality at enterprise scale.",
    features: ["Zero Training Cost", "24/7 Prospecting"],
  },
  {
    icon: Users,
    title: "Sales Reps",
    description:
      "Eliminate the \"admin hour\". Focus 100% of your energy on closing and strategic conversations.",
    features: ["Auto-enriched leads", "Zero CRM data entry"],
  },
  {
    icon: TrendingUp,
    title: "Revenue Leaders",
    description:
      "Get accurate pipeline forecasts and ensure 100% process compliance across the organization.",
    features: ["Full Pipeline Visibility", "Predictable Outreach"],
  },
]

export function TargetSolutions() {
  return (
    <section id="target" className="scroll-mt-20 bg-black min-h-screen flex items-center py-16 text-white relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        {/* Header */}
        <div className="mb-20 text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="section-label"
          >
            Target Profiles
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="heading-display text-5xl text-white md:text-6xl"
          >
            Built For Sales Teams That Want Speed
          </motion.h2>
        </div>

        {/* Cards Grid */}
        <div className="grid gap-8 md:grid-cols-3">
          {targetProfiles.map((profile, index) => {
            const Icon = profile.icon
            return (
              <motion.div
                key={profile.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index }}
                className="border border-white/10 bg-white/5 p-10 transition-all hover:border-accent-green lg:p-12"
              >
                <div className="mb-8 flex h-12 w-12 items-center justify-center border border-white/10">
                  <Icon className="h-6 w-6 text-white" />
                </div>

                <h4 className="mb-4 text-sm font-bold uppercase tracking-widest text-white">
                  {profile.title}
                </h4>

                <p className="mb-8 text-sm leading-relaxed text-white/60">
                  {profile.description}
                </p>

                <ul className="space-y-3">
                  {profile.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 font-mono text-xs uppercase tracking-tighter text-white/40"
                    >
                      <span className="h-1 w-1 bg-accent-green" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
