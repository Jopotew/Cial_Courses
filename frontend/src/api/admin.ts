import type { SaleRecord, UserRecord } from '@/types'
import { recentSales, allUsers } from '@/data/mock'
// import { client } from '@/lib/axios'

const MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const adminApi = {
  getSales: async (): Promise<SaleRecord[]> => {
    if (MOCK) return Promise.resolve(recentSales)
    // TODO: return client.get('/admin/sales').then((r) => r.data)
    return recentSales
  },

  getUsers: async (): Promise<UserRecord[]> => {
    if (MOCK) return Promise.resolve([...allUsers])
    // TODO: return client.get('/admin/users').then((r) => r.data)
    return [...allUsers]
  },

  toggleUserActive: async (id: number, active: boolean): Promise<void> => {
    if (MOCK) {
      const u = allUsers.find((u) => u.id === id)
      if (u) u.active = active
      return Promise.resolve()
    }
    // TODO: await client.patch(`/admin/users/${id}`, { active })
  },
}