import { initialProgress } from '@/data/mock'
import { client } from '@/lib/axios'

const MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const progressApi = {
  getCourse: async (courseId: string): Promise<number> => {
    if (MOCK) return Promise.resolve(initialProgress[courseId] ?? 0)
    const res = await client.get(`/progress/courses/${courseId}`)
    return Number(res.data.progress_percentage ?? res.data.percentage ?? 0)
  },
}
