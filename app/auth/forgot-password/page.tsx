'use client'

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, ArrowLeft, Info } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f]" />
      </div>
      <Card className="w-full max-w-md bg-white/5 border-white/10 backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">
                4<span className="text-primary">casta</span>
              </span>
            </Link>
          </div>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <Info className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">Demo Mode</CardTitle>
          <CardDescription className="text-white/50">
            Password reset is not available in demo mode
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white/40">
            This is a portfolio demo app. Use the test account credentials to sign in:
          </p>
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-sm text-white/60 mb-2"><strong>Email:</strong> 4casta@testing.com</p>
            <p className="text-sm text-white/60"><strong>Password:</strong> 4casta</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button asChild className="w-full bg-primary hover:bg-primary/90">
            <Link href="/auth/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign in
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}