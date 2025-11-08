"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const faqs = [
  {
    question: "How autonomous is MrMorris really?",
    answer:
      "MrMorris can operate fully autonomously within the constraints you set. Initially, you'll work in human-in-the-loop mode where it proposes actions for approval. As trust builds, you can grant it more autonomy to execute campaigns, optimize budgets, and respond to opportunities without asking permission.",
  },
  {
    question: "What if MrMorris makes a mistake or wastes budget?",
    answer:
      "You set budget and risk limits that MrMorris cannot exceed. For example, it can reallocate up to 20% of budget between channels autonomously, but needs approval for larger changes. Every decision is logged in an audit trail so you can review what happened and why. Plus, it learns from mistakes and gets better over time.",
  },
  {
    question: "How long does implementation take?",
    answer:
      "Initial setup typically takes 1-2 weeks, including connecting your marketing platforms, CRM, and analytics tools. The system then observes your campaigns for 2-4 weeks to learn your brand voice, customer behavior, and what works. After that, it can start making autonomous decisions with your approval.",
  },
  {
    question: "How is this different from marketing automation tools like HubSpot?",
    answer:
      "Traditional automation tools execute pre-defined workflows you create. MrMorris thinks strategically, makes decisions based on live data, learns from outcomes, and adapts continuously. It's not just executing your plan—it's creating the plan, testing variations, and improving autonomously.",
  },
  {
    question: "What kind of results can we expect?",
    answer:
      "Early agency partners report 40% average ROI improvement, 60% reduction in manual campaign management time, and the ability to manage 3x more clients with the same team. Results vary based on your current setup and how much autonomy you grant the system.",
  },
  {
    question: "Is our data secure?",
    answer:
      "Absolutely. We're SOC 2 Type II certified and GDPR compliant. Your data is encrypted in transit and at rest. We never share your data with third parties or use it to train models for other customers. You maintain full control and can export or delete your data anytime.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Pricing is tailored to agency size and needs. We offer flexible plans based on the number of clients you manage and campaign spend under management. Join the waitlist to get early access pricing and a personalized demo.",
  },
  {
    question: "Can I try it before committing?",
    answer:
      "Yes! We offer a 30-day pilot program where we work with you on a subset of your campaigns to prove ROI before you commit to a full rollout. Join the waitlist to learn more about our pilot program.",
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
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-[#eb5160] to-[#b7999c] bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Everything you need to know about MrMorris
          </p>
        </motion.div>

        <div className="mx-auto max-w-4xl space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <Card className="border-2 bg-card/50 backdrop-blur transition-all hover:border-primary/30 hover:shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
