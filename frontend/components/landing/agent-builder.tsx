"use client"

import { motion } from "framer-motion"
import { FaLinkedin, FaSlack } from "react-icons/fa"
import { SiNotion, SiGmail, SiGooglecalendar } from "react-icons/si"
import { Sparkles, Users, Zap, Bot } from "lucide-react"

export function AgentBuilder() {
  return (
    <section
      id="workflow"
      className="scroll-mt-20 border-y border-border bg-background flex items-center py-16 sm:py-20 lg:py-24 lg:min-h-screen"
    >
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 w-full">
        <div className="grid items-center gap-12 sm:gap-16 lg:grid-cols-2 lg:gap-24">
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
              className="heading-display mb-4 sm:mb-6 lg:mb-8 text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl"
            >
              Create powerful AI agents by simply describing what you want
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="mb-6 sm:mb-8 lg:mb-10 text-base sm:text-lg lg:text-xl font-light leading-relaxed text-muted-foreground"
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
              className="mb-6 sm:mb-8 lg:mb-10 border-l-2 border-foreground bg-muted/50 p-3 sm:p-4 lg:p-5"
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

          {/* Mobile Visual - Agent Animation */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="relative lg:hidden"
          >
            <div className="relative bg-black/95 dark:bg-black border border-border dark:border-white/10 rounded-xl p-6 overflow-hidden">
              {/* Neural Mesh Background */}
              <div className="neural-mesh absolute inset-0 opacity-10" />

              {/* Header */}
              <div className="relative z-10 mb-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">
                    Agent_Builder
                  </span>
                  <div className="flex gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-white/10" />
                    <div className="h-2 w-2 rounded-full bg-white/10" />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="h-2 w-2 rounded-full bg-accent-green"
                    />
                  </div>
                </div>

                {/* Input Area */}
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-tighter text-accent-green">
                    Agent Intent:
                  </div>
                  <div className="font-mono text-sm leading-relaxed text-white/90">
                    Find decision makers on{" "}
                    <span className="text-blue-400">LinkedIn</span> and{" "}
                    <span className="text-blue-400">send personalized outreach</span>
                  </div>
                </div>
              </div>

              {/* Animated Connection Visualization */}
              <div className="relative z-10 flex items-center justify-center py-8">
                {/* Central AI Core with pulse */}
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="relative"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20 bg-black">
                    <Bot className="h-7 w-7 text-accent-green" />
                  </div>
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute inset-0 rounded-full border border-accent-green"
                  />
                </motion.div>

                {/* Orbiting Icons */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute h-36 w-36"
                >
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a1a1a] border border-white/10">
                      <FaSlack className="text-lg text-[#4A154B]" />
                    </div>
                  </motion.div>
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 -right-3 -translate-y-1/2"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a1a1a] border border-white/10">
                      <SiGmail className="text-lg text-[#EA4335]" />
                    </div>
                  </motion.div>
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a1a1a] border border-white/10">
                      <FaLinkedin className="text-lg text-[#0077b5]" />
                    </div>
                  </motion.div>
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute top-1/2 -left-3 -translate-y-1/2"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1a1a1a] border border-white/10">
                      <SiNotion className="text-lg text-white" />
                    </div>
                  </motion.div>
                </motion.div>
              </div>

              {/* Status Badge */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="relative z-10 flex justify-center"
              >
                <div className="flex items-center gap-2 border border-accent-green/30 bg-black px-4 py-2 rounded-full">
                  <motion.span
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="h-2 w-2 rounded-full bg-accent-green"
                  />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-accent-green">
                    Multi-Platform Ready
                  </span>
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Content - Visual Constructor */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="relative hidden lg:block"
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
                {/* LinkedIn - Left, extends OUTSIDE the card */}
                <div className="absolute -left-6 top-1/2 z-20 -translate-y-1/2 lg:-left-8">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 }}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-lg"
                    title="LinkedIn"
                  >
                    <FaLinkedin className="text-lg text-[#0077b5]" />
                  </motion.div>
                </div>

                {/* SVG Connection Lines */}
                <div className="relative h-full w-full overflow-visible rounded-sm border border-white/5 bg-white/[0.02]">
                  {/* Icons INSIDE the SVG container */}
                  {/* Slack - Top left inside */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6 }}
                    className="absolute left-[22%] top-2 z-20 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-lg"
                    title="Slack"
                  >
                    <FaSlack className="text-xl text-[#4A154B]" />
                  </motion.div>

                  {/* Notion - Top center-right inside */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.7 }}
                    className="absolute right-[25%] top-2 z-20 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-lg"
                    title="Notion"
                  >
                    <SiNotion className="text-xl text-black" />
                  </motion.div>

                  {/* Gmail - Right top inside */}
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.8 }}
                    className="absolute right-2 top-[20%] z-20 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-lg"
                    title="Gmail"
                  >
                    <SiGmail className="text-lg text-[#EA4335]" />
                  </motion.div>

                  {/* Google Calendar - Right bottom inside */}
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.9 }}
                    className="absolute right-2 bottom-[20%] z-20 flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-lg"
                    title="Google Calendar"
                  >
                    <SiGooglecalendar className="text-lg text-[#4285F4]" />
                  </motion.div>

                  <svg className="h-full w-full overflow-visible" viewBox="0 0 400 300">
                    {/* Curved connection lines with different colors and lengths */}
                    {/* Line to LinkedIn (left, extends outside) - blue curved */}
                    <path
                      d="M 200 150 Q 100 130 -20 150"
                      fill="none"
                      stroke="#0077b5"
                      strokeWidth="2"
                      strokeDasharray="6,4"
                      opacity="0.7"
                      className="connection-pulse"
                    />
                    {/* Line to Slack (top left inside) - purple curved */}
                    <path
                      d="M 200 150 Q 140 80 100 25"
                      fill="none"
                      stroke="#4A154B"
                      strokeWidth="2"
                      strokeDasharray="6,4"
                      opacity="0.7"
                      className="connection-pulse"
                    />
                    {/* Line to Notion (top right inside) - white curved */}
                    <path
                      d="M 200 150 Q 260 80 300 25"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                      opacity="0.5"
                      className="connection-pulse"
                    />
                    {/* Line to Gmail (right top inside) - red curved */}
                    <path
                      d="M 200 150 Q 320 100 385 70"
                      fill="none"
                      stroke="#EA4335"
                      strokeWidth="2"
                      strokeDasharray="6,4"
                      opacity="0.7"
                      className="connection-pulse"
                    />
                    {/* Line to Calendar (right bottom inside) - blue curved */}
                    <path
                      d="M 200 150 Q 300 200 385 230"
                      fill="none"
                      stroke="#4285F4"
                      strokeWidth="2"
                      strokeDasharray="6,4"
                      opacity="0.7"
                      className="connection-pulse"
                    />

                    {/* Decorative node paths */}
                    <path
                      className="node-connect"
                      d="M 120 150 Q 160 100 200 100 Q 240 100 280 150"
                      fill="none"
                      stroke="white"
                      strokeWidth="0.5"
                      opacity="0.2"
                    />
                    <path
                      className="node-connect"
                      d="M 120 150 Q 160 200 200 200 Q 240 200 280 150"
                      fill="none"
                      stroke="white"
                      strokeWidth="0.5"
                      opacity="0.2"
                    />

                    {/* AI Core with green glow */}
                    <g>
                      {/* Glow effect */}
                      <circle
                        cx="200"
                        cy="150"
                        r="35"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="1"
                        opacity="0.2"
                        className="animate-pulse"
                      />
                      <circle
                        cx="200"
                        cy="150"
                        r="30"
                        fill="black"
                        stroke="#22c55e"
                        strokeWidth="1.5"
                      />
                      <text
                        x="200"
                        y="153"
                        textAnchor="middle"
                        fill="#22c55e"
                        fontFamily="monospace"
                        fontSize="8"
                        fontWeight="bold"
                      >
                        AI AGENT
                      </text>
                    </g>
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
