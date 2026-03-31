"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ActualsReportForm } from "@/components/dashboard/actuals-report-form"
import { Loader2, ClipboardList, Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

type Branch = {
    id: string
    name: string
    code: string
    region_id: string
}

type Profile = {
    role: string
    branch_id: string | null
    region_id: string | null
}

const ALL_BRANCHES_ID = "__all__"

export default function ActualsPage() {
    const [profile, setProfile] = useState<Profile | null>(null)
    const [branches, setBranches] = useState<Branch[]>([])
    const [selectedBranch, setSelectedBranch] = useState<string>("")
    const [loading, setLoading] = useState(true)
    const [year] = useState(2026) // Default year
    const supabase = createClient()

    useEffect(() => {
        async function fetchProfileAndBranches() {
            setLoading(true)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { data: p } = await supabase
                    .from("profiles")
                    .select("role, branch_id, region_id")
                    .eq("id", user.id)
                    .single()

                setProfile(p)

                let branchesQuery = supabase.from("branches").select("id, name, code, region_id").order("name")

                if (p?.role === "branch_user" && p.branch_id) {
                    setSelectedBranch(p.branch_id)
                } else if (p?.role === "region_admin" && p.region_id) {
                    branchesQuery = branchesQuery.eq("region_id", p.region_id)
                }

                const { data: b } = await branchesQuery
                setBranches(b || [])

                if (p?.role === "hq_admin" || p?.role === "region_admin") {
                    if (b && b.length > 0) {
                        setSelectedBranch(b[0].id)
                    }
                }
            } catch (err) {
                console.error("Error fetching profile:", err)
            } finally {
                setLoading(false)
            }
        }
        fetchProfileAndBranches()
    }, [supabase])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    const isBranchUser = profile?.role === "branch_user"
    const canReport = isBranchUser || profile?.role === "hq_admin" || profile?.role === "region_admin" // Admins can report for any branch they see

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <ClipboardList className="h-8 w-8 text-primary" />
                        Monthly Actuals
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Report the actual income and expenditure for your branch for the month.
                    </p>
                </div>

                {(!isBranchUser && branches.length > 0) && (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 max-w-sm">
                        <Label htmlFor="branch-select" className="text-sm font-medium whitespace-nowrap">
                            Reporting for Branch:
                        </Label>
                        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                            <SelectTrigger id="branch-select">
                                <SelectValue placeholder="Select Branch" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map((b) => (
                                    <SelectItem key={b.id} value={b.id}>
                                        {b.name} ({b.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {!canReport ? (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        You do not have permission to report actuals.
                    </AlertDescription>
                </Alert>
            ) : selectedBranch ? (
                <ActualsReportForm branchId={selectedBranch} year={year} />
            ) : (
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        No branch selected or assigned. Please contact your administrator.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    )
}
