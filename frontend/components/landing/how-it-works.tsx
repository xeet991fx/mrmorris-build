"use client"

import { motion } from "framer-motion"
import { ArrowRight, Goal, Cog, TrendingUp } from "lucide-react"

const steps = [
  {
    icon: Goal,
    number: "01",
    title: "Set Your Goals",
    description:
      "Tell MrMorris what you want to achieve: \"Increase demo bookings by 30% this quarter\" or \"Generate 500 qualified leads.\" It asks clarifying questions to understand constraints and priorities.",
    circleGradient: "from-blue-600 to-cyan-500",
    iconGradient: "from-blue-500/20 to-cyan-500/20",
  },
  {
    icon: Cog,
    number: "02",
    title: "MrMorris Strategizes & Executes",
    description:
      "The system creates a complete multi-channel strategy, allocates budget, defines KPIs, builds campaigns, creates content, and launches everything—all autonomously. You approve once, it handles the rest.",
    circleGradient: "from-purple-600 to-pink-500",
    iconGradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    icon: TrendingUp,
    number: "03",
    title: "Continuous Optimization & Learning",
    description:
      "MrMorris monitors performance 24/7, adjusts bids, reallocates budget, tests new variations, and scales winners in real-time. It learns from every campaign and gets smarter over time.",
    circleGradient: "from-emerald-600 to-teal-500",
    iconGradient: "from-emerald-500/20 to-teal-500/20",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            How{" "}
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
              It Works
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            From goal-setting to execution to optimization—MrMorris handles it all autonomously
          </p>
        </motion.div>

        <div className="relative mx-auto max-w-5xl">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="relative mb-12 flex flex-col gap-8 md:flex-row md:items-center"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-14 top-32 h-24 w-0.5 bg-gradient-to-b from-primary to-transparent md:left-[72px] md:top-20" />
              )}

              {/* Step Number Circle */}
              <div className="flex-shrink-0">
                <div className={`flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary/20 bg-gradient-to-br ${step.circleGradient} shadow-lg`}>
                  <span className="text-3xl font-bold text-white">{step.number}</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden flex-shrink-0 md:block">
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
              </div>

              {/* Content */}
              <div className="flex-1 rounded-xl border-2 border-border bg-card p-6 shadow-lg backdrop-blur hover:border-primary/50 transition-colors">
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${step.iconGradient} shadow-md`}>
                  <step.icon className="h-7 w-7 text-foreground" />
                </div>
                <h3 className="mb-3 text-2xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
