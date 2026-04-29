import { client as api } from '@/lib/axios'

export interface CourseFile {
  id: string
  course_id: string
  name: string
  file_url: string
  file_type: string
  file_size_bytes: number | null
  order: number
  created_at: string
}

export const courseFilesApi = {
  list(courseId: string): Promise<CourseFile[]> {
    return api.get(`/course-files/courses/${courseId}/files`).then((r) => r.data)
  },

  upload(courseId: string, file: File, onProgress?: (pct: number) => void): Promise<CourseFile> {
    const fd = new FormData()
    fd.append('file', file)
    return api
      .post(`/course-files/courses/${courseId}/files`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onProgress
          ? (e) => {
              if (e.total) onProgress(Math.round((e.loaded * 100) / e.total))
            }
          : undefined,
      })
      .then((r) => r.data)
  },

  delete(fileId: string): Promise<void> {
    return api.delete(`/course-files/${fileId}`)
  },
}
