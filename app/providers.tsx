'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createContext, useContext, ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'
import { db, type Profile } from '@/lib/local-db'

interface AuthContextType {
  user: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, role?: 'hq_admin' | 'region_admin' | 'branch_user', regionId?: number, branchId?: number) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const storedUser = localStorage.getItem('4casta_user')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser) as Profile
        const exists = await db.profiles.get(userData.id)
        if (exists) {
          setUser(exists)
        } else {
          localStorage.removeItem('4casta_user')
        }
      } catch {
        localStorage.removeItem('4casta_user')
      }
    }
    setLoading(false)
  }

  async function signIn(email: string, _password: string) {
    // For demo purposes, accept test account credentials
    if (email === '4casta@testing.com' && _password === '4casta') {
      let profile = await db.profiles.where('email').equals('4casta@testing.com').first()
      if (!profile) {
        const testProfile: Profile = {
          id: 'test-account-001',
          email: '4casta@testing.com',
          full_name: 'Test Account (HQ Admin)',
          role: 'hq_admin',
          region_id: null,
          branch_id: null,
          created_at: new Date().toISOString()
        }
        await db.profiles.add(testProfile)
        profile = testProfile
      }
      localStorage.setItem('4casta_user', JSON.stringify(profile))
      setUser(profile)
      return
    }
    
    const profile = await db.profiles.where('email').equals(email).first()
    if (!profile) {
      throw new Error('Invalid credentials')
    }
    localStorage.setItem('4casta_user', JSON.stringify(profile))
    setUser(profile)
  }

  async function signUp(
    email: string, 
    _password: string, 
    fullName: string, 
    role: 'hq_admin' | 'region_admin' | 'branch_user' = 'branch_user',
    regionId?: number,
    branchId?: number
  ) {
    const existing = await db.profiles.where('email').equals(email).first()
    if (existing) {
      throw new Error('Email already exists')
    }

    const id = crypto.randomUUID()
    const profile: Profile = {
      id,
      email,
      full_name: fullName,
      role,
      region_id: regionId ?? null,
      branch_id: branchId ?? null,
      created_at: new Date().toISOString()
    }

    await db.profiles.add(profile)
    localStorage.setItem('4casta_user', JSON.stringify(profile))
    setUser(profile)
  }

  async function signOut() {
    localStorage.removeItem('4casta_user')
    setUser(null)
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
        {children}
      </AuthContext.Provider>
    </ThemeProvider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}