"use client"

import { motion } from "framer-motion"
import { ArrowRight, Upload, Sparkles, Workflow } from "lucide-react"

const steps = [
  {
    icon: Upload,
    number: "01",
    title: "Import Your Contacts",
    description:
      "Connect your existing tools or upload a CSV. Clianta automatically deduplicates, cleans, and organizes your data. No manual mapping or complex setup required.",
    iconColor: "text-cyan-500",
  },
  {
    icon: Sparkles,
    number: "02",
    title: "AI Creates Your Workflows",
    description:
      "Unlike traditional CRMs that require hours of complex configuration, Clianta's AI analyzes your sales process and automatically creates personalized workflows tailored to how you actually work. No flowchart builders or technical setup—just describe what you need.",
    iconColor: "text-violet-500",
  },
  {
    icon: Workflow,
    number: "03",
    title: "Automations Run For You",
    description:
      "Your custom workflows run automatically—sending follow-ups, updating deal stages, assigning tasks, and alerting you to opportunities. You focus on selling while Clianta handles the rest.",
    iconColor: "text-emerald-500",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Workflows That{" "}
            <span className="bg-gradient-to-r from-[#9ACD32] via-[#8AB82E] to-[#7BA628] bg-clip-text text-transparent">
              Build Themselves
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            Forget complex workflow builders. Tell Clianta what you need, and AI creates automation tailored to your process.
          </p>
        </motion.div>

        <div className="relative mx-auto max-w-5xl">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: index * 0.2 }}
              className="relative mb-12 flex flex-col gap-8 md:flex-row md:items-center"
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-14 top-32 h-24 w-0.5 bg-gradient-to-b from-primary to-transparent md:left-[72px] md:top-20" />
              )}

              {/* Step Number Circle */}
              <div className="flex-shrink-0">
                <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-border bg-card shadow-lg">
                  <span className="text-3xl font-bold text-foreground">{step.number}</span>
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden flex-shrink-0 md:block">
                <ArrowRight className="h-8 w-8 text-muted-foreground" />
              </div>

              {/* Content */}
              <div className="flex-1 rounded-xl border-2 border-border bg-card p-6 shadow-lg backdrop-blur hover:border-primary/50 transition-colors">
                <step.icon className={`mb-4 h-8 w-8 ${step.iconColor}`} />
                <h3 className="mb-3 text-2xl font-bold">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
