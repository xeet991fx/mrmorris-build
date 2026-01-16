"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Zap, Mail, TrendingUp } from "lucide-react"

export function Hero() {
  return (
    <section className="relative flex min-h-[100dvh] items-center overflow-hidden bg-background px-4 pt-20 pb-12 sm:px-6 sm:pt-24 sm:pb-16 lg:px-12 lg:pt-16 lg:pb-16">
      {/* Grid Background */}
      <div className="absolute inset-0 grid-bg-subtle" />

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-16">
          {/* Left Content */}
          <div className="relative lg:col-span-7">
            {/* Status Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-4 inline-flex items-center gap-2 border border-border-muted bg-background/50 px-3 py-1 backdrop-blur-md sm:mb-6 sm:gap-3 sm:px-4 sm:py-1.5 md:mb-8"
            >
              <span className="h-2 w-2 animate-ping rounded-full bg-accent-green" />
              <span className="text-2xs font-bold uppercase tracking-mega">
                Neural CRM Engine Active
              </span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="heading-display mb-6 text-4xl text-foreground sm:mb-8 sm:text-5xl md:mb-10 md:text-6xl lg:text-7xl xl:text-8xl"
            >
              AI That Runs Your Sales Engine.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="mb-8 max-w-xl text-base font-light leading-relaxed text-muted-foreground sm:mb-10 sm:text-lg md:mb-12 md:text-xl lg:text-2xl"
            >
              The AI-native CRM where a conversational agent automates your
              entire sales process — from first touch to closed deal.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6"
            >
              <Button
                asChild
                className="w-full bg-foreground px-8 sm:px-12 py-4 sm:py-5 text-xs sm:text-2xs font-bold uppercase tracking-widest text-background shadow-2xl transition-all hover:bg-accent-green hover:text-black sm:w-auto"
              >
                <Link href="/register">Get Early Access</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-border-muted bg-background px-8 sm:px-12 py-4 sm:py-5 text-xs sm:text-2xs font-bold uppercase tracking-widest transition-all hover:bg-foreground hover:text-background sm:w-auto"
              >
                <Link href="#how-it-works">Book a Demo</Link>
              </Button>
            </motion.div>

            {/* Mobile Terminal Preview */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-10 lg:hidden"
            >
              <div className="relative bg-black/95 dark:bg-black border border-border dark:border-white/10 rounded-xl p-5 overflow-hidden">
                {/* Neural Mesh Background */}
                <div className="neural-mesh absolute inset-0 opacity-10" />

                {/* Header */}
                <div className="relative z-10 mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="h-2 w-2 rounded-full bg-accent-green"
                    />
                    <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                      Agent.process.log
                    </span>
                  </div>
                  <span className="font-mono text-[8px] text-white/20">v2.0.4</span>
                </div>

                {/* Process Steps */}
                <div className="relative z-10 space-y-3">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center justify-between border border-white/10 bg-white/5 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Zap className="h-4 w-4 text-accent-green" />
                      <div>
                        <div className="font-mono text-xs text-accent-green">ENRICHING_DATA</div>
                        <div className="font-mono text-[9px] text-white/40">124 leads scanned</div>
                      </div>
                    </div>
                    <div className="h-1.5 w-12 rounded-full bg-white/10 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "66%" }}
                        transition={{ duration: 1, delay: 0.9 }}
                        className="h-full bg-accent-green rounded-full"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 0.6, x: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex items-center justify-between border border-white/10 bg-white/5 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-white/40" />
                      <span className="font-mono text-xs text-white/60">Drafting_Sequences</span>
                    </div>
                    <span className="font-mono text-[9px] text-white/40">Pending</span>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 0.4, x: 0 }}
                    transition={{ delay: 0.9 }}
                    className="flex items-center justify-between border border-white/10 bg-white/5 p-3 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-4 w-4 text-white/40" />
                      <span className="font-mono text-xs text-white/60">Schedule_Meetings</span>
                    </div>
                    <span className="font-mono text-[9px] text-white/40">Queued</span>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Content - Terminal UI */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="relative hidden lg:col-span-5 lg:block"
          >
            <div className="group relative">
              {/* Glow Effect */}
              <div className="absolute -inset-4 rounded-full bg-accent-green/5 blur-3xl transition-colors group-hover:bg-accent-green/10" />

              {/* Terminal Card */}
              <div className="terminal-card relative p-8">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-accent-green" />
                    <span className="font-mono text-[9px] uppercase tracking-widest opacity-40">
                      Agent.process.log
                    </span>
                  </div>
                  <span className="font-mono text-[9px] italic opacity-20">
                    v2.0.4-stable
                  </span>
                </div>

                {/* Input Query */}
                <div className="mb-10">
                  <div className="mb-3 font-mono text-2xs uppercase tracking-tighter opacity-40">
                    &gt; input_query
                  </div>
                  <div className="typing-indicator font-mono text-lg leading-snug text-white">
                    Follow up with new leads from the enterprise campaign and
                    schedule intros.
                  </div>
                </div>

                {/* Process Steps */}
                <div className="space-y-4">
                  {/* Active Step */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.6 }}
                    className="group/line relative flex items-center justify-between border border-white/5 bg-white/5 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-[14px] text-accent-green">
                        insights
                      </span>
                      <div>
                        <div className="font-mono text-2xs text-accent-green">
                          ENRICHING_DATA
                        </div>
                        <div className="font-mono text-[8px] opacity-40">
                          Scanning 124 leads via Clearbit...
                        </div>
                      </div>
                    </div>
                    <div className="progress-bar w-12">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "66%" }}
                        transition={{ duration: 1, delay: 0.8 }}
                        className="progress-bar-fill"
                      />
                    </div>
                  </motion.div>

                  {/* Pending Step */}
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 0.5, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.7 }}
                    className="flex items-center justify-between border border-white/5 bg-white/5 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-[14px] text-white/40">
                        mail
                      </span>
                      <div className="font-mono text-2xs uppercase">
                        Drafting_Sequences
                      </div>
                    </div>
                    <span className="font-mono text-[9px]">Pending</span>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
