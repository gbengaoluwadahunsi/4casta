"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"

export async function deleteUser(userId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "hq_admin") {
    return { error: "Forbidden" }
  }

  if (userId === user.id) {
    return { error: "You cannot delete your own account" }
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return { error: error.message }
  } catch (e) {
    console.error("Delete user error:", e)
    return { error: "Failed to delete user" }
  }

  revalidatePath("/dashboard/users")
  return { error: null }
}

export async function updateUserProfile(
  userId: string,
  data: { role: string; region_id: string | null; branch_id: string | null }
) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({
      role: data.role,
      region_id: data.region_id || null,
      branch_id: data.branch_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)

  if (error) {
    return { error: error.message }
  }
  revalidatePath("/dashboard/users")
  return { error: null }
}
