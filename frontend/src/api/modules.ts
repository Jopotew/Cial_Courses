import { client as api } from '@/lib/axios'

export interface ModuleVideo {
  id: string
  title: string
  order: number
  duration_seconds: number | null
  is_published: boolean
  module_id: string | null
}

export interface CourseModule {
  id: string
  course_id: string
  title: string
  description: string | null
  order: number
  created_at: string
  updated_at: string
  videos: ModuleVideo[]
}

export const modulesApi = {
  list(courseId: string): Promise<CourseModule[]> {
    return api.get(`/modules/courses/${courseId}/modules`).then((r) => r.data)
  },

  create(courseId: string, title: string): Promise<CourseModule> {
    return api.post(`/modules/courses/${courseId}/modules`, { title }).then((r) => r.data)
  },

  update(moduleId: string, data: { title?: string; description?: string; order?: number }): Promise<CourseModule> {
    return api.patch(`/modules/${moduleId}`, data).then((r) => r.data)
  },

  delete(moduleId: string): Promise<void> {
    return api.delete(`/modules/${moduleId}`)
  },
}
