"use client"

import { motion } from "framer-motion"
import { Bot, Brain, BarChart3, Users, Workflow } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const agents = [
  {
    icon: Brain,
    name: "Orchestrator Agent",
    description: "Coordinates all agents and makes strategic decisions",
    color: "from-purple-600 to-pink-600",
    iconColor: "text-purple-100",
  },
  {
    icon: Workflow,
    name: "Content Agent",
    description: "Creates and optimizes ad copy, emails, and landing pages",
    color: "from-blue-600 to-cyan-500",
    iconColor: "text-blue-100",
  },
  {
    icon: BarChart3,
    name: "Campaign Agent",
    description: "Manages multi-channel campaign execution and budgets",
    color: "from-emerald-600 to-teal-500",
    iconColor: "text-emerald-100",
  },
  {
    icon: Bot,
    name: "Analytics Agent",
    description: "Analyzes performance and provides predictive insights",
    color: "from-amber-600 to-orange-500",
    iconColor: "text-amber-100",
  },
  {
    icon: Users,
    name: "Customer Agent",
    description: "Tracks customer journeys and orchestrates personalization",
    color: "from-rose-600 to-pink-500",
    iconColor: "text-rose-100",
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
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Meet Your{" "}
            <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 bg-clip-text text-transparent">
              Autonomous Marketing Team
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            MrMorris uses a multi-agent architecture where specialized AI agents work together
            to handle every aspect of your marketing—from strategy to execution to optimization.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full border-2 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-lg">
                <CardHeader>
                  <div
                    className={`mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br ${agent.color} shadow-lg`}
                  >
                    <agent.icon className={`h-8 w-8 ${agent.iconColor}`} />
                  </div>
                  <CardTitle className="text-xl">{agent.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{agent.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-[#eb5160]/5 to-[#b7999c]/5 p-8 text-center backdrop-blur"
        >
          <h3 className="mb-4 text-2xl font-bold">
            Agents That Learn, Collaborate & Execute Autonomously
          </h3>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Each agent has specific expertise and tools, but they communicate and collaborate
            when needed. The Orchestrator Agent ensures everyone works toward your goals while
            continuously learning from every campaign.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
