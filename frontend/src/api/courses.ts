import type { Course } from '@/types'
import { courses } from '@/data/mock'
// import { client } from '@/lib/axios'

const MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const coursesApi = {
  list: async (): Promise<Course[]> => {
    if (MOCK) return Promise.resolve(courses)
    // TODO: return client.get('/courses').then((r) => r.data)
    return courses
  },

  get: async (id: number): Promise<Course> => {
    if (MOCK) {
      const course = courses.find((c) => c.id === id)
      if (!course) throw new Error('Curso no encontrado')
      return Promise.resolve(course)
    }
    // TODO: return client.get(`/courses/${id}`).then((r) => r.data)
    const course = courses.find((c) => c.id === id)
    if (!course) throw new Error('Curso no encontrado')
    return course
  },

  create: async (data: Partial<Course>): Promise<Course> => {
    if (MOCK) {
      const newCourse: Course = {
        ...data,
        id: Date.now(),
        instructorInitials: (data.instructor ?? '')
          .split(' ')
          .map((w) => w[0])
          .slice(0, 2)
          .join(''),
        cardColor: '#7c3aed',
        featured: false,
        free: (data.price ?? 0) === 0,
        modules: [],
        rating: 0,
        reviewCount: 0,
        students: 0,
        subtitle: data.subtitle ?? '',
        instructorTitle: '',
        originalPrice: data.originalPrice ?? 0,
        duration: '',
        lessons: 0,
        description: data.description ?? '',
        level: data.level ?? 'Básico',
        categoryId: data.categoryId ?? 1,
        category: data.category ?? '',
        title: data.title ?? '',
        instructor: data.instructor ?? '',
        price: data.price ?? 0,
      } as Course
      courses.push(newCourse)
      return Promise.resolve(newCourse)
    }
    // TODO: return client.post('/courses', data).then((r) => r.data)
    throw new Error('Not implemented')
  },

  update: async (id: number, data: Partial<Course>): Promise<Course> => {
    if (MOCK) {
      const idx = courses.findIndex((c) => c.id === id)
      if (idx === -1) throw new Error('Curso no encontrado')
      courses[idx] = { ...courses[idx], ...data }
      return Promise.resolve(courses[idx])
    }
    // TODO: return client.put(`/courses/${id}`, data).then((r) => r.data)
    throw new Error('Not implemented')
  },

  delete: async (id: number): Promise<void> => {
    if (MOCK) {
      const idx = courses.findIndex((c) => c.id === id)
      if (idx !== -1) courses.splice(idx, 1)
      return Promise.resolve()
    }
    // TODO: await client.delete(`/courses/${id}`)
  },
}