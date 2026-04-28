import { client } from '@/lib/axios'

const MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const paymentsApi = {
  create: async (courseId: string): Promise<{ init_point: string; sandbox_init_point: string }> => {
    if (MOCK) return Promise.resolve({ init_point: '#mock-payment', sandbox_init_point: '#mock-payment' })
    const res = await client.post('/payments/create', { course_id: courseId })
    return res.data
  },

  cancelByPreference: async (preferenceId: string): Promise<void> => {
    if (MOCK) return
    await client.patch(`/payments/cancel-by-preference/${preferenceId}`)
  },

  confirmSuccess: async (mpPaymentId: string): Promise<void> => {
    if (MOCK) return
    await client.post(`/payments/confirm-success?mp_payment_id=${mpPaymentId}`)
  },
}
