"use client"

import { motion } from "framer-motion"
import {
  Zap,
  Target,
  LineChart,
  MessageSquare,
  Shuffle,
  Brain,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const features = [
  {
    icon: Zap,
    title: "Autonomous Campaign Execution",
    description:
      "End-to-end campaign management from creative generation to media buying, bid adjustments, and real-time optimization—all without human intervention.",
    details: [
      "Automatically creates ad variations and landing pages",
      "Manages budgets across Google, Meta, LinkedIn",
      "Adjusts bids and reallocates spend in real-time",
      "Scales winning campaigns automatically",
    ],
    color: "from-yellow-500 to-orange-500",
  },
  {
    icon: Brain,
    title: "Closed-Loop Learning",
    description:
      "Continuously A/B tests everything, detects winners, and automatically implements improvements. Every campaign makes the system smarter.",
    details: [
      "Tests ad copy, creatives, targeting, and timing",
      "Learns from every campaign outcome",
      "Adapts strategies based on your business context",
      "Improves performance over time without retraining",
    ],
    color: "from-purple-600 to-pink-600",
  },
  {
    icon: LineChart,
    title: "Predictive Analytics & Intelligence",
    description:
      "Forecasts campaign ROI, identifies at-risk customers, predicts churn, and recommends proactive actions before problems occur.",
    details: [
      "Predicts which campaigns will succeed",
      "Identifies customers likely to churn",
      "Forecasts budget needs and ROI",
      "Surfaces hidden patterns in your data",
    ],
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: MessageSquare,
    title: "Natural Language Control",
    description:
      "Interact conversationally—ask questions, get insights, approve actions, and control your entire marketing stack through simple conversations.",
    details: [
      "Ask: \"Why did LinkedIn ads underperform?\"",
      "Request: \"Launch a retargeting campaign for cart abandoners\"",
      "Approve proactive recommendations instantly",
      "No dashboards or SQL required",
    ],
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Shuffle,
    title: "Dynamic Personalization at Scale",
    description:
      "Automatically creates tailored content, landing pages, and emails for different segments, locations, and behaviors—personalization without templates.",
    details: [
      "Adapts messaging by audience segment",
      "Creates location-specific campaigns",
      "Personalizes based on behavior triggers",
      "Scales personalization across thousands of customers",
    ],
    color: "from-pink-500 to-rose-500",
  },
  {
    icon: Target,
    title: "Customer Journey Orchestration",
    description:
      "Maps your entire funnel, identifies drop-off points, and autonomously launches campaigns to address weak spots and nurture leads.",
    details: [
      "Detects where customers drop off",
      "Launches retargeting automatically",
      "Nurtures cold leads with personalized sequences",
      "Closes the loop on every opportunity",
    ],
    color: "from-indigo-500 to-purple-500",
  },
]

export function CoreFeatures() {
  return (
    <section id="features" className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Powerful Features That{" "}
            <span className="bg-gradient-to-r from-[#eb5160] to-[#b7999c] bg-clip-text text-transparent">
              Work Autonomously
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            MrMorris doesn&apos;t just automate tasks—it thinks strategically, learns continuously,
            and executes with precision across your entire marketing stack.
          </p>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="group h-full border-2 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-xl">
                <CardHeader>
                  <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} shadow-lg transition-transform group-hover:scale-110`}>
                    <feature.icon className="h-7 w-7 text-white" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {feature.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start text-sm text-muted-foreground">
                        <span className="mr-2 mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
