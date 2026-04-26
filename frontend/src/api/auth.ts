import type { AuthUser } from '@/types'
import { client } from '@/lib/axios'

const MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const mockAdmin: AuthUser = {
  id: 'mock-admin-uuid',
  name: 'María González',
  email: 'maria@example.com',
  username: 'mariagonzalez',
  initials: 'MG',
  isAdmin: true,
}

function toInitials(name: string | null, username: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase()
  }
  return username.slice(0, 2).toUpperCase()
}

function mapUser(data: Record<string, unknown>): AuthUser {
  const name = (data.full_name as string | null) ?? (data.username as string)
  const username = data.username as string
  return {
    id: data.id as string,
    name,
    email: data.email as string,
    username,
    initials: toInitials(data.full_name as string | null, username),
    isAdmin: (data.role as number) === 1,
  }
}

export const authApi = {
  login: async (
    email: string,
    password: string,
  ): Promise<{ access_token: string; requires_2fa: boolean; user_id: string }> => {
    if (MOCK) {
      return new Promise((r) =>
        setTimeout(() => r({ access_token: 'mock-token', requires_2fa: true, user_id: 'mock-user-id' }), 900),
      )
    }
    const res = await client.post('/auth/login', { email, password })
    return res.data
  },

  verify2FA: async (userId: string, code: string): Promise<AuthUser> => {
    if (MOCK) return new Promise((r) => setTimeout(() => r(mockAdmin), 800))
    const res = await client.post('/auth/verify-2fa', { user_id: userId, code })
    localStorage.setItem('access_token', res.data.access_token)
    return authApi.me()
  },

  register: async (
    fullName: string,
    username: string,
    email: string,
    password: string,
  ): Promise<{ user_id: string }> => {
    if (MOCK) return new Promise((r) => setTimeout(() => r({ user_id: 'mock-new-user-id' }), 1000))
    const res = await client.post('/auth/register', {
      full_name: fullName,
      username,
      email,
      password,
    })
    return res.data
  },

  verifyEmail: async (userId: string, code: string): Promise<void> => {
    if (MOCK) return new Promise((r) => setTimeout(r, 800))
    await client.post('/auth/verify-email', { user_id: userId, code })
  },

  resendVerification: async (email: string): Promise<void> => {
    if (MOCK) return new Promise((r) => setTimeout(r, 500))
    await client.post('/auth/resend-verification', { email })
  },

  me: async (): Promise<AuthUser> => {
    if (MOCK) return Promise.resolve(mockAdmin)
    const res = await client.get('/users/me')
    return mapUser(res.data)
  },

  patchMe: async (fullName: string): Promise<AuthUser> => {
    if (MOCK) return Promise.resolve({ ...mockAdmin, name: fullName })
    const res = await client.patch('/users/me', { full_name: fullName })
    return mapUser(res.data)
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    if (MOCK) return new Promise((r) => setTimeout(r, 600))
    await client.patch('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  },
}
