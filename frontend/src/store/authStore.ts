import { create } from 'zustand'
import type { AuthUser } from '@/types'
import { initialEnrolledIds, initialProgress } from '@/data/mock'

const MOCK = import.meta.env.VITE_USE_MOCK === 'true'

interface AuthStore {
  user: AuthUser | null
  isAuthenticated: boolean
  enrolledCourseIds: string[]
  courseProgress: Record<string, number>
  login: (user: AuthUser) => void
  logout: () => void
  enroll: (courseId: string) => void
  setEnrolledIds: (ids: string[]) => void
  setProgress: (progress: Record<string, number>) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  enrolledCourseIds: MOCK ? [...initialEnrolledIds] : [],
  courseProgress: MOCK ? { ...initialProgress } : {},

  login: (user) => set({ user, isAuthenticated: true }),

  logout: () => {
    localStorage.removeItem('access_token')
    set({ user: null, isAuthenticated: false, enrolledCourseIds: [], courseProgress: {} })
  },

  enroll: (courseId) =>
    set((state) => ({
      enrolledCourseIds: state.enrolledCourseIds.includes(courseId)
        ? state.enrolledCourseIds
        : [...state.enrolledCourseIds, courseId],
    })),

  setEnrolledIds: (ids) => set({ enrolledCourseIds: ids }),

  setProgress: (progress) => set({ courseProgress: progress }),
}))
