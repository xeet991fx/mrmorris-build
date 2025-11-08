"use client"

import { motion } from "framer-motion"
import { Star, Quote } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const testimonials = [
  {
    name: "Sarah Chen",
    role: "CEO, Velocity Marketing",
    company: "Managing 15+ clients",
    quote:
      "MrMorris has completely transformed how we operate. We're managing 3x more clients with the same team, and our client results have never been better. The autonomous optimization alone has saved us 40+ hours per week.",
    rating: 5,
  },
  {
    name: "Marcus Rodriguez",
    role: "Head of Performance",
    company: "Digital Growth Agency",
    quote:
      "The predictive analytics caught a major budget overspend issue before we even noticed it. That one alert alone saved us $15K in wasted spend. The ROI is undeniable.",
    rating: 5,
  },
  {
    name: "Emily Watson",
    role: "Founder",
    company: "Momentum Digital",
    quote:
      "Finally, a tool that actually understands marketing strategy—not just automation. MrMorris makes decisions I would make, but 24/7. It's like having a senior strategist working around the clock.",
    rating: 5,
  },
]

const stats = [
  { value: "40%", label: "Average ROI Increase" },
  { value: "60%", label: "Less Manual Work" },
  { value: "24/7", label: "Campaign Monitoring" },
  { value: "3x", label: "More Clients Managed" },
]

export function SocialProof() {
  return (
    <section className="py-24">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Trusted by{" "}
            <span className="bg-gradient-to-r from-[#eb5160] to-[#b7999c] bg-clip-text text-transparent">
              Leading Agencies
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            See what agency leaders are saying about MrMorris
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-16 grid grid-cols-2 gap-6 md:grid-cols-4"
        >
          {stats.map((stat, index) => (
            <Card
              key={index}
              className="border-2 bg-gradient-to-br from-[#eb5160]/5 to-[#b7999c]/5 backdrop-blur"
            >
              <CardContent className="p-6 text-center">
                <div className="mb-2 text-4xl font-bold bg-gradient-to-r from-[#eb5160] to-[#b7999c] bg-clip-text text-transparent">
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
              transition={{ duration: 0.5, delay: index * 0.1 }}
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
