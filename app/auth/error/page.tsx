'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Zap, AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#0d1117] to-[#0a0a0f]" />
      </div>
      <Card className="w-full max-w-md text-center bg-white/5 border-white/10 backdrop-blur-xl">
        <CardHeader>
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
            <div className="rounded-full bg-red-500/10 p-3">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <CardTitle className="text-2xl text-white">Authentication Error</CardTitle>
          <CardDescription className="text-white/50">
            There was a problem with authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-white/40">
            The link may have expired or there was an error during the authentication process.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild className="w-full bg-primary hover:bg-primary/90">
              <Link href="/auth/login">Back to Sign In</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}