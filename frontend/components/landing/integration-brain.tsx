"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import { FaSlack, FaLinkedin, FaSalesforce, FaGoogle } from "react-icons/fa"
import { CheckCircle } from "lucide-react"

export function IntegrationBrain() {
  return (
    <section className="bg-background flex items-center py-16 sm:py-20 lg:py-24 lg:min-h-screen">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 w-full">
        <div className="grid items-center gap-12 sm:gap-16 lg:gap-24 lg:grid-cols-2">
          {/* Left - Terminal Demo */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative order-2 hidden lg:block lg:order-1"
          >
            <div className="relative border border-foreground bg-surface-dark p-8 shadow-2xl">
              {/* Header */}
              <div className="mb-8 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-accent-green" />
                <span className="font-mono text-2xs uppercase tracking-widest text-white/40">
                  Agent_Active
                </span>
              </div>

              {/* Prompt Logic */}
              <div className="mb-8 border border-white/5 bg-white/5 p-6">
                <div className="mb-4 font-mono text-[9px] uppercase text-accent-green">
                  Prompt_Logic:
                </div>
                <div className="font-mono text-sm italic text-white/90">
                  "When a lead signs up, enrich their data via Clearbit, find
                  their LinkedIn profile, send a personalized video via Slack to
                  the account owner, and move the deal to 'Qualified'."
                </div>
              </div>

              {/* Action Logs */}
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center justify-between border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center gap-4">
                    <Image
                      src="/Clianta-logo-removebg-preview.png"
                      alt="Clianta"
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain"
                    />
                    <span className="font-mono text-2xs text-white/60">
                      Deal Status updated
                    </span>
                  </div>
                  <CheckCircle className="h-4 w-4 text-accent-green" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center justify-between border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center gap-4">
                    <FaSlack className="text-xl text-purple-500" />
                    <span className="font-mono text-2xs text-white/60">
                      Slack Notification sent
                    </span>
                  </div>
                  <CheckCircle className="h-4 w-4 text-accent-green" />
                </motion.div>
              </div>
            </div>

            {/* Glow Effect */}
            <div className="absolute -bottom-12 -right-12 -z-10 h-48 w-48 bg-accent-green/5 blur-3xl" />
          </motion.div>

          {/* Right - Content */}
          <div className="order-1 lg:order-2">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="section-label"
            >
              One Conversational Brain
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="heading-display mb-4 sm:mb-6 lg:mb-8 text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
            >
              Execute across your entire stack.
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mb-6 sm:mb-8 lg:mb-10 text-base sm:text-lg lg:text-xl font-light leading-relaxed text-muted-foreground"
            >
              Clianta doesn't just "talk" to your tools—it understands the
              context across all of them. It acts as the central intelligence
              that orchestrates every action in your sales process.
            </motion.p>

            {/* Integration Icons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap gap-4 sm:gap-6 lg:gap-8"
            >
              <div className="integration-icon">
                <FaSalesforce className="text-xl sm:text-2xl lg:text-3xl text-[#00A1E0]" />
              </div>
              <div className="integration-icon">
                <FaSlack className="text-xl sm:text-2xl lg:text-3xl text-[#4A154B]" />
              </div>
              <div className="integration-icon">
                <FaLinkedin className="text-xl sm:text-2xl lg:text-3xl text-[#0077b5]" />
              </div>
              <div className="integration-icon">
                <FaGoogle className="text-xl sm:text-2xl lg:text-3xl text-[#4285F4]" />
              </div>
            </motion.div>

            {/* Mobile Terminal Demo */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="mt-8 lg:hidden"
            >
              <div className="relative border border-border dark:border-white/10 bg-black/95 dark:bg-black rounded-xl p-5 shadow-xl overflow-hidden">
                {/* Neural Mesh Background */}
                <div className="neural-mesh absolute inset-0 opacity-10" />

                {/* Header */}
                <div className="relative z-10 mb-5 flex items-center gap-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="h-2.5 w-2.5 rounded-full bg-accent-green"
                  />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                    Global_Brain_Active
                  </span>
                </div>

                {/* Action Logs */}
                <div className="relative z-10 space-y-3">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 }}
                    className="flex items-center justify-between border border-white/10 bg-white/5 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src="/Clianta-logo-removebg-preview.png"
                        alt="Clianta"
                        width={20}
                        height={20}
                        className="h-5 w-5 object-contain"
                      />
                      <span className="font-mono text-xs text-white/60">
                        Deal updated
                      </span>
                    </div>
                    <CheckCircle className="h-4 w-4 text-accent-green" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center justify-between border border-white/10 bg-white/5 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FaSlack className="text-lg text-purple-500" />
                      <span className="font-mono text-xs text-white/60">
                        Slack notified
                      </span>
                    </div>
                    <CheckCircle className="h-4 w-4 text-accent-green" />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center justify-between border border-white/10 bg-white/5 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FaLinkedin className="text-lg text-[#0077b5]" />
                      <span className="font-mono text-xs text-white/60">
                        Profile enriched
                      </span>
                    </div>
                    <CheckCircle className="h-4 w-4 text-accent-green" />
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
