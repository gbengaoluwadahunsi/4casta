import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Fetch branches for the current user. Uses service role for region admins
 * to ensure they get branches in their region even if RLS has edge cases.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, region_id")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    let query: ReturnType<ReturnType<typeof createAdminClient>["from"]>
    try {
      const admin = createAdminClient()
      query = admin
        .from("branches")
        .select("id, name, region_id, regions(name)")
        .order("name")
    } catch {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 503 }
      )
    }

    if (profile.role === "region_admin") {
      if (!profile.region_id) {
        return NextResponse.json({
          branches: [],
          message: "Your region is not assigned. Contact your administrator to set your region in User Management.",
        })
      }
      query = query.eq("region_id", profile.region_id)
    } else if (profile.role === "branch_user") {
      return NextResponse.json({ branches: [] })
    }
    // HQ admin: no filter, gets all branches

    const { data: branches, error } = await query

    if (error) {
      console.error("Branches fetch error:", error)
      return NextResponse.json(
        { error: error.message || "Failed to fetch branches" },
        { status: 500 }
      )
    }

    return NextResponse.json({ branches: branches ?? [] })
  } catch (e) {
    console.error("Branches API error:", e)
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
