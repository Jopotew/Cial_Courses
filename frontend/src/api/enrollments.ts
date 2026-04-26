import type { Course } from '@/types'
import { courses as mockCourses, initialEnrolledIds, initialProgress } from '@/data/mock'
import { client } from '@/lib/axios'

const MOCK = import.meta.env.VITE_USE_MOCK === 'true'

const PALETTE = ['#7c3aed', '#0284c7', '#db2777', '#059669', '#b45309', '#dc2626']

function getCategoryColor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0xffff
  return PALETTE[hash % PALETTE.length]
}

function toInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase()
}

function mapEnrollment(raw: Record<string, unknown>): Course {
  const instructorName = (raw.instructor_name as string) ?? ''
  const price = Number(raw.price ?? 0)
  const levelMap: Record<string, Course['level']> = {
    basico: 'Básico',
    intermedio: 'Intermedio',
    avanzado: 'Avanzado',
  }
  return {
    id: (raw.course_id ?? raw.id) as string,
    title: raw.title as string,
    subtitle: (raw.subtitle as string | null) ?? null,
    description: (raw.description as string) ?? '',
    instructor: instructorName,
    instructorInitials: toInitials(instructorName || 'X'),
    instructorTitle: (raw.instructor_title as string | null) ?? null,
    price,
    originalPrice: raw.original_price != null ? Number(raw.original_price) : null,
    free: price === 0,
    rating: 0,
    reviewCount: 0,
    students: 0,
    duration: '',
    lessons: 0,
    level: levelMap[raw.level as string] ?? null,
    categoryId: (raw.category_id as string) ?? '',
    category: (raw.category_name as string) ?? '',
    featured: false,
    cardColor: getCategoryColor((raw.category_name as string) || (raw.category_id as string) || ''),
    thumbnailUrl: (raw.thumbnail_url as string | null) ?? null,
    isPublished: true,
    modules: [],
  }
}

export const enrollmentsApi = {
  myCourses: async (): Promise<Course[]> => {
    if (MOCK) return Promise.resolve(mockCourses.filter((c) => initialEnrolledIds.includes(c.id)))
    const res = await client.get('/enrollments/my-courses')
    return (res.data as Record<string, unknown>[]).map(mapEnrollment)
  },

  enroll: async (courseId: string): Promise<void> => {
    if (MOCK) {
      if (!initialEnrolledIds.includes(courseId)) initialEnrolledIds.push(courseId)
      initialProgress[courseId] = 0
      return Promise.resolve()
    }
    await client.post('/enrollments/self', { course_id: courseId })
  },
}
