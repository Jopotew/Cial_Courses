import { create } from 'zustand'
import type { AuthUser } from '@/types'
import { initialEnrolledIds, initialProgress } from '@/data/mock'

interface AuthStore {
  user: AuthUser | null
  isAuthenticated: boolean
  enrolledCourseIds: number[]
  courseProgress: Record<number, number>
  login: (user: AuthUser) => void
  logout: () => void
  enroll: (courseId: number) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  enrolledCourseIds: [...initialEnrolledIds],
  courseProgress: { ...initialProgress },

  login: (user) => set({ user, isAuthenticated: true }),

  logout: () => {
    localStorage.removeItem('access_token')
    set({ user: null, isAuthenticated: false })
  },

  enroll: (courseId) =>
    set((state) => ({
      enrolledCourseIds: state.enrolledCourseIds.includes(courseId)
        ? state.enrolledCourseIds
        : [...state.enrolledCourseIds, courseId],
    })),
}))