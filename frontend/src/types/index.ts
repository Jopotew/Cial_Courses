export interface Category {
  id: string             // UUID
  name: string
  description?: string | null
  coursesCount: number   // courses_count del backend
  // Solo frontend — paleta visual asignada en el mapper
  color: string
  bg: string
}

export interface CourseModule {
  title: string
  lessons: number
  duration: string
}

export interface Course {
  id: string             // UUID
  title: string
  subtitle: string | null
  description: string
  categoryId: string     // UUID
  category: string | null
  instructor: string     // instructor_name
  instructorInitials: string  // calculado en frontend
  instructorTitle: string | null
  price: number
  originalPrice: number | null
  level: 'Básico' | 'Intermedio' | 'Avanzado' | null
  thumbnailUrl: string | null
  isPublished: boolean
  // Calculados en frontend
  free: boolean          // price === 0
  cardColor: string      // paleta asignada por categoría
  // Diferidos — sin sistema de reviews todavía
  rating: number
  reviewCount: number
  students: number
  // Diferidos — se reemplazarán por videos del backend
  duration: string
  lessons: number
  modules: CourseModule[]
  featured: boolean
}

export interface AuthUser {
  id: string             // UUID
  name: string           // full_name
  email: string
  username: string
  initials: string       // calculado en frontend
  isAdmin: boolean       // role === 1
}

export interface SaleRecord {
  id: string             // UUID
  student: string        // user_name o user_email
  course: string         // course_title
  amount: number
  date: string           // created_at formateado
  status: 'aprobado' | 'pendiente' | 'rechazado'
}

export interface UserRecord {
  id: string             // UUID
  name: string           // full_name
  email: string
  initials: string       // calculado en frontend
  enrolled: number       // 0 por ahora, sin conteo en backend
  joined: string         // created_at formateado
  active: boolean        // is_active
}

// ── Login flow ────────────────────────────────────────────────────────────────

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
  userId: string         // UUID — requerido para POST /auth/verify-2fa
}
export type LoginFlow = LoginStepEmail | LoginStepPassword | LoginStepVerify

// ── Admin forms ───────────────────────────────────────────────────────────────

export interface CourseFormData {
  title: string
  subtitle: string
  instructor: string
  instructorTitle: string
  category: string
  categoryId: string     // UUID
  level: 'Básico' | 'Intermedio' | 'Avanzado' | ''
  price: string
  originalPrice: string
  description: string
}
