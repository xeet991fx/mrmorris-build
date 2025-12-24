"use client"

import { motion } from "framer-motion"
import { Star, Quote } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const testimonials = [
  {
    name: "Alex Rivera",
    role: "CEO & Co-founder",
    company: "TechFlow (B2B SaaS)",
    quote:
      "Clianta has been a game-changer for our lean team. We're achieving growth metrics that would normally require a 10-person marketing team, and our CAC has dropped by 35%. It's like having an entire growth team working 24/7.",
    rating: 5,
  },
  {
    name: "Jordan Kim",
    role: "Head of Growth",
    company: "CloudScale (Series A)",
    quote:
      "The predictive analytics caught a budget overspend issue that would have burned through $20K of our runway. For a startup, that kind of protection is invaluable. Best investment we've made.",
    rating: 5,
  },
  {
    name: "Morgan Chen",
    role: "Founder",
    company: "DataPulse (Pre-seed)",
    quote:
      "Finally, a tool that lets us compete with well-funded competitors. Clianta gives us enterprise-level marketing execution on a startup budget. It's leveled the playing field completely.",
    rating: 5,
  },
]

const stats = [
  { value: "40%", label: "Average ROI Increase" },
  { value: "60%", label: "Less Manual Work" },
  { value: "24/7", label: "Campaign Monitoring" },
  { value: "3x", label: "Faster Growth" },
]

export function SocialProof() {
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
            Trusted by{" "}
            <span className="bg-gradient-to-r from-[#9ACD32] to-[#8AB82E] bg-clip-text text-transparent">
              Innovative Startups
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            See what startup founders are saying about Clianta
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="mb-16 grid grid-cols-2 gap-6 md:grid-cols-4"
        >
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="border-2 bg-gradient-to-br from-[#9ACD32]/5 to-[#8AB82E]/5 backdrop-blur"
            >
              <CardContent className="p-6 text-center">
                <div className="mb-2 text-4xl font-bold bg-gradient-to-r from-[#9ACD32] to-[#8AB82E] bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Testimonials */}
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.25, delay: index * 0.1 }}
            >
              <Card className="h-full border-2 bg-card/50 backdrop-blur transition-all hover:border-primary/30 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>

                  <Quote className="mb-4 h-8 w-8 text-primary/20" />

                  <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
                    &quot;{testimonial.quote}&quot;
                  </p>

                  <div className="border-t border-border pt-4">
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.company}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
