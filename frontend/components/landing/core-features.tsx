"use client"

import { motion } from "framer-motion"
import {
  Sparkles,
  Target,
  MessageSquare,
  Mail,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

const features = [
  {
    icon: Sparkles,
    title: "AI-Built Workflows",
    description: "Describe what you need. Clianta builds it.",
    details: [
      "\"Follow up if no reply in 3 days\"",
      "\"Move to negotiation when proposal sent\"",
      "No flowcharts. No coding.",
    ],
    iconColor: "text-amber-500",
  },
  {
    icon: Target,
    title: "Smart Pipeline",
    description: "AI predicts and prioritizes your deals.",
    details: [
      "Win probability scoring",
      "At-risk deal alerts",
      "Auto deal progression",
    ],
    iconColor: "text-purple-500",
  },
  {
    icon: Mail,
    title: "Email Built-In",
    description: "Send, track, and automate from one place.",
    details: [
      "Two-way sync",
      "Open tracking",
      "AI-drafted replies",
    ],
    iconColor: "text-blue-500",
  },
  {
    icon: MessageSquare,
    title: "Chat with Your Data",
    description: "Ask questions. Get answers instantly.",
    details: [
      "\"Show deals closing this month\"",
      "\"What's my pipeline value?\"",
      "No dashboards needed",
    ],
    iconColor: "text-emerald-500",
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
          transition={{ duration: 0.25 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            <span className="bg-gradient-to-r from-[#9ACD32] to-[#8AB82E] bg-clip-text text-transparent">
              Features
            </span>
          </h2>
        </motion.div>

        <div className="grid gap-8 md:grid-cols-2">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: index * 0.1 }}
            >
              <Card className="group h-full border-2 bg-card/50 backdrop-blur transition-all hover:border-primary/50 hover:shadow-xl">
                <CardHeader>
                  <feature.icon className={`mb-2 h-8 w-8 ${feature.iconColor}`} />
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
