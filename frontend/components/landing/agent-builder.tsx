"use client"

import { motion } from "framer-motion"
import { FaLinkedin, FaSlack } from "react-icons/fa"
import { SiNotion, SiGmail, SiGooglecalendar } from "react-icons/si"
import { Sparkles, Users } from "lucide-react"

export function AgentBuilder() {
  return (
    <section
      id="workflow"
      className="scroll-mt-20 border-y border-border bg-background min-h-screen flex items-center py-16"
    >
      <div className="relative mx-auto max-w-7xl px-6 lg:px-12">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
          {/* Left Content */}
          <div className="relative z-10">
            <motion.span
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="section-label"
            >
              Agent Logic
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="heading-display mb-8 text-4xl md:text-5xl lg:text-6xl"
            >
              Create powerful AI agents by simply describing what you want
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mb-10 text-lg font-light leading-relaxed text-muted-foreground md:text-xl"
            >
              The AI Agent Builder lets you create intelligent agents using
              natural language — no coding, no technical setup.
            </motion.p>

            {/* Example Prompt */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mb-10 border-l-2 border-foreground bg-muted/50 p-5"
            >
              <h5 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                From conversation to automation in minutes
              </h5>
              <div className="font-mono text-sm italic text-foreground/80">
                "When a new lead fills a form, qualify them by email, follow up
                until they respond, book a meeting if they're interested, and
                update the pipeline."
              </div>
            </motion.div>

            {/* Features */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="group flex items-start gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-background transition-all group-hover:bg-foreground group-hover:text-background">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="mb-1 text-sm font-bold uppercase tracking-widest">
                    Adaptive, not static
                  </h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Agents learn from interactions and adjust to changes in your
                    workflow automatically.
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="group flex items-start gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-background transition-all group-hover:bg-foreground group-hover:text-background">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="mb-1 text-sm font-bold uppercase tracking-widest">
                    Human control when needed
                  </h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Define trigger points where the agent hands over the
                    conversation to your sales team.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Right Content - Visual Constructor */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="relative"
          >
            <div className="terminal-card group relative p-6 lg:p-10">
              {/* Neural Mesh */}
              <div className="neural-mesh absolute inset-0 opacity-10" />

              {/* Header */}
              <div className="relative z-10 mb-8">
                <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                    Natural_Language_Constructor
                  </span>
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
                    <div className="h-1.5 w-1.5 rounded-full bg-white/10" />
                    <div className="h-1.5 w-1.5 rounded-full bg-accent-green" />
                  </div>
                </div>

                {/* Input Area */}
                <div className="rounded-sm border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-tighter text-accent-green">
                    Drafting Agent Intent:
                  </div>
                  <div className="font-mono text-sm leading-relaxed text-white/90">
                    Identify high-value decision makers on{" "}
                    <span className="text-blue-400">LinkedIn</span> and{" "}
                    <span className="text-blue-400">Send Connection Request</span>{" "}
                    if they match the ICP.
                  </div>
                </div>
              </div>

              {/* Connection Visualization */}
              <div className="relative flex h-[300px] items-center justify-center lg:h-[350px]">
                {/* Integration Icons - Top */}
                <div className="absolute -top-4 left-1/2 z-20 flex -translate-x-1/2 gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="app-icon-float rounded-lg"
                    title="Slack"
                  >
                    <FaSlack className="text-xl text-[#4A154B]" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 }}
                    className="app-icon-float rounded-lg"
                    title="Notion"
                  >
                    <SiNotion className="text-xl text-white" />
                  </motion.div>
                </div>

                {/* Integration Icons - Right */}
                <div className="absolute -right-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-4 lg:-right-6">
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 }}
                    className="app-icon-float rounded-lg"
                    title="Gmail"
                  >
                    <SiGmail className="text-lg text-[#EA4335]" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.9 }}
                    className="app-icon-float rounded-lg"
                    title="Google Calendar"
                  >
                    <SiGooglecalendar className="text-lg text-[#4285F4]" />
                  </motion.div>
                </div>

                {/* Integration Icons - Left */}
                <div className="absolute -left-4 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-4 lg:-left-6">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 }}
                    className="app-icon-float rounded-lg"
                    title="LinkedIn"
                  >
                    <FaLinkedin className="text-lg text-[#0077b5]" />
                  </motion.div>
                </div>

                {/* SVG Connection Lines */}
                <div className="relative h-full w-full overflow-hidden rounded-sm border border-white/5 bg-white/[0.02]">
                  <svg className="h-full w-full" viewBox="0 0 400 300">
                    {/* Connection lines */}
                    <line
                      className="connection-pulse"
                      x1="200"
                      y1="150"
                      x2="60"
                      y2="150"
                      stroke="#0077b5"
                      strokeWidth="1"
                      opacity="0.5"
                    />
                    <line
                      className="connection-pulse"
                      x1="200"
                      y1="150"
                      x2="200"
                      y2="40"
                      stroke="white"
                      strokeWidth="0.5"
                      opacity="0.2"
                    />
                    <line
                      className="connection-pulse"
                      x1="200"
                      y1="150"
                      x2="340"
                      y2="150"
                      stroke="white"
                      strokeWidth="0.5"
                      opacity="0.2"
                    />

                    {/* Node paths */}
                    <path
                      className="node-connect"
                      d="M 120 150 L 160 100 L 240 100 L 280 150"
                      fill="none"
                      stroke="white"
                      strokeWidth="0.5"
                      opacity="0.3"
                    />
                    <path
                      className="node-connect"
                      d="M 120 150 L 160 200 L 240 200 L 280 150"
                      fill="none"
                      stroke="white"
                      strokeWidth="0.5"
                      opacity="0.3"
                    />

                    {/* AI Core */}
                    <g>
                      <circle
                        cx="200"
                        cy="150"
                        r="30"
                        fill="black"
                        stroke="white"
                        strokeWidth="1"
                      />
                      <text
                        x="200"
                        y="153"
                        textAnchor="middle"
                        fill="white"
                        fontFamily="monospace"
                        fontSize="8"
                        fontWeight="bold"
                      >
                        AI CORE
                      </text>
                    </g>

                    {/* Pulsing dot */}
                    <circle
                      className="animate-ping"
                      cx="200"
                      cy="150"
                      r="4"
                      fill="#22c55e"
                      opacity="0.5"
                    />
                  </svg>

                  <div className="absolute bottom-3 left-3 font-mono text-[8px] uppercase tracking-widest text-white/20">
                    Mapping Autonomous Flow...
                  </div>
                </div>

                {/* Multi-Platform Badge */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                  <div className="flex items-center gap-2 border border-accent-green/30 bg-black px-3 py-1.5">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" />
                    <span className="font-mono text-[9px] uppercase tracking-widest text-accent-green">
                      Multi-Platform Ready
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
