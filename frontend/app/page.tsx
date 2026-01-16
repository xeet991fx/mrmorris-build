import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { ProblemStatement } from "@/components/landing/problem-statement"
import { AgentBuilder } from "@/components/landing/agent-builder"
import { Capabilities } from "@/components/landing/capabilities"
import { TargetSolutions } from "@/components/landing/target-solutions"
import { IntegrationBrain } from "@/components/landing/integration-brain"
import { FinalCTA } from "@/components/landing/final-cta"
import { Footer } from "@/components/landing/footer"

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden scroll-smooth">
      <Navbar />
      <Hero />
      <ProblemStatement />
      <AgentBuilder />
      <Capabilities />
      <TargetSolutions />
      <IntegrationBrain />
      <FinalCTA />
      <Footer />
    </main>
  )
}
