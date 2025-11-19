"use client"

import { motion } from "framer-motion"
import { AlertCircle, Clock, TrendingDown, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const problems = [
  {
    icon: Clock,
    title: "Founders Stretched Too Thin",
    description:
      "Small teams are stuck monitoring campaigns manually, missing optimization opportunities while they sleep. You can't be everywhere at once.",
    iconColor: "text-orange-500",
  },
  {
    icon: Users,
    title: "Can't Compete With Bigger Budgets",
    description:
      "Well-funded competitors have 10-person marketing teams. You have limited resources and can't afford to hire expensive specialists.",
    iconColor: "text-blue-500",
  },
  {
    icon: TrendingDown,
    title: "Burning Precious Runway",
    description:
      "By the time you analyze data and make changes, valuable budget is already wasted. Every dollar matters when resources are limited.",
    iconColor: "text-red-500",
  },
  {
    icon: AlertCircle,
    title: "No Room for Expensive Mistakes",
    description:
      "Budget overspend, negative sentiment, or underperforming ads discovered too late can burn through months of runway and damage your brand.",
    iconColor: "text-yellow-500",
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
          transition={{ duration: 0.25 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Startups Face an{" "}
            <span className="bg-gradient-to-r from-[#9ACD32] to-[#8AB82E] bg-clip-text text-transparent">
              Impossible Choice
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Scale marketing effectively or preserve your runway. Your lean team is stretched thin,
            and you can&apos;t afford to hire expensive specialists or waste precious budget.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: index * 0.1 }}
            >
              <Card className="h-full border-2 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg">
                <CardContent className="p-6">
                  <problem.icon className={`mb-4 h-8 w-8 ${problem.iconColor}`} />
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
