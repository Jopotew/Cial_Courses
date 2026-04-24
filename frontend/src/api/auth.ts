import type { AuthUser } from '@/types'
// import { client } from '@/lib/axios'

const MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const mockAdmin: AuthUser = {
  name: 'María González',
  email: 'maria@example.com',
  initials: 'MG',
  isAdmin: true,
}

export const authApi = {
  sendLoginEmail: async (_email: string): Promise<void> => {
    if (MOCK) return new Promise((r) => setTimeout(r, 600))
    // TODO: await client.post('/auth/login/email', { email })
  },

  verifyPassword: async (_email: string, _password: string): Promise<void> => {
    if (MOCK) return new Promise((r) => setTimeout(r, 900))
    // TODO: await client.post('/auth/login/password', { email, password })
  },

  verify2FA: async (_email: string, _code: string): Promise<AuthUser> => {
    if (MOCK) return new Promise((r) => setTimeout(() => r(mockAdmin), 800))
    // TODO: const res = await client.post('/auth/login/verify', { email, code })
    // TODO: localStorage.setItem('access_token', res.data.access_token)
    // TODO: return res.data.user
    return mockAdmin
  },

  register: async (_name: string, _email: string, _password: string): Promise<void> => {
    if (MOCK) return new Promise((r) => setTimeout(r, 1000))
    // TODO: await client.post('/auth/register', { name, email, password })
  },

  me: async (): Promise<AuthUser> => {
    if (MOCK) return Promise.resolve(mockAdmin)
    // TODO: const res = await client.get('/auth/me')
    // TODO: return res.data
    return mockAdmin
  },
}