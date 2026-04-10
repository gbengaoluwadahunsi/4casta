'use client'

import { useState, useEffect } from 'react'
import { useAuth } from "@/app/providers"
import { db } from "@/lib/local-db"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, User, Shield, Building2 } from "lucide-react"

const roleLabels = {
  hq_admin: "Headquarters Admin",
  region_admin: "Region Admin",
  branch_user: "Branch User",
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "")
      setLoading(false)
    }
  }, [user])

  async function handleSave() {
    if (!user) return
    
    setSaving(true)
    setSuccess(false)
    
    try {
      await db.profiles.update(user.id, { full_name: fullName })
      
      const updatedUser = await db.profiles.get(user.id)
      if (updatedUser) {
        localStorage.setItem('4casta_user', JSON.stringify(updatedUser))
      }
      
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Error saving:", err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Settings</h1>
        <p className="text-white/60 mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription className="text-white/50">
            Update your personal information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/70">Email</Label>
            <Input
              value={user?.email || ""}
              disabled
              className="bg-white/5 border-white/10 text-white/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-white/70">Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">Role</Label>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/20 text-primary">
                {roleLabels[user?.role as keyof typeof roleLabels] || user?.role}
              </Badge>
            </div>
          </div>

          {success && (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Profile updated successfully</span>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Account Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <span className="text-white/60">Account Type</span>
            <Badge className="bg-primary/20 text-primary">
              {roleLabels[user?.role as keyof typeof roleLabels] || user?.role}
            </Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <span className="text-white/60">Branch Access</span>
            <span className="text-white">{user?.branch_id ? `Branch ID: ${user.branch_id}` : 'None'}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-white/60">Region Access</span>
            <span className="text-white">{user?.region_id ? `Region ID: ${user.region_id}` : 'None'}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}