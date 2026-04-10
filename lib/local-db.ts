import Dexie, { type EntityTable } from 'dexie'

export interface Region {
  id?: number
  name: string
  code: string
}

export interface Branch {
  id?: number
  name: string
  code: string
  region_id: number
}

export interface Profile {
  id: string
  email: string
  full_name: string
  role: 'hq_admin' | 'region_admin' | 'branch_user'
  region_id: number | null
  branch_id: number | null
  created_at: string
}

export interface Actual {
  id?: number
  branch_id: number
  year: number
  month: number
  revenue: number
  created_at?: string
  updated_at?: string
}

export interface Forecast {
  id?: number
  branch_id: number
  year: number
  month: number
  forecast_value: number
  budget?: number
  variance?: number
  method?: string
  created_at?: string
  updated_at?: string
}

export interface Upload {
  id?: number
  branch_id: number
  year: number
  month: number
  filename: string
  status: 'pending' | 'processed' | 'error'
  error_message?: string
  uploaded_at?: string
  processed_at?: string
}

const db = new Dexie('4castaDB') as Dexie & {
  regions: EntityTable<Region, 'id'>
  branches: EntityTable<Branch, 'id'>
  profiles: EntityTable<Profile, 'id'>
  actuals: EntityTable<Actual, 'id'>
  forecasts: EntityTable<Forecast, 'id'>
  uploads: EntityTable<Upload, 'id'>
}

db.version(1).stores({
  regions: '++id, name, code',
  branches: '++id, name, code, region_id',
  profiles: 'id, email, role, region_id, branch_id',
  actuals: '++id, branch_id, year, month',
  forecasts: '++id, branch_id, year, month',
  uploads: '++id, branch_id, year, month, status'
})

export { db }

export async function seedDatabase() {
  const existingRegions = await db.regions.count()
  if (existingRegions > 0) return

  const regions: Region[] = [
    { name: 'NSW Region', code: 'NSW' },
    { name: 'VIC Region', code: 'VIC' },
    { name: 'QLD Region', code: 'QLD' },
    { name: 'WA Region', code: 'WA' },
    { name: 'SA Region', code: 'SA' },
    { name: 'ACT Region', code: 'ACT' },
    { name: 'TAS Region', code: 'TAS' },
  ]

  const regionIds = await db.regions.bulkAdd(regions, { allKeys: true }) as number[]

  const branches: Branch[] = [
    { name: 'Sydney CBD', code: '001', region_id: regionIds[0] },
    { name: 'Parramatta', code: '002', region_id: regionIds[0] },
    { name: 'Newcastle', code: '003', region_id: regionIds[0] },
    { name: 'Melbourne CBD', code: '010', region_id: regionIds[1] },
    { name: 'Dandenong', code: '011', region_id: regionIds[1] },
    { name: 'Geelong', code: '012', region_id: regionIds[1] },
    { name: 'Brisbane CBD', code: '020', region_id: regionIds[2] },
    { name: 'Gold Coast', code: '021', region_id: regionIds[2] },
    { name: 'Cairns', code: '022', region_id: regionIds[2] },
    { name: 'Perth CBD', code: '030', region_id: regionIds[3] },
    { name: 'Fremantle', code: '031', region_id: regionIds[3] },
    { name: 'Joondalup', code: '032', region_id: regionIds[3] },
    { name: 'Adelaide CBD', code: '040', region_id: regionIds[4] },
    { name: 'Mount Gambier', code: '041', region_id: regionIds[4] },
    { name: 'Port Adelaide', code: '042', region_id: regionIds[4] },
    { name: 'Canberra CBD', code: '050', region_id: regionIds[5] },
    { name: 'Tuggeranong', code: '051', region_id: regionIds[5] },
    { name: 'Woden', code: '052', region_id: regionIds[5] },
    { name: 'Hobart CBD', code: '060', region_id: regionIds[6] },
    { name: 'Launceston', code: '061', region_id: regionIds[6] },
    { name: 'Devonport', code: '062', region_id: regionIds[6] },
  ]

  const branchIds = await db.branches.bulkAdd(branches, { allKeys: true }) as number[]

  const actuals: Actual[] = []
  
  for (let i = 0; i < branchIds.length; i++) {
    const branchId = branchIds[i]
    for (const year of [2023, 2024, 2025]) {
      for (let month = 1; month <= 12; month++) {
        const baseRevenue = 50000 + (branchId * 1000) + (month * 500)
        const seasonalFactor = Math.sin((month - 1) * Math.PI / 6) * 10000
        const randomFactor = Math.random() * 10000 - 5000
        
        actuals.push({
          branch_id: branchId,
          year,
          month,
          revenue: Math.round(baseRevenue + seasonalFactor + randomFactor)
        })
      }
    }
  }

  await db.actuals.bulkAdd(actuals)

  const forecasts: Forecast[] = []
  for (let i = 0; i < branchIds.length; i++) {
    const branchId = branchIds[i]
    for (let month = 1; month <= 12; month++) {
      const baseValue = 60000 + (branchId * 1200)
      const seasonalFactor = Math.sin((month - 1) * Math.PI / 6) * 12000
      
      forecasts.push({
        branch_id: branchId,
        year: 2026,
        month,
        forecast_value: Math.round(baseValue + seasonalFactor),
        budget: Math.round(baseValue + seasonalFactor * 1.1),
        method: 'Seasonal Naive + Growth'
      })
    }
  }

  await db.forecasts.bulkAdd(forecasts)

  const existingTest = await db.profiles.where('email').equals('4casta@testing.com').first()
  if (!existingTest) {
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
  }
}

export async function ensureTestAccount() {
  const existingTest = await db.profiles.where('email').equals('4casta@testing.com').first()
  if (!existingTest) {
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
  }
}