"use client"

import { motion } from "framer-motion"
import { AlertCircle, Clock, TrendingDown, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const problems = [
  {
    icon: Clock,
    title: "24/7 Manual Monitoring",
    description:
      "Agency teams are stuck monitoring campaigns around the clock, missing optimization opportunities during off-hours and weekends.",
    color: "from-orange-500 to-red-500",
    iconColor: "text-orange-500",
  },
  {
    icon: Users,
    title: "Limited Scalability",
    description:
      "Agencies hit growth ceilings because they can't manage more clients without hiring more people—eating into margins.",
    color: "from-purple-500 to-pink-500",
    iconColor: "text-purple-500",
  },
  {
    icon: TrendingDown,
    title: "Slow Optimization Cycles",
    description:
      "By the time teams analyze data, make decisions, and implement changes, valuable budget and opportunities are already lost.",
    color: "from-yellow-500 to-amber-500",
    iconColor: "text-yellow-600",
  },
  {
    icon: AlertCircle,
    title: "Reactive Crisis Management",
    description:
      "Issues like budget overspend, negative sentiment spikes, or underperforming ads are discovered too late, damaging client results.",
    color: "from-red-500 to-rose-500",
    iconColor: "text-red-500",
  },
]

export function ProblemStatement() {
  return (
    <section className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Marketing Agencies Are{" "}
            <span className="bg-gradient-to-r from-[#eb5160] to-[#b7999c] bg-clip-text text-transparent">
              Hitting a Wall
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Managing multi-channel campaigns for multiple clients is overwhelming. Your team
            is stretched thin, and traditional tools only add more manual work.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border-2 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${problem.color} shadow-lg`}>
                    <problem.icon className={`h-7 w-7 text-white`} />
                  </div>
                  <h3 className="mb-2 text-xl font-semibold">{problem.title}</h3>
                  <p className="text-muted-foreground">{problem.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
