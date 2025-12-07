"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const faqs = [
  {
    question: "How does the AI work?",
    answer:
      "Describe what you want in plain English. Clianta builds workflows, automations, and pipelines automatically. No coding, no flowcharts.",
  },
  {
    question: "How is this different from Salesforce or HubSpot?",
    answer:
      "Traditional CRMs need weeks of setup and consultants. Clianta configures itself through conversation—in minutes.",
  },
  {
    question: "Can I import existing data?",
    answer:
      "Yes. Import via CSV or connect directly to Salesforce, HubSpot, or Pipedrive. We clean and dedupe automatically.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Bank-level encryption. SOC 2 Type II compliant. GDPR ready. Your data is never shared.",
  },
  {
    question: "How long to get started?",
    answer:
      "Under 5 minutes. Connect email, import contacts, describe your process. Done.",
  },
]

export function FAQ() {
  return (
    <section id="faq" className="py-24">
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
              FAQ
            </span>
          </h2>
        </motion.div>

        <div className="mx-auto max-w-3xl space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
            >
              <Card className="border-2 bg-card/50 backdrop-blur transition-all hover:border-primary/30 hover:shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
