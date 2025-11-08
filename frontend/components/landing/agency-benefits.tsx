"use client"

import { motion } from "framer-motion"
import { Users, Clock, DollarSign, TrendingUp, Shield, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const benefits = [
  {
    icon: Users,
    title: "Scale Without Hiring",
    description:
      "Manage 3x more clients with the same team size. MrMorris handles the execution while your team focuses on strategy and relationships.",
    stat: "3x more clients",
    iconGradient: "from-purple-600 to-purple-400",
    statColor: "bg-purple-500/10 text-purple-600",
  },
  {
    icon: Clock,
    title: "24/7 Optimization",
    description:
      "Never miss an optimization opportunity. MrMorris monitors and adjusts campaigns around the clock, including weekends and holidays.",
    stat: "Zero downtime",
    iconGradient: "from-blue-600 to-cyan-400",
    statColor: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: DollarSign,
    title: "Maximize Client ROI",
    description:
      "Continuous real-time optimization means better results for clients. Predict issues before they happen and seize opportunities immediately.",
    stat: "↑ 40% ROI avg.",
    iconGradient: "from-emerald-600 to-green-400",
    statColor: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: TrendingUp,
    title: "Faster Growth",
    description:
      "Win more clients by showcasing autonomous marketing capabilities. Differentiate your agency with cutting-edge AI technology.",
    stat: "Competitive edge",
    iconGradient: "from-orange-600 to-amber-400",
    statColor: "bg-orange-500/10 text-orange-600",
  },
  {
    icon: Shield,
    title: "Proactive Crisis Prevention",
    description:
      "Detect negative sentiment spikes, budget overspend, and performance drops instantly. Fix issues before clients notice them.",
    stat: "Early detection",
    iconGradient: "from-red-600 to-rose-400",
    statColor: "bg-red-500/10 text-red-600",
  },
  {
    icon: Zap,
    title: "Instant Insights",
    description:
      "Natural language interface means no more dashboard diving. Ask questions and get prescriptive answers instantly.",
    stat: "10x faster insights",
    iconGradient: "from-pink-600 to-fuchsia-400",
    statColor: "bg-pink-500/10 text-pink-600",
  },
]

export function AgencyBenefits() {
  return (
    <section id="benefits" className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Built for{" "}
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
              Modern Marketing Agencies
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            MrMorris helps agencies break through growth ceilings, deliver better client results,
            and operate more profitably—all while reducing team burnout.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="group relative h-full overflow-hidden border-2 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-xl">
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 opacity-0 transition-opacity group-hover:opacity-100" />

                <CardContent className="relative p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${benefit.iconGradient} shadow-lg`}>
                      <benefit.icon className="h-7 w-7 text-white" />
                    </div>
                    <span className={`rounded-full ${benefit.statColor} px-3 py-1 text-xs font-semibold`}>
                      {benefit.stat}
                    </span>
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
