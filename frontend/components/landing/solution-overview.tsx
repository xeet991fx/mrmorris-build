"use client"

import { motion } from "framer-motion"
import { Brain, Workflow, Bot, MessageSquare } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const capabilities = [
  {
    icon: MessageSquare,
    name: "Describe It",
    description: "Tell Clianta how you sell in plain English",
    iconColor: "text-indigo-500",
  },
  {
    icon: Brain,
    name: "AI Builds It",
    description: "Workflows, automations, and pipelines—created instantly",
    iconColor: "text-violet-500",
  },
  {
    icon: Workflow,
    name: "It Adapts",
    description: "Your CRM evolves as your process changes",
    iconColor: "text-sky-500",
  },
  {
    icon: Bot,
    name: "Zero Entry",
    description: "AI logs every email, call, and meeting automatically",
    iconColor: "text-teal-500",
  },
]

export function SolutionOverview() {
  return (
    <section id="solution" className="py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            CRM That{" "}
            <span className="bg-gradient-to-r from-[#9ACD32] via-[#8AB82E] to-[#7BA628] bg-clip-text text-transparent">
              Builds Itself
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            No configuration. No consultants. Just results.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((capability, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: index * 0.1 }}
            >
              <Card className="h-full border-2 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg text-center">
                <CardHeader>
                  <capability.icon className={`mx-auto mb-2 h-10 w-10 ${capability.iconColor}`} />
                  <CardTitle className="text-lg">{capability.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{capability.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
