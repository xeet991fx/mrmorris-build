"use client"

import { motion } from "framer-motion"
import { Workflow, Clock, Target, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const benefits = [
  {
    icon: Workflow,
    title: "Setup in Minutes",
    description: "Not weeks. Describe your process, start selling.",
    stat: "5 min",
    iconColor: "text-purple-500",
    statColor: "bg-[#9ACD32]/10 text-[#9ACD32]",
  },
  {
    icon: Clock,
    title: "Zero Learning Curve",
    description: "If you can chat, you can use Clianta.",
    stat: "Instant",
    iconColor: "text-blue-500",
    statColor: "bg-[#8AB82E]/10 text-[#8AB82E]",
  },
  {
    icon: Target,
    title: "Always Current",
    description: "Your workflows adapt as your process changes.",
    stat: "Auto",
    iconColor: "text-emerald-500",
    statColor: "bg-[#7BA628]/10 text-[#7BA628]",
  },
  {
    icon: Zap,
    title: "No Consultants",
    description: "Clianta configures itself. Save the budget.",
    stat: "$0",
    iconColor: "text-amber-500",
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
            Why{" "}
            <span className="bg-gradient-to-r from-[#9ACD32] via-[#8AB82E] to-[#7BA628] bg-clip-text text-transparent">
              Clianta
            </span>
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: index * 0.1 }}
            >
              <Card className="group relative h-full overflow-hidden border-2 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-xl">
                <CardContent className="relative p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <benefit.icon className={`h-8 w-8 ${benefit.iconColor}`} />
                    <span className={`rounded-full ${benefit.statColor} px-3 py-1 text-xs font-semibold`}>
                      {benefit.stat}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
