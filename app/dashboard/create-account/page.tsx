'use client'

import { useState } from 'react'
import { useAuth } from "@/app/providers"
import { db } from "@/lib/local-db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLiveQuery } from "dexie-react-hooks"
import { UserPlus, Loader2 } from "lucide-react"

export default function CreateAccountPage() {
  const { user } = useAuth()
  
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"hq_admin" | "region_admin" | "branch_user">("branch_user")
  const [regionId, setRegionId] = useState<number>()
  const [branchId, setBranchId] = useState<number>()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const regions = useLiveQuery(() => db.regions.toArray(), [])
  const branches = useLiveQuery(() => db.branches.toArray(), [])

  if (user?.role !== 'hq_admin') {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">Create Account</h1>
        <p className="text-white/60">You don't have permission to create accounts.</p>
      </div>
    )
  }

  const filteredBranches = regionId ? branches?.filter(b => b.region_id === regionId) : []

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const existing = await db.profiles.where('email').equals(email).first()
      if (existing) {
        setError("Email already exists")
        setLoading(false)
        return
      }

      const newProfile = {
        id: crypto.randomUUID(),
        email,
        full_name: fullName,
        role,
        region_id: regionId ?? null,
        branch_id: branchId ?? null,
        created_at: new Date().toISOString()
      }

      await db.profiles.add(newProfile)
      setSuccess(true)
      setFullName("")
      setEmail("")
      setRole("branch_user")
      setRegionId(undefined)
      setBranchId(undefined)
    } catch (err) {
      setError("Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
          <UserPlus className="h-8 w-8 text-primary" />
          Create Account
        </h1>
        <p className="text-white/60 mt-1">
          Invite a new user by creating their account. Choose their role and access level.
        </p>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">New User</CardTitle>
        </CardHeader>
        <CardContent>
          {success && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
              Account created successfully!
            </div>
          )}
          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
              {error}
            </div>
          )}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white/70">Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@company.com"
                required
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Role</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1f2e] border-white/10">
                  <SelectItem value="branch_user" className="text-white">Branch User</SelectItem>
                  <SelectItem value="region_admin" className="text-white">Region Admin</SelectItem>
                  <SelectItem value="hq_admin" className="text-white">HQ Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role !== "hq_admin" && (
              <>
                <div className="space-y-2">
                  <Label className="text-white/70">Region</Label>
                  <Select value={String(regionId)} onValueChange={(v) => { setRegionId(Number(v)); setBranchId(undefined) }}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1f2e] border-white/10">
                      {regions?.map(r => (
                        <SelectItem key={r.id} value={String(r.id)} className="text-white">{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {regionId && (
                  <div className="space-y-2">
                    <Label className="text-white/70">Branch</Label>
                    <Select value={String(branchId)} onValueChange={(v) => setBranchId(Number(v))}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1a1f2e] border-white/10">
                        {filteredBranches?.map(b => (
                          <SelectItem key={b.id} value={String(b.id)} className="text-white">{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
            <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}