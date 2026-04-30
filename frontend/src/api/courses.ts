import type { Course, CourseFormData } from '@/types'
import { courses as mockCourses } from '@/data/mock'
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

function mapCourse(raw: Record<string, unknown>): Course {
  const price = Number(raw.price)
  const originalPrice = raw.original_price != null ? Number(raw.original_price) : null
  const instructorName = (raw.instructor_name as string) ?? ''
  const levelMap: Record<string, Course['level']> = {
    basico: 'Básico',
    intermedio: 'Intermedio',
    avanzado: 'Avanzado',
  }
  return {
    id: raw.id as string,
    title: raw.title as string,
    subtitle: (raw.subtitle as string | null) ?? '',
    description: (raw.description as string) ?? '',
    instructor: instructorName,
    instructorInitials: toInitials(instructorName),
    instructorTitle: (raw.instructor_title as string | null) ?? '',
    price,
    originalPrice,
    free: price === 0,
    rating: 0,
    reviewCount: 0,
    students: 0,
    duration: '',
    lessons: 0,
    level: levelMap[raw.level as string] ?? null,
    categoryId: raw.category_id as string,
    category: (raw.category_name as string) ?? '',
    featured: false,
    cardColor: getCategoryColor((raw.category_name as string) || (raw.category_id as string) || ''),
    thumbnailUrl: (raw.thumbnail_url as string | null) ?? null,
    isPublished: (raw.is_published as boolean) ?? false,
    modules: [],
  }
}

export const coursesApi = {
  list: async (): Promise<Course[]> => {
    if (MOCK) return Promise.resolve(mockCourses)
    const res = await client.get('/courses', { params: { page_size: 100 } })
    return (res.data.items as Record<string, unknown>[]).map(mapCourse)
  },

  get: async (id: string): Promise<Course> => {
    if (MOCK) {
      const course = mockCourses.find((c) => c.id === id)
      if (!course) throw new Error('Curso no encontrado')
      return Promise.resolve(course)
    }
    const res = await client.get(`/courses/${id}`)
    return mapCourse(res.data)
  },

  create: async (data: CourseFormData): Promise<Course> => {
    const price = Number(data.price) || 0
    const originalPrice = data.originalPrice ? Number(data.originalPrice) : null
    if (MOCK) {
      const newCourse: Course = {
        id: String(Date.now()),
        title: data.title,
        subtitle: data.subtitle ?? '',
        instructor: data.instructor,
        instructorInitials: toInitials(data.instructor),
        instructorTitle: '',
        price,
        originalPrice,
        free: price === 0,
        rating: 0,
        reviewCount: 0,
        students: 0,
        duration: '',
        lessons: 0,
        level: (data.level as Course['level']) || null,
        categoryId: data.categoryId,
        category: '',
        featured: false,
        cardColor: getCategoryColor(data.categoryId),
        thumbnailUrl: null,
        isPublished: false,
        description: data.description ?? '',
        modules: [],
      }
      mockCourses.push(newCourse)
      return Promise.resolve(newCourse)
    }
    const res = await client.post('/courses', {
      title: data.title,
      subtitle: data.subtitle,
      description: data.description,
      category_id: data.categoryId,
      instructor_name: data.instructor,
      price,
      original_price: originalPrice,
      level: data.level?.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') || null,
      is_published: false,
    })
    return mapCourse(res.data)
  },

  update: async (id: string, data: Partial<CourseFormData>): Promise<Course> => {
    const price = data.price !== undefined ? Number(data.price) || 0 : undefined
    const originalPrice =
      data.originalPrice !== undefined
        ? data.originalPrice
          ? Number(data.originalPrice)
          : null
        : undefined
    if (MOCK) {
      const idx = mockCourses.findIndex((c) => c.id === id)
      if (idx === -1) throw new Error('Curso no encontrado')
      mockCourses[idx] = {
        ...mockCourses[idx],
        ...(data.title !== undefined && { title: data.title }),
        ...(data.instructor !== undefined && {
          instructor: data.instructor,
          instructorInitials: toInitials(data.instructor),
        }),
        ...(price !== undefined && { price, free: price === 0 }),
        ...(originalPrice !== undefined && { originalPrice }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.level !== undefined && { level: (data.level as Course['level']) || null }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.subtitle !== undefined && { subtitle: data.subtitle }),
      }
      return Promise.resolve(mockCourses[idx])
    }
    const body: Record<string, unknown> = {}
    if (data.title !== undefined) body.title = data.title
    if (data.subtitle !== undefined) body.subtitle = data.subtitle
    if (data.description !== undefined) body.description = data.description
    if (data.categoryId !== undefined) body.category_id = data.categoryId
    if (data.instructor !== undefined) body.instructor_name = data.instructor
    if (price !== undefined) body.price = price
    if (originalPrice !== undefined) body.original_price = originalPrice
    if (data.level !== undefined)
      body.level = data.level?.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') || null
    const res = await client.patch(`/courses/${id}`, body)
    return mapCourse(res.data)
  },

  delete: async (id: string): Promise<void> => {
    if (MOCK) {
      const idx = mockCourses.findIndex((c) => c.id === id)
      if (idx !== -1) mockCourses.splice(idx, 1)
      return Promise.resolve()
    }
    await client.delete(`/courses/${id}`)
  },

  /** Admin: list ALL courses including unpublished */
  listAdmin: async (): Promise<Course[]> => {
    const res = await client.get('/courses/admin/all', { params: { page_size: 100 } })
    return (res.data.items as Record<string, unknown>[]).map(mapCourse)
  },

  /** Admin: publish or unpublish a course */
  publish: async (id: string, isPublished: boolean): Promise<Course> => {
    const res = await client.patch(`/courses/${id}/publish`, { is_published: isPublished })
    return mapCourse(res.data)
  },

  /** Admin: get course by ID including unpublished */
  getAdmin: async (id: string): Promise<Record<string, unknown>> => {
    const res = await client.get(`/courses/admin/${id}`)
    return res.data as Record<string, unknown>
  },

  /** Admin: update course with raw API field names */
  updateAdmin: async (
    id: string,
    data: {
      title?: string
      subtitle?: string
      description?: string
      instructor_name?: string
      instructor_title?: string
      category_id?: string
      level?: string
      price?: number
      original_price?: number
      featured?: boolean
    },
  ): Promise<Record<string, unknown>> => {
    const res = await client.patch(`/courses/${id}`, data)
    return res.data as Record<string, unknown>
  },
}
