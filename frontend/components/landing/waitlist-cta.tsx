"use client"

import { motion } from "framer-motion"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { waitlistSchema, type WaitlistFormData } from "@/lib/validations/waitlist"
import { useWaitlistStore } from "@/store/useWaitlistStore"
import { joinWaitlist } from "@/lib/api/waitlist"

export function WaitlistCTA() {
  const { isSubmitting, isSuccess, error, setSubmitting, setSuccess, setError, reset: resetStore } = useWaitlistStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset: resetForm,
  } = useForm<WaitlistFormData>({
    resolver: zodResolver(waitlistSchema),
  })

  const onSubmit = async (data: WaitlistFormData) => {
    setSubmitting(true)
    setError(null)

    try {
      await joinWaitlist(data)
      setSuccess(true)
      resetForm()
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || "Something went wrong"
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="waitlist" className="py-24 bg-gradient-to-br from-[#eb5160]/10 via-[#b7999c]/10 to-[#dfe0e2]/10">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Ready to Transform Your{" "}
            <span className="bg-gradient-to-r from-[#eb5160] to-[#b7999c] bg-clip-text text-transparent">
              Marketing Agency?
            </span>
          </h2>
          <p className="mb-10 text-lg text-muted-foreground">
            Join the waitlist to get early access, exclusive pricing, and a personalized demo
            of MrMorris in action.
          </p>

          <Card className="border-2 bg-card/80 backdrop-blur">
            <CardContent className="p-8">
              {isSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-8"
                >
                  <CheckCircle className="mb-4 h-16 w-16 text-green-600" />
                  <h3 className="mb-2 text-2xl font-bold">You&apos;re on the list!</h3>
                  <p className="text-muted-foreground">
                    We&apos;ll be in touch soon with more information about MrMorris.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Work email address*"
                      className="h-12 text-base"
                      {...register("email")}
                      disabled={isSubmitting}
                    />
                    {errors.email && (
                      <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Input
                      type="text"
                      placeholder="Company name (optional)"
                      className="h-12 text-base"
                      {...register("companyName")}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Input
                        type="text"
                        placeholder="Your role (optional)"
                        className="h-12 text-base"
                        {...register("role")}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div>
                      <select
                        className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...register("teamSize")}
                        disabled={isSubmitting}
                      >
                        <option value="">Team size (optional)</option>
                        <option value="1-5">1-5</option>
                        <option value="6-20">6-20</option>
                        <option value="21-50">21-50</option>
                        <option value="51-200">51-200</option>
                        <option value="200+">200+</option>
                      </select>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      <p>{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="xl"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      "Join the Waitlist"
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    By joining, you&apos;ll get early access pricing and exclusive updates. No spam, ever.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Early access pricing</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Personalized demo</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>30-day pilot program</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
