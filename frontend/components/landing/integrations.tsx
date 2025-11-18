"use client"

import { motion } from "framer-motion"
import {
  SiGoogle,
  SiMeta,
  SiLinkedin,
  SiHubspot,
  SiSalesforce,
  SiMailchimp,
  SiGoogleanalytics,
  SiShopify,
  SiStripe,
  SiSlack,
  SiZapier,
  SiWordpress,
} from "react-icons/si"

const integrations = [
  { name: "Google Ads", category: "Advertising", icon: SiGoogle, color: "#4285F4" },
  { name: "Meta Ads", category: "Advertising", icon: SiMeta, color: "#0866FF" },
  { name: "LinkedIn Ads", category: "Advertising", icon: SiLinkedin, color: "#0A66C2" },
  { name: "HubSpot", category: "CRM", icon: SiHubspot, color: "#FF7A59" },
  { name: "Salesforce", category: "CRM", icon: SiSalesforce, color: "#00A1E0" },
  { name: "Mailchimp", category: "Email", icon: SiMailchimp, color: "#FFE01B" },
  { name: "Google Analytics", category: "Analytics", icon: SiGoogleanalytics, color: "#F9AB00" },
  { name: "Shopify", category: "E-commerce", icon: SiShopify, color: "#96BF48" },
  { name: "Stripe", category: "Payments", icon: SiStripe, color: "#635BFF" },
  { name: "Slack", category: "Communication", icon: SiSlack, color: "#4A154B" },
  { name: "Zapier", category: "Automation", icon: SiZapier, color: "#FF4A00" },
  { name: "WordPress", category: "CMS", icon: SiWordpress, color: "#21759B" },
]

export function Integrations() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.25 }}
          className="mb-16 text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Integrates With Your{" "}
            <span className="bg-gradient-to-r from-[#9ACD32] to-[#8AB82E] bg-clip-text text-transparent">
              Entire Stack
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
            MrMorris connects seamlessly with all your marketing tools, CRM, analytics platforms,
            and ad networks to provide a unified autonomous marketing experience.
          </p>
        </motion.div>

        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25, delay: 0.2 }}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
          >
            {integrations.map((integration, index) => {
              const Icon = integration.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="group relative flex flex-col items-center justify-center rounded-lg border-2 border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg"
                >
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#9ACD32]/5 to-[#8AB82E]/5">
                    <Icon className="h-7 w-7" style={{ color: integration.color }} />
                  </div>
                  <p className="text-center text-sm font-semibold">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">{integration.category}</p>

                  {/* Hover effect */}
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-[#9ACD32]/5 to-[#8AB82E]/5 opacity-0 transition-opacity group-hover:opacity-100" />
                </motion.div>
              )
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.25, delay: 0.6 }}
            className="mt-12 text-center"
          >
            <p className="text-muted-foreground">
              And many more integrations coming soon...
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
