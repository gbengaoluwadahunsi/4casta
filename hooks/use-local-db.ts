import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/lib/local-db'

export function useRegions() {
  return useLiveQuery(() => db.regions.toArray())
}

export function useRegion(id: number) {
  return useLiveQuery(() => db.regions.get(id))
}

export function useBranches() {
  return useLiveQuery(() => db.branches.toArray())
}

export function useBranchesByRegion(regionId: number) {
  return useLiveQuery(() => db.branches.where('region_id').equals(regionId).toArray())
}

export function useBranch(id: number) {
  return useLiveQuery(() => db.branches.get(id))
}

export function useActuals(branchId?: number, year?: number) {
  return useLiveQuery(() => {
    let query = db.actuals.toArray()
    if (branchId) {
      query = db.actuals.where('branch_id').equals(branchId).toArray()
    }
    return query.then(data => {
      if (year) {
        return data.filter(a => a.year === year)
      }
      return data
    })
  }, [branchId, year])
}

export function useForecasts(branchId?: number, year?: number) {
  return useLiveQuery(() => {
    let query = db.forecasts.toArray()
    if (branchId) {
      query = db.forecasts.where('branch_id').equals(branchId).toArray()
    }
    return query.then(data => {
      if (year) {
        return data.filter(f => f.year === year)
      }
      return data
    })
  }, [branchId, year])
}

export function useProfiles() {
  return useLiveQuery(() => db.profiles.toArray())
}

export function useProfile(id: string) {
  return useLiveQuery(() => db.profiles.get(id))
}