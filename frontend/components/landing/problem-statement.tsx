"use client"

import { motion } from "framer-motion"
import { AlertCircle, Clock, Cog, Users } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const problems = [
  {
    icon: Cog,
    title: "Weeks of Setup",
    description: "Complex configuration, custom fields, workflow builders. You need a consultant just to start.",
    iconColor: "text-orange-500",
  },
  {
    icon: Clock,
    title: "Endless Data Entry",
    description: "Your team spends more time updating the CRM than actually selling.",
    iconColor: "text-blue-500",
  },
  {
    icon: AlertCircle,
    title: "Broken Automations",
    description: "If-then rules are fragile. One change breaks everything.",
    iconColor: "text-red-500",
  },
  {
    icon: Users,
    title: "Nobody Uses It",
    description: "Too complicated. Your team finds workarounds. Data becomes useless.",
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
            CRMs Are{" "}
            <span className="bg-gradient-to-r from-[#9ACD32] to-[#8AB82E] bg-clip-text text-transparent">
              Broken
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            You wanted to save time. You got a complex system that nobody wants to use.
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
