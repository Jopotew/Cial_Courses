import { client } from '@/lib/axios'

export interface Video {
  id: string
  courseId: string
  title: string
  description: string | null
  order: number
  durationSeconds: number | null
  durationFormatted: string | null
  thumbnailUrl: string | null
  isPublished: boolean
}

function mapVideo(raw: Record<string, unknown>): Video {
  return {
    id: raw.id as string,
    courseId: raw.course_id as string,
    title: raw.title as string,
    description: (raw.description as string | null) ?? null,
    order: raw.order as number,
    durationSeconds: (raw.duration_seconds as number | null) ?? null,
    durationFormatted: (raw.duration_formatted as string | null) ?? null,
    thumbnailUrl: (raw.thumbnail_url as string | null) ?? null,
    isPublished: raw.is_published as boolean,
  }
}

export const videosApi = {
  list: async (courseId: string): Promise<Video[]> => {
    const res = await client.get(`/videos/courses/${courseId}/videos`)
    return (res.data as Record<string, unknown>[]).map(mapVideo)
  },

  stream: async (videoId: string): Promise<string> => {
    const res = await client.get(`/videos/${videoId}/stream`)
    return res.data.video_url as string
  },
}
