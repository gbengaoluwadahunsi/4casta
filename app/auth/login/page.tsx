"use client"

import React, { Suspense, useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Eye, EyeOff, Zap, Sparkles } from "lucide-react"
import { useAuth } from "@/app/providers"
import { seedDatabase } from "@/lib/local-db"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signIn } = useAuth()

  const confirmed = searchParams.get("confirmed") === "1"

  useEffect(() => {
    const err = searchParams.get("error")
    if (err === "otp_expired" || err === "auth_callback_failed") {
      setError("Invalid or expired link. Please sign in below or request a new confirmation email.")
    } else if (err === "auth_failed") {
      setError("Something went wrong. Please try signing in again.")
    }
  }, [searchParams])

  useEffect(() => {
    seedDatabase()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await signIn(email, password)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.2]" />
      </div>

      <Card className="w-full max-w-md glass border-border/50 shadow-2xl transition-all duration-500">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Link href="/" className="flex items-center gap-2 group transition-transform hover:scale-105 duration-300">
              <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25">
                  <Zap className="w-6 h-6 text-primary-foreground" />
                </div>
              </div>
              <span className="text-2xl font-bold tracking-tight">
                4<span className="text-primary">casta</span>
              </span>
            </Link>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription className="text-muted-foreground">Sign in to access your forecasting dashboard</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {confirmed && (
              <Alert className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <AlertDescription>Your email is confirmed. Sign in below to go to your dashboard.</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive" className="animate-in fade-in zoom-in duration-300">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background/50 border-border focus:ring-primary/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10 bg-background/50 border-border focus:ring-primary/20 transition-all"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground transition-colors"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20 py-6 text-base font-semibold transition-all h-11" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  Sign in
                </>
              )}
            </Button>
            <div className="flex items-center justify-center w-full gap-2 text-sm">
              <span className="text-muted-foreground">Need an account?</span>
              <Link href="/auth/sign-up" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

function LoginFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
      </div>
      <Card className="w-full max-w-md glass border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-8 w-32 bg-muted animate-pulse mx-auto rounded" />
            <div className="h-4 w-48 bg-muted animate-pulse mx-auto rounded" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="h-10 bg-muted/50 rounded-md animate-pulse" />
            <div className="h-10 bg-muted/50 rounded-md animate-pulse" />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full h-11" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}