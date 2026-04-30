import { initialProgress } from '@/data/mock'
import { client } from '@/lib/axios'

const MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const progressApi = {
  getCourse: async (courseId: string): Promise<number> => {
    if (MOCK) return Promise.resolve(initialProgress[courseId] ?? 0)
    const res = await client.get(`/progress/courses/${courseId}`)
    return Number(res.data.progress_percentage ?? res.data.percentage ?? 0)
  },

  getCompletedVideoIds: async (courseId: string): Promise<string[]> => {
    if (MOCK) return []
    const res = await client.get(`/progress/courses/${courseId}`)
    const videos = (res.data.videos_progress ?? []) as Array<{ video_id: string; is_completed: boolean }>
    return videos.filter((v) => v.is_completed).map((v) => v.video_id)
  },

  markVideoComplete: async (videoId: string): Promise<void> => {
    if (MOCK) return
    await client.post(`/progress/videos/${videoId}/complete`, { is_completed: true })
  },
}
