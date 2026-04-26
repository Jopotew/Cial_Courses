import { client } from '@/lib/axios'

const MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const paymentsApi = {
  create: async (courseId: string): Promise<{ sandbox_init_point: string }> => {
    if (MOCK) return Promise.resolve({ sandbox_init_point: '#mock-payment' })
    const res = await client.post('/payments/create', { course_id: courseId })
    return res.data
  },
}
