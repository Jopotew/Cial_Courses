import type { SaleRecord, UserRecord } from '@/types'
import { recentSales, allUsers } from '@/data/mock'
import { client } from '@/lib/axios'

const MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const STATUS_MAP: Record<string, SaleRecord['status']> = {
  approved: 'aprobado',
  pending: 'pendiente',
  rejected: 'rechazado',
}

function toInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export const adminApi = {
  getStats: async (): Promise<{
    totalUsers: number
    activeCourses: number
    enrollments: number
    revenue: number
  }> => {
    if (MOCK) {
      return Promise.resolve({ totalUsers: 6, activeCourses: 5, enrollments: 10, revenue: 57700 })
    }
    const res = await client.get('/admin/stats/general')
    const d = res.data.data ?? res.data
    return {
      totalUsers: d.users?.total ?? 0,
      activeCourses: d.courses?.published ?? 0,
      enrollments: d.enrollments?.active ?? 0,
      revenue: Number(d.revenue?.total ?? 0),
    }
  },

  getSales: async (): Promise<SaleRecord[]> => {
    if (MOCK) return Promise.resolve(recentSales)
    const res = await client.get('/payments/admin/all')
    return (res.data as Record<string, unknown>[]).map((p) => ({
      id: p.id as string,
      student: (p.user_name as string | null) ?? (p.user_email as string) ?? 'Desconocido',
      course: (p.course_title as string) ?? '',
      amount: Number(p.amount),
      date: formatDate(p.created_at as string),
      status: STATUS_MAP[p.status as string] ?? 'pendiente',
    }))
  },

  getUsers: async (): Promise<UserRecord[]> => {
    if (MOCK) return Promise.resolve([...allUsers])
    const res = await client.get('/users', { params: { page_size: 100 } })
    const items = (res.data.items ?? res.data) as Record<string, unknown>[]
    return items.map((u) => ({
      id: u.id as string,
      name: (u.full_name as string | null) ?? (u.username as string),
      email: u.email as string,
      initials: toInitials(u.full_name as string | null, u.email as string),
      enrolled: 0,
      joined: formatDate(u.created_at as string),
      active: u.is_active as boolean,
    }))
  },

  toggleUserActive: async (id: string, active: boolean): Promise<void> => {
    if (MOCK) {
      const u = allUsers.find((u) => u.id === id)
      if (u) u.active = active
      return Promise.resolve()
    }
    if (active) {
      await client.patch(`/users/${id}/activate`)
    } else {
      await client.delete(`/users/${id}`)
    }
  },
}
