"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LineChart,
  Building2,
  MapPin,
  Users,
  UserPlus,
  Settings,
  Home,
  History,
  ClipboardList,
  Zap,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/app/providers"

type Profile = {
  id: string
  email: string
  full_name: string | null
  role: string
  region_id: number | null
  branch_id: number | null
  regions?: { name: string } | null
  branches?: { name: string } | null
}

type Region = {
  id: number
  name: string
}

type Branch = {
  id: number
  name: string
  region_id: number
}

const navItems = {
  branch_user: [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/forecast", label: "Forecasts", icon: LineChart },
    { href: "/dashboard/actuals", label: "Monthly Actuals", icon: ClipboardList },
    { href: "/dashboard/activity", label: "Activity", icon: History },
  ],
  region_admin: [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/forecast", label: "Forecasts", icon: LineChart },
    { href: "/dashboard/actuals", label: "Monthly Actuals", icon: ClipboardList },
    { href: "/dashboard/branches", label: "Branches", icon: Building2 },
    { href: "/dashboard/activity", label: "Activity", icon: History },
  ],
  hq_admin: [
    { href: "/dashboard", label: "Dashboard", icon: Home },
    { href: "/dashboard/create-account", label: "Create account", icon: UserPlus },
    { href: "/dashboard/forecast", label: "Forecasts", icon: LineChart },
    { href: "/dashboard/actuals", label: "Monthly Actuals", icon: ClipboardList },
    { href: "/dashboard/branches", label: "Branches", icon: Building2 },
    { href: "/dashboard/regions", label: "Regions", icon: MapPin },
    { href: "/dashboard/activity", label: "Activity", icon: History },
    { href: "/dashboard/users", label: "Users", icon: Users },
  ],
}

export function DashboardSidebar({ profile, regions = [], branches = [] }: { profile: Profile, regions?: Region[], branches?: Branch[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const items = navItems[profile.role as keyof typeof navItems] || navItems.branch_user

  const handleSignOut = async () => {
    await signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="w-14 md:w-64 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-[width]">
      <div className="p-3 md:p-6 border-b border-sidebar-border flex justify-center md:justify-start">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold hidden md:block text-sidebar-foreground">
            4<span className="text-primary">casta</span>
          </span>
        </Link>
      </div>
      <nav className="flex-1 p-2 md:p-4">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.label}
                  className={cn(
                    "flex items-center justify-center md:justify-start gap-3 px-2 md:px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="hidden md:inline truncate">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-2 md:p-4 border-t border-sidebar-border space-y-1">
        <Link
          href="/dashboard/settings"
          title="Settings"
          className={cn(
            "flex items-center justify-center md:justify-start gap-3 px-2 md:px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/dashboard/settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <Settings className="h-5 w-5 shrink-0" />
          <span className="hidden md:inline truncate">Settings</span>
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center md:justify-start gap-3 px-2 md:px-3 py-2 rounded-md text-sm font-medium transition-colors text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="hidden md:inline truncate">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}