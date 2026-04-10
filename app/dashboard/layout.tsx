'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { VoiceAssistant } from "@/components/dashboard/voice-assistant"
import { useAuth } from "@/app/providers"
import { db } from "@/lib/local-db"

export default function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [regions, setRegions] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      setProfile(user)
      loadData()
    }
  }, [user])

  async function loadData() {
    const [r, b] = await Promise.all([
      db.regions.toArray(),
      db.branches.toArray()
    ])
    setRegions(r)
    setBranches(b)
  }

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      <DashboardSidebar profile={profile} regions={regions} branches={branches} />
      <div className="flex-1 flex flex-col">
        <DashboardHeader profile={profile} />
        <main className="flex-1 p-4 sm:p-6 overflow-auto min-w-0">
          {children}
        </main>
      </div>
      <VoiceAssistant />
    </div>
  )
}