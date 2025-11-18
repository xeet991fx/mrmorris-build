import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { ProblemStatement } from "@/components/landing/problem-statement"
import { SolutionOverview } from "@/components/landing/solution-overview"
import { CoreFeatures } from "@/components/landing/core-features"
import { HowItWorks } from "@/components/landing/how-it-works"
import { StartupBenefits } from "@/components/landing/startup-benefits"
import { Integrations } from "@/components/landing/integrations"
import { SocialProof } from "@/components/landing/social-proof"
import { FAQ } from "@/components/landing/faq"
import { WaitlistCTA } from "@/components/landing/waitlist-cta"
import { Footer } from "@/components/landing/footer"

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Navbar />
      <Hero />
      <ProblemStatement />
      <SolutionOverview />
      <CoreFeatures />
      <HowItWorks />
      <StartupBenefits />
      <Integrations />
      <SocialProof />
      <FAQ />
      <WaitlistCTA />
      <Footer />
    </main>
  )
}
