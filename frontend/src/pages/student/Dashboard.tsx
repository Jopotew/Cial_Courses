import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { enrollmentsApi } from '@/api/enrollments'
import { coursesApi } from '@/api/courses'
import { progressApi } from '@/api/progress'
import type { Course } from '@/types'
import { ProgressCard } from '@/components/shared/ProgressCard'
import { CourseCard } from '@/components/shared/CourseCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Button } from '@/components/ui'

export function Dashboard() {
  const { user, isAuthenticated, setEnrolledIds } = useAuthStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'learning' | 'explore'>('learning')

  const { data: enrolledCourses = [] } = useQuery({
    queryKey: ['my-courses'],
    queryFn: enrollmentsApi.myCourses,
    enabled: isAuthenticated,
  })

  const { data: allCourses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: coursesApi.list,
  })

  const progressResults = useQueries({
    queries: enrolledCourses.map((c) => ({
      queryKey: ['progress', c.id],
      queryFn: () => progressApi.getCourse(c.id),
      enabled: isAuthenticated,
    })),
  })

  const courseProgress: Record<string, number> = Object.fromEntries(
    enrolledCourses.map((c, i) => [c.id, progressResults[i]?.data ?? 0]),
  )

  useEffect(() => {
    setEnrolledIds(enrolledCourses.map((c) => c.id))
  }, [enrolledCourses, setEnrolledIds])

  const enrolledIds = new Set(enrolledCourses.map((c) => c.id))
  const notEnrolled = allCourses.filter((c) => !enrolledIds.has(c.id))
  const completedCount = Object.values(courseProgress).filter((p) => p === 100).length

  const highestProgressCourse = enrolledCourses.reduce<Course | null>((best, c) => {
    const p = courseProgress[c.id] ?? 0
    if (!best) return c
    return p > (courseProgress[best.id] ?? 0) ? c : best
  }, null)

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <div
        className="px-6"
        style={{
          background: 'linear-gradient(135deg, #1e0a3c, #3b1a7a)',
          padding: 'clamp(32px,5vw,52px) 24px',
        }}
      >
        <div className="max-w-[1100px] mx-auto">
          <div className="flex items-center gap-[18px] mb-7">
            <div className="w-[60px] h-[60px] rounded-full bg-avatar-grad flex items-center justify-center text-[22px] font-extrabold text-white flex-shrink-0">
              {user?.initials}
            </div>
            <div>
              <p className="text-[13px] text-white/60 mb-1">Bienvenida de vuelta</p>
              <p
                className="font-extrabold text-white tracking-tight"
                style={{ fontSize: 'clamp(20px,3vw,28px)' }}
              >
                {user?.name}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Cursos inscriptos', value: enrolledCourses.length },
              { label: 'Cursos completados', value: completedCount },
              { label: 'Horas aprendidas', value: '—' },
              { label: 'Certificados', value: 0 },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-[14px] px-5 py-4 backdrop-blur-[10px] border border-white/[.12]"
                style={{ background: 'rgba(255,255,255,.08)' }}
              >
                <p className="text-[28px] font-black text-primary-muted">{s.value}</p>
                <p className="text-xs text-white/55 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[#f0ebfd]">
        <div className="max-w-[1100px] mx-auto px-6 flex gap-1">
          {(['learning', 'explore'] as const).map((id) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="px-5 py-4 border-none bg-transparent font-sans text-sm cursor-pointer transition-all"
              style={{
                borderBottom: activeTab === id ? '2px solid #7c3aed' : '2px solid transparent',
                color: activeTab === id ? '#7c3aed' : '#64748b',
                fontWeight: activeTab === id ? 700 : 500,
              }}
            >
              {id === 'learning' ? 'Mi aprendizaje' : 'Explorar más'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-6 py-8">
        {activeTab === 'learning' && (
          <div>
            {enrolledCourses.length === 0 ? (
              <EmptyState />
            ) : (
              <>
                <div className="mb-10">
                  <h2 className="text-[22px] font-extrabold text-ink mb-5 tracking-tight">
                    Continuar aprendiendo
                  </h2>
                  <div className="flex flex-col gap-4">
                    {enrolledCourses.map((course) => (
                      <ProgressCard
                        key={course.id}
                        course={course}
                        progress={courseProgress[course.id] ?? 0}
                      />
                    ))}
                  </div>
                </div>

                {highestProgressCourse && (
                  <div
                    className="rounded-[20px] px-7 py-6 flex items-center gap-6 flex-wrap"
                    style={{ background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)' }}
                  >
                    <div className="w-14 h-14 rounded-full bg-avatar-grad flex items-center justify-center flex-shrink-0">
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <path d="M14 4l2.5 5.2 5.7.8-4.1 4 1 5.7L14 17l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" fill="#fff" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-base font-extrabold text-ink mb-1">
                        ¡Estás progresando muy bien!
                      </p>
                      <p className="text-sm text-slate-500">
                        Completaste el {courseProgress[highestProgressCourse.id] ?? 0}% de{' '}
                        {highestProgressCourse.title}. ¡Terminalo y obtené tu certificado!
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/courses/${highestProgressCourse.id}`)}
                    >
                      Continuar curso
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'explore' && (
          <div>
            <h2 className="text-[22px] font-extrabold text-ink mb-2 tracking-tight">
              Cursos recomendados para vos
            </h2>
            <p className="text-sm text-slate-500 mb-6">Basados en tus cursos actuales</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
              {notEnrolled.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
