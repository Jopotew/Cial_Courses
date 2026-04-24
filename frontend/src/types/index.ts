export interface Category {
  id: number
  name: string
  count: number
  color: string
  bg: string
}

export interface CourseModule {
  title: string
  lessons: number
  duration: string
}

export interface Course {
  id: number
  title: string
  subtitle: string
  instructor: string
  instructorInitials: string
  instructorTitle: string
  price: number
  originalPrice: number
  rating: number
  reviewCount: number
  students: number
  duration: string
  lessons: number
  level: 'Básico' | 'Intermedio' | 'Avanzado'
  categoryId: number
  category: string
  featured: boolean
  free: boolean
  cardColor: string
  description: string
  modules: CourseModule[]
}

export interface MockUser {
  name: string
  email: string
  initials: string
  isAdmin: boolean
}

export interface SaleRecord {
  id: number
  student: string
  course: string
  amount: number
  date: string
  status: 'aprobado' | 'pendiente' | 'rechazado'
}

export interface UserRecord {
  id: number
  name: string
  email: string
  initials: string
  enrolled: number
  joined: string
  active: boolean
}

export interface AuthUser {
  name: string
  email: string
  initials: string
  isAdmin: boolean
}

export interface LoginStepEmail {
  step: 'email'
}
export interface LoginStepPassword {
  step: 'password'
  email: string
}
export interface LoginStepVerify {
  step: 'verify'
  email: string
}
export type LoginFlow = LoginStepEmail | LoginStepPassword | LoginStepVerify

export interface CourseFormData {
  title: string
  instructor: string
  category: string
  categoryId: number
  level: 'Básico' | 'Intermedio' | 'Avanzado'
  price: string
  originalPrice: string
  description: string
}