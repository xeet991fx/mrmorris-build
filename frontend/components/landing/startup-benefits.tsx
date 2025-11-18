"use client"

import { motion } from "framer-motion"
import { Users, Clock, DollarSign, TrendingUp, Shield, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const benefits = [
  {
    icon: Users,
    title: "Achieve More With Less",
    description:
      "Scale your marketing impact without hiring expensive specialists. MrMorris handles execution while your lean team focuses on strategy and product.",
    stat: "3x faster execution",
    iconColor: "text-purple-500",
    statColor: "bg-[#9ACD32]/10 text-[#9ACD32]",
  },
  {
    icon: Clock,
    title: "24/7 Optimization",
    description:
      "Never miss an opportunity while you sleep. MrMorris monitors and adjusts campaigns around the clock, maximizing every dollar of your budget.",
    stat: "Zero downtime",
    iconColor: "text-blue-500",
    statColor: "bg-[#8AB82E]/10 text-[#8AB82E]",
  },
  {
    icon: DollarSign,
    title: "Maximize Growth ROI",
    description:
      "Continuous real-time optimization means better results for your business. Predict issues before they burn your runway and seize opportunities immediately.",
    stat: "↑ 40% ROI avg.",
    iconColor: "text-emerald-500",
    statColor: "bg-[#7BA628]/10 text-[#7BA628]",
  },
  {
    icon: TrendingUp,
    title: "Compete With Bigger Teams",
    description:
      "Level the playing field with well-funded competitors. Get enterprise-level marketing execution with a fraction of the resources.",
    stat: "Enterprise results",
    iconColor: "text-amber-500",
    statColor: "bg-[#9ACD32]/10 text-[#9ACD32]",
  },
  {
    icon: Shield,
    title: "Protect Your Budget",
    description:
      "Detect negative sentiment spikes, budget overspend, and performance drops instantly. Fix issues before they damage your brand or waste precious runway.",
    stat: "Early detection",
    iconColor: "text-red-500",
    statColor: "bg-[#8AB82E]/10 text-[#8AB82E]",
  },
  {
    icon: Zap,
    title: "Instant Insights",
    description:
      "Natural language interface means no more dashboard diving. Ask questions and get actionable answers instantly—no data analyst required.",
    stat: "10x faster insights",
    iconColor: "text-yellow-500",
    statColor: "bg-[#9ACD32]/10 text-[#9ACD32]",
  },
]

export function StartupBenefits() {
  return (
    <section id="benefits" className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Built for{" "}
            <span className="bg-gradient-to-r from-[#9ACD32] via-[#8AB82E] to-[#7BA628] bg-clip-text text-transparent">
              Fast-Growing Startups
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            MrMorris helps startups achieve enterprise-level marketing results with limited resources,
            compete with bigger teams, and maximize every dollar of your runway.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: index * 0.1 }}
            >
              <Card className="group relative h-full overflow-hidden border-2 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-xl">
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#9ACD32]/5 to-[#8AB82E]/5 opacity-0 transition-opacity group-hover:opacity-100" />

                <CardContent className="relative p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <benefit.icon className={`h-8 w-8 ${benefit.iconColor}`} />
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
